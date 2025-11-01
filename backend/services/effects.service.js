/**
 * Servicio de efectos visuales con validación robusta de filtros FFmpeg
 * Implementa detección de capacidades y degradación con gracia
 */

const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const logger = require('../utils/logger');
const { getCapabilities, hasFilters } = require('./ffmpeg-capabilities');
const { effects: effectsRegistry, validateEffects } = require('./effectsRegistry');

class EffectsService {
  constructor() {
    this.effectsDir = '/srv/storyclip/effects';
    this.overlaysDir = '/srv/storyclip/overlays';
    this.capabilitiesCache = null;
  }

  /**
   * Obtener capacidades de FFmpeg con cache
   */
  getFFmpegCapabilities() {
    if (!this.capabilitiesCache) {
      this.capabilitiesCache = getCapabilities();
    }
    return this.capabilitiesCache;
  }

  /**
   * Validar y construir filtros FFmpeg de manera robusta
   */
  buildRobustFilters(effects = {}, options = {}) {
    const caps = this.getFFmpegCapabilities();
    const requestedEffects = [];
    const filterFragments = [];
    const warnings = [];
    const missing = [];

    // Identificar efectos solicitados
    if (effects.flip && effects.flip.enabled) {
      const direction = effects.flip.direction || 'horizontal';
      requestedEffects.push(direction === 'horizontal' ? 'flipHorizontal' : 'flipVertical');
    }

    if (effects.zoompan && effects.zoompan.enabled) {
      requestedEffects.push('zoompan');
    }

    if (effects.color && effects.color.enabled) {
      requestedEffects.push('colorAdjust');
    }

    if (effects.blur && effects.blur.enabled) {
      requestedEffects.push('blur');
    }

    if (effects.stabilization && effects.stabilization.enabled) {
      requestedEffects.push('stabilization');
    }

    // Validar efectos contra capacidades
    const validation = validateEffects(requestedEffects, caps.filters);

    // Construir filtros solo para efectos disponibles
    for (const effectKey of validation.available) {
      try {
        const effect = effectsRegistry[effectKey];
        const params = effects[effectKey.toLowerCase()] || effects[effectKey] || {};
        
        if (effectKey === 'flipHorizontal' || effectKey === 'flipVertical') {
          filterFragments.push(effect.graph());
        } else if (effectKey === 'zoompan') {
          filterFragments.push(effect.graph(effects.zoompan));
        } else if (effectKey === 'colorAdjust') {
          filterFragments.push(effect.graph(effects.color));
        } else if (effectKey === 'blur') {
          filterFragments.push(effect.graph(effects.blur));
        } else if (effectKey === 'stabilization') {
          const graphs = effect.graph(effects.stabilization);
          filterFragments.push(graphs.detect);
          filterFragments.push(graphs.transform);
        }
      } catch (error) {
        logger.warn(`Error building filter for ${effectKey}:`, error.message);
        warnings.push(`Failed to build ${effectKey}: ${error.message}`);
      }
    }

    // Registrar efectos que no se pudieron aplicar
    for (const missingEffect of validation.missing) {
      const msg = `Effect '${missingEffect.effect}' requires filters: ${missingEffect.filters.join(', ')}`;
      logger.warn(msg);
      warnings.push(msg);
      missing.push(missingEffect);
    }

    // Añadir filtros de resolución si se especifican
    if (options.aspectRatio && options.resolution) {
      const hasScale = caps.filters.includes('scale');
      const hasPad = caps.filters.includes('pad');
      
      if (hasScale && hasPad) {
        const [width, height] = options.resolution.split('x').map(Number);
        filterFragments.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
        filterFragments.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
      } else {
        warnings.push('Scale or pad filters not available for aspect ratio adjustment');
      }
    }

    return {
      filterComplex: filterFragments.join(','),
      applied: validation.available,
      missing: validation.missing,
      warnings,
      partialApplied: validation.missing.length > 0
    };
  }

  /**
   * Aplicar efectos a un video con validación robusta
   */
  async applyEffects(inputPath, outputPath, effects = {}, options = {}) {
    try {
      logger.info('Applying effects with validation:', { effects, options });

      // Construir filtros de manera robusta
      const filterResult = this.buildRobustFilters(effects, options);

      if (filterResult.warnings.length > 0) {
        logger.warn('Filter warnings:', filterResult.warnings);
      }

      // Si no hay filtros disponibles, usar procesamiento básico
      if (!filterResult.filterComplex || filterResult.filterComplex.length === 0) {
        logger.info('No filters to apply, using basic processing');
        return await this.applyBasicProcessing(inputPath, outputPath, options);
      }

      // Aplicar efectos con FFmpeg
      const result = await this.applyFFmpegEffects(inputPath, outputPath, filterResult.filterComplex, options);

      return {
        ...result,
        effectsApplied: filterResult.applied,
        effectsMissing: filterResult.missing,
        partialApplied: filterResult.partialApplied,
        warnings: filterResult.warnings
      };

    } catch (error) {
      logger.error('Error applying effects:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * Mejorar mensajes de error de FFmpeg
   */
  enhanceError(error) {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('Filter not found') || errorMessage.includes('No such filter')) {
      const filterMatch = errorMessage.match(/filter[:\s]+['"]?(\w+)['"]?/i);
      const missingFilter = filterMatch ? filterMatch[1] : 'unknown';
      
      return {
        code: 'FFMPEG_FILTER_MISSING',
        message: `FFmpeg filter '${missingFilter}' is not available in this build`,
        missing: [missingFilter],
        hint: 'This filter is not compiled in your FFmpeg version. The effect was skipped.',
        originalError: errorMessage
      };
    }

    if (errorMessage.includes('exited with code')) {
      const codeMatch = errorMessage.match(/code (\d+)/);
      const exitCode = codeMatch ? parseInt(codeMatch[1]) : 'unknown';
      
      return {
        code: 'FFMPEG_RUNTIME_ERROR',
        message: 'FFmpeg encountered an error during processing',
        exitCode,
        hint: 'Check FFmpeg logs for details',
        originalError: errorMessage
      };
    }

    return error;
  }

  /**
   * Aplicar efectos usando FFmpeg con el filtro complejo construido
   */
  async applyFFmpegEffects(inputPath, outputPath, filterComplex, options = {}) {
    const {
      startTime = 0,
      duration,
      fps = 30,
      videoBitrate = '2000k',
      audioBitrate = '128k',
      preset = 'fast',
      crf = 23,
      format = 'mp4',
      videoCodec = 'libx264',
      audioCodec = 'aac'
    } = options;

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      // Guardar comando para debug
      let fullCommand = '';

      if (startTime > 0) {
        command.seekInput(startTime);
      }

      if (duration) {
        command.duration(duration);
      }

      // Aplicar filtro complejo
      if (filterComplex) {
        command.complexFilter(filterComplex);
      }

      command
        .fps(fps)
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .videoBitrate(videoBitrate)
        .audioBitrate(audioBitrate)
        .format(format)
        .outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (commandLine) => {
          fullCommand = commandLine;
          logger.debug('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug(`Processing: ${Math.round(progress.percent)}% done`);
          }
        })
        .on('end', () => {
          logger.info(`Effects applied successfully: ${outputPath}`);
          resolve({ success: true, output: outputPath, command: fullCommand });
        })
        .on('error', (err, stdout, stderr) => {
          logger.error('FFmpeg error:', err.message);
          logger.error('FFmpeg stderr:', stderr);
          
          const enhancedError = this.enhanceError(err);
          enhancedError.command = fullCommand;
          enhancedError.stderr = stderr;
          
          reject(enhancedError);
        });

      command.save(outputPath);
    });
  }

  /**
   * Procesamiento básico sin efectos
   */
  async applyBasicProcessing(inputPath, outputPath, options = {}) {
    const {
      startTime = 0,
      duration,
      resolution = '720x1280',
      fps = 30,
      videoBitrate = '2000k',
      audioBitrate = '128k',
      preset = 'fast',
      crf = 23
    } = options;

    const [width, height] = resolution.split('x').map(Number);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      if (startTime > 0) {
        command.seekInput(startTime);
      }

      if (duration) {
        command.duration(duration);
      }

      command
        .size(`${width}x${height}`)
        .fps(fps)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(videoBitrate)
        .audioBitrate(audioBitrate)
        .outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('end', () => {
          logger.info(`Basic processing completed: ${outputPath}`);
          resolve({ success: true, output: outputPath });
        })
        .on('error', (err) => {
          logger.error('FFmpeg error:', err.message);
          reject(err);
        });

      command.save(outputPath);
    });
  }

  /**
   * Aplicar overlays con validación robusta
   */
  async applyOverlays(inputPath, outputPath, overlays = {}, options = {}) {
    try {
      const caps = this.getFFmpegCapabilities();
      
      // Validar que overlay esté disponible
      const overlayValidation = hasFilters(['overlay', 'scale']);
      if (!overlayValidation.available) {
        logger.warn('Overlay filters not available:', overlayValidation.missing);
        return await this.applyBasicProcessing(inputPath, outputPath, options);
      }

      // Si watermark está habilitado
      if (overlays.watermark && overlays.watermark.enabled) {
        const watermarkUrl = overlays.watermark.imageUrl || overlays.watermark.url;
        
        if (!watermarkUrl || watermarkUrl === 'undefined' || watermarkUrl === 'null') {
          logger.warn('Watermark enabled but no valid image URL provided, skipping watermark');
          return await this.applyBasicProcessing(inputPath, outputPath, options);
        }

        try {
          const watermarkPath = await this.downloadOverlay(watermarkUrl);
          return await this.applyWatermarkOverlay(inputPath, outputPath, watermarkPath, overlays.watermark, options);
        } catch (error) {
          logger.error('Error downloading overlay:', error);
          // Continuar sin overlay si falla la descarga
          return await this.applyBasicProcessing(inputPath, outputPath, options);
        }
      }

      // Sin overlays válidos, procesamiento básico
      return await this.applyBasicProcessing(inputPath, outputPath, options);

    } catch (error) {
      logger.error('Error applying overlays:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * Descargar overlay desde URL
   */
  async downloadOverlay(url) {
    if (!url || url === 'undefined' || url === 'null') {
      throw new Error('Invalid overlay URL');
    }

    const overlayId = Buffer.from(url).toString('base64').substring(0, 16);
    const overlayPath = path.join(this.overlaysDir, `${overlayId}.png`);

    // Si ya está en cache, usar ese
    if (await fs.pathExists(overlayPath)) {
      return overlayPath;
    }

    // Descargar el overlay
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    await fs.ensureDir(this.overlaysDir);
    await fs.writeFile(overlayPath, response.data);

    return overlayPath;
  }

  /**
   * Aplicar overlay de watermark
   */
  async applyWatermarkOverlay(inputPath, outputPath, watermarkPath, watermarkConfig = {}, options = {}) {
    const {
      position = 'bottom-right',
      opacity = 0.7,
      scale = 0.2
    } = watermarkConfig;

    const {
      startTime = 0,
      duration,
      fps = 30,
      videoBitrate = '2000k',
      audioBitrate = '128k',
      preset = 'fast',
      crf = 23
    } = options;

    // Calcular posición
    let overlayX, overlayY;
    switch (position) {
      case 'top-left':
        overlayX = '10';
        overlayY = '10';
        break;
      case 'top-right':
        overlayX = 'W-w-10';
        overlayY = '10';
        break;
      case 'bottom-left':
        overlayX = '10';
        overlayY = 'H-h-10';
        break;
      case 'bottom-right':
      default:
        overlayX = 'W-w-10';
        overlayY = 'H-h-10';
        break;
    }

    return new Promise((resolve, reject) => {
      let fullCommand = '';
      
      const command = ffmpeg(inputPath)
        .input(watermarkPath);

      if (startTime > 0) {
        command.seekInput(startTime);
      }

      if (duration) {
        command.duration(duration);
      }

      command
        .complexFilter([
          `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
          `[0:v][wm]overlay=${overlayX}:${overlayY}[v]`
        ], 'v')
        .fps(fps)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(videoBitrate)
        .audioBitrate(audioBitrate)
        .outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (commandLine) => {
          fullCommand = commandLine;
          logger.debug('FFmpeg overlay command:', commandLine);
        })
        .on('end', () => {
          logger.info(`Overlay applied successfully: ${outputPath}`);
          resolve({ success: true, output: outputPath, command: fullCommand });
        })
        .on('error', (err, stdout, stderr) => {
          logger.error('FFmpeg overlay error:', err.message);
          logger.error('FFmpeg stderr:', stderr);
          
          const enhancedError = this.enhanceError(err);
          enhancedError.command = fullCommand;
          enhancedError.stderr = stderr;
          
          reject(enhancedError);
        });

      command.save(outputPath);
    });
  }

  /**
   * Obtener configuración de efectos desde la base de datos
   */
  async getEffectsFromDatabase(uploadId) {
    // Placeholder - implementar según tu estructura de DB
    return { effects: {}, overlays: {} };
  }
}

module.exports = new EffectsService();
