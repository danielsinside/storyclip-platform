const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const logger = require('./logger');

/**
 * HOTFIX: Normalizar efectos por-clip vs globales
 * Prioriza: por-clip > global > metadata.visual
 */
function normalizeEffects(clip, body) {
  // 1) prioriza por-clip, si no, global, si no, metadata.visual
  const g = body.filters || body.effects || body.metadata?.visual || {};
  const c = clip.effects || clip.filters || {};

  // Preservar ffmpegCommand del frontend si existe
  const colorEffect = c.color ?? g.color;

  // CRITICAL: Si el clip tiene un indicador específico, NO usar el global
  // Esto evita indicadores duplicados
  const clipIndicator = c.indicator ?? c.clipIndicator;
  const globalIndicator = g.indicator ?? g.clipIndicator;

  return {
    mirrorHorizontal: c.mirrorHorizontal ?? c.horizontalFlip ?? g.mirrorHorizontal ?? g.horizontalFlip ?? false,
    color: colorEffect,  // Mantener objeto completo con ffmpegCommand
    indicator: clipIndicator ?? globalIndicator // Solo usar global si no hay indicador del clip
  };
}

/**
 * HOTFIX: Construir filtros visuales (mirror, color, indicator)
 * SIEMPRE incluye escala/crop 9:16 al inicio
 */
function buildVisualVF(e, options = {}) {
  const vf = [];
  const clipNumber = options.clipNumber || null;
  
  // CRÍTICO: Siempre empezar con escala/crop 9:16
  const width = options.width || 1080;
  const height = options.height || 1920;
  const aspectRatio = `${width}:${height}`;
  
  // Escala y crop para formato vertical 9:16
  // FIX: Cambiado de 'crop' a 'decrease' para compatibilidad con FFmpeg 7.x
  // force_original_aspect_ratio=decrease hace que el video se ajuste dentro del tamaño objetivo
  // luego crop=WIDTH:HEIGHT centra y recorta al tamaño exacto
  vf.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
  vf.push(`crop=${width}:${height}`);
  
  // Aplicar efectos visuales DESPUÉS del crop
  if (e.mirrorHorizontal) vf.push('hflip');

  if (e.color) {
    // PRIORIDAD 1: Usar ffmpegCommand del frontend (ya calculado)
    if (e.color.ffmpegCommand) {
      logger.info(`[FFMPEG] Using frontend ffmpegCommand: ${e.color.ffmpegCommand}`);
      vf.push(e.color.ffmpegCommand);
    } else {
      // FALLBACK: Calcular básico si no hay ffmpegCommand
      const b = (e.color.brightness ?? 0);
      const co = (e.color.contrast ?? 1);
      const s = (e.color.saturation ?? 1);
      const fallbackCmd = `eq=brightness=${b}:contrast=${co}:saturation=${s}`;
      logger.warn(`[FFMPEG] No ffmpegCommand found, using fallback: ${fallbackCmd}`);
      vf.push(fallbackCmd);
    }
  }

  // Aplicar overlays animados si están configurados
  if (e.overlay || options.overlays) {
    const overlay = e.overlay || options.overlays;
    const overlayType = overlay.type || 'none';
    const intensity = (overlay.intensity || 50) / 100; // Normalize 0-1

    logger.info(`[FFMPEG] Applying overlay: ${overlayType}, intensity: ${intensity}`);

    switch(overlayType) {
      case 'vignette':
        // Oscurecimiento en los bordes
        // Formula: vignette = 'PI/2 - cos(min((P(X, Y) / P(W,H)), 1)*PI/2)' donde P es distancia del centro
        const vignetteIntensity = 0.5 + (intensity * 0.5); // 0.5-1.0
        vf.push(`vignette=angle=PI/2.5:mode=forward:eval=frame:dither=0:aspect=16/9`);
        logger.info(`[FFMPEG] Applied vignette overlay with intensity ${vignetteIntensity}`);
        break;

      case 'film-grain':
      case 'grain':
        // Añadir ruido/grano de película
        const grainStrength = Math.floor(10 + (intensity * 40)); // 10-50
        vf.push(`noise=alls=${grainStrength}:allf=t+u`);
        logger.info(`[FFMPEG] Applied film grain with strength ${grainStrength}`);
        break;

      case 'vhs':
        // Efecto VHS con noise + color shift + scanlines simuladas
        const vhsNoise = Math.floor(15 + (intensity * 25)); // 15-40
        vf.push(`noise=alls=${vhsNoise}:allf=t+u`);
        vf.push(`eq=contrast=1.1:saturation=0.9:gamma=1.1`);
        logger.info(`[FFMPEG] Applied VHS effect with noise ${vhsNoise}`);
        break;

      case 'chromatic':
      case 'chromatic-aberration':
        // Separación de canales RGB para efecto cromático
        // Split RGB, desplazar canales, y recombinar
        const shift = Math.floor(2 + (intensity * 6)); // 2-8 pixels
        // Nota: Este efecto es complejo y requiere split/overlay, lo simplificamos con color shift
        vf.push(`colorchannelmixer=rr=1.0:rg=0:rb=0:ar=0:` +
                `gr=${0.02 * intensity}:gg=1.0:gb=${0.02 * intensity}:ag=0:` +
                `br=0:bg=${0.02 * intensity}:bb=1.0:ab=0`);
        logger.info(`[FFMPEG] Applied chromatic aberration with shift ${shift}`);
        break;

      case 'light-leak':
        // Simulación de fuga de luz con gradient overlay
        // Usar colorkey o curves para simular luz
        vf.push(`curves=all='0/0 0.3/${0.1 + intensity * 0.3} 0.7/${0.7 + intensity * 0.2} 1/1'`);
        logger.info(`[FFMPEG] Applied light leak effect`);
        break;

      case 'bokeh':
        // Efecto bokeh usando blur gaussiano selectivo
        const blurAmount = 5 + (intensity * 15); // 5-20
        vf.push(`gblur=sigma=${blurAmount}:steps=2`);
        logger.info(`[FFMPEG] Applied bokeh blur with sigma ${blurAmount}`);
        break;

      case 'glitch':
        // Efecto glitch con distorsión RGB, noise y color shift
        const glitchNoise = Math.floor(20 + (intensity * 30)); // 20-50
        const colorShift = 0.05 + (intensity * 0.15); // 0.05-0.20
        // Añadir noise fuerte
        vf.push(`noise=alls=${glitchNoise}:allf=t+u`);
        // Distorsión de canales RGB para efecto glitch
        vf.push(`colorchannelmixer=rr=${1 + colorShift}:rg=${colorShift}:rb=0:` +
                `gr=${colorShift}:gg=${1 - colorShift}:gb=${colorShift}:` +
                `br=0:bg=${colorShift}:bb=${1 + colorShift}`);
        // Saturación y contraste alterados
        vf.push(`eq=saturation=${1.2 + intensity * 0.3}:contrast=${1.1 + intensity * 0.2}`);
        logger.info(`[FFMPEG] Applied glitch effect with noise ${glitchNoise} and color shift ${colorShift.toFixed(2)}`);
        break;

      case 'particles':
        // Efecto partículas usando noise con motion blur
        const particleNoise = Math.floor(15 + (intensity * 20)); // 15-35
        vf.push(`noise=alls=${particleNoise}:allf=t`);
        // Agregar blur para simular partículas suaves
        vf.push(`gblur=sigma=${2 + intensity * 3}:steps=1`);
        // Aumentar brillo para crear efecto luminoso
        vf.push(`eq=brightness=${0.05 * intensity}:contrast=${1 + 0.15 * intensity}`);
        logger.info(`[FFMPEG] Applied particles effect with noise ${particleNoise}`);
        break;

      case 'sparkles':
        // Efecto destellos con noise selectivo y brillo alto
        const sparkleNoise = Math.floor(25 + (intensity * 25)); // 25-50
        vf.push(`noise=alls=${sparkleNoise}:allf=t+u`);
        // Curves para crear picos de brillo (simula destellos)
        vf.push(`curves=all='0/0 0.7/${0.7 - intensity * 0.2} 0.85/${0.85 + intensity * 0.1} 1/1'`);
        // Aumentar brillo y saturación
        vf.push(`eq=brightness=${0.08 * intensity}:saturation=${1.1 + intensity * 0.4}`);
        logger.info(`[FFMPEG] Applied sparkles effect with noise ${sparkleNoise}`);
        break;

      case 'rain':
        // Efecto lluvia con líneas verticales usando noise direccional
        const rainNoise = Math.floor(10 + (intensity * 20)); // 10-30
        // Noise con motion blur vertical para simular gotas
        vf.push(`noise=alls=${rainNoise}:allf=t`);
        // Agregar motion blur vertical para líneas de lluvia
        vf.push(`avgblur=sizeX=1:sizeY=${Math.floor(5 + intensity * 10)}`);
        // Reducir brillo para efecto de lluvia oscura
        vf.push(`eq=brightness=${-0.05 * intensity}:contrast=${1 + 0.1 * intensity}`);
        logger.info(`[FFMPEG] Applied rain effect with vertical blur`);
        break;

      case 'matrix':
        // Efecto Matrix con noise verde y brillo
        const matrixNoise = Math.floor(20 + (intensity * 25)); // 20-45
        vf.push(`noise=alls=${matrixNoise}:allf=t`);
        // Colorizar a verde (estilo Matrix)
        vf.push(`colorchannelmixer=rr=0:rg=0:rb=0:` +
                `gr=${0.3 + intensity * 0.4}:gg=${0.8 + intensity * 0.2}:gb=0:` +
                `br=0:bg=${0.2 + intensity * 0.3}:bb=0`);
        // Aumentar contraste para efecto digital
        vf.push(`eq=contrast=${1.2 + intensity * 0.3}:brightness=${0.05 * intensity}`);
        logger.info(`[FFMPEG] Applied matrix effect with green color shift`);
        break;

      case 'dna':
        // Efecto DNA con ondas de color cian/magenta
        const dnaShift = 0.1 + (intensity * 0.3); // 0.1-0.4
        // Colorizar con colores DNA (azul/rosa)
        vf.push(`colorchannelmixer=rr=${1 + dnaShift}:rg=0:rb=${dnaShift}:` +
                `gr=0:gg=${1 - dnaShift * 0.5}:gb=${dnaShift}:` +
                `br=${dnaShift}:bg=${dnaShift}:bb=${1 + dnaShift}`);
        // Añadir curves para ondulación
        vf.push(`curves=all='0/0 0.25/${0.25 + intensity * 0.1} 0.75/${0.75 - intensity * 0.1} 1/1'`);
        // Saturación alta para colores vibrantes
        vf.push(`eq=saturation=${1.3 + intensity * 0.5}`);
        logger.info(`[FFMPEG] Applied DNA effect with cyan/magenta shift`);
        break;

      case 'hexagon':
        // Efecto hexágonos con patrón geométrico (usando pixelate + edge detection)
        const hexSize = Math.floor(20 - (intensity * 12)); // 20-8 (menor = más hexágonos)
        // Pixelate para crear patrón geométrico
        vf.push(`scale=iw/${hexSize}:ih/${hexSize}:flags=neighbor`);
        vf.push(`scale=iw*${hexSize}:ih*${hexSize}:flags=neighbor`);
        // Edge detection para resaltar bordes hexagonales
        vf.push(`edgedetect=mode=colormix:high=${0.1 + intensity * 0.2}`);
        // Colorizar a cian para efecto tech
        vf.push(`colorchannelmixer=rr=0:rg=${0.5 + intensity * 0.3}:rb=${0.8 + intensity * 0.2}`);
        logger.info(`[FFMPEG] Applied hexagon effect with geometric patterns`);
        break;

      case 'wave':
        // Efecto ondas con distorsión sinusoidal
        const waveAmount = Math.floor(5 + (intensity * 15)); // 5-20
        // Curves para crear ondulación de brillo
        vf.push(`curves=all='0/${0.05 * intensity} 0.25/${0.25 + intensity * 0.1} 0.5/0.5 0.75/${0.75 - intensity * 0.1} 1/${1 - 0.05 * intensity}'`);
        // Color shift azulado para efecto agua
        vf.push(`colorchannelmixer=rr=${1 - 0.2 * intensity}:rg=${1 - 0.1 * intensity}:rb=${1 + 0.3 * intensity}`);
        // Añadir leve blur para suavizar ondas
        vf.push(`gblur=sigma=${1 + intensity * 2}:steps=1`);
        logger.info(`[FFMPEG] Applied wave effect with sinusoidal curves`);
        break;

      case 'none':
        // No overlay
        break;

      default:
        logger.warn(`[FFMPEG] Unknown overlay type: ${overlayType}, skipping`);
    }
  }

  if ((e.indicator || e.clipIndicator) && clipNumber !== null) {
    const indicator = e.indicator || e.clipIndicator;
    const pos = indicator.position || 'top-left';
    const pad = 20;
    const size = indicator.size || 90;
    const bgColor = indicator.bgColor || '#000000';
    const textColor = indicator.textColor || '#ffffff';
    const opacity = indicator.opacity !== undefined ? indicator.opacity : 0.7;
    const style = indicator.style || 'badge'; // simple, badge, or rounded
    const type = indicator.type || 'permanent'; // 'temporal' or 'permanent'
    const duration = indicator.duration || null; // duration in seconds for temporal indicators

    // Generate overlay image with clip number using Python
    const overlayPath = `/tmp/clip-number-${clipNumber}-${Date.now()}.png`;
    const { execSync } = require('child_process');

    try {
      execSync(`python3 /srv/storyclip/utils/generate-clip-number.py ${clipNumber} ${overlayPath} ${size} "${bgColor}" "${textColor}" ${opacity} "${style}"`, { timeout: 5000 });

      // Calculate overlay position
      const x = (pos.includes('right')) ? `W-${pad + size}` : `${pad}`;
      const y = (pos.includes('bottom')) ? `H-${pad + size}` : `${pad}`;

      // Store overlay path for later use (will be added after other filters)
      vf.overlayPath = overlayPath;
      vf.overlayX = x;
      vf.overlayY = y;
      vf.overlayType = type;
      vf.overlayDuration = duration;

      logger.info(`[FFMPEG] Generated clip number overlay: ${overlayPath}, position=${pos}, size=${size}, style=${style}, type=${type}, duration=${duration}`);
    } catch (error) {
      logger.error(`[FFMPEG] Failed to generate clip number overlay: ${error.message}`);
    }
  }

  // Formato final para compatibilidad
  vf.push('format=yuv420p');

  const result = {
    filters: vf.filter(Boolean).join(','),
    overlayPath: vf.overlayPath || null,
    overlayX: vf.overlayX || null,
    overlayY: vf.overlayY || null,
    overlayType: vf.overlayType || null,
    overlayDuration: vf.overlayDuration || null
  };

  logger.info(`[FFMPEG] Built visual filters with 9:16 crop: ${result.filters}`);
  if (result.overlayPath) {
    logger.info(`[FFMPEG] With overlay: ${result.overlayPath} at (${result.overlayX}, ${result.overlayY}), type=${result.overlayType}, duration=${result.overlayDuration}`);
  }

  // For backward compatibility, return string if no overlay
  return result.overlayPath ? result : result.filters;
}

class FFmpegHelper {
  constructor() {
    this.setThreads(process.env.FFMPEG_THREADS || 4);
  }

  setThreads(threads) {
    ffmpeg.setFfmpegPath('ffmpeg');
    ffmpeg.setFfprobePath('ffprobe');
  }

  async getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          logger.error('Error getting video info:', err.message);
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: parseFloat(metadata.format.duration),
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate),
          bitrate: parseInt(metadata.format.bit_rate),
          size: parseInt(metadata.format.size),
          format: metadata.format.format_name
        });
      });
    });
  }

  async createStoryClips(inputPath, outputDir, options = {}) {
    const {
      clipDuration = 5, // segundos
      quality = 'high',
      startTime = 0,
      maxClips = 1000, // Limitar número de clips para evitar sobrecarga
      aspectRatio = '9:16',
      resolution = '720x1280',
      fps = 30,
      videoBitrate = '2000k',
      audioBitrate = '128k',
      preset = 'fast',
      crf = 23,
      format = 'mp4',
      videoCodec = 'libx264',
      audioCodec = 'aac'
    } = options;

    try {
      const videoInfo = await this.getVideoInfo(inputPath);
      const totalDuration = videoInfo.duration - startTime;
      
      // Calcular clips posibles por duración del video
      const clipsByDuration = Math.ceil(totalDuration / clipDuration);
      
      // LÍMITE MÁXIMO: 50 clips
      const MAX_CLIPS = 50;
      const MAX_CLIP_DURATION = 60; // segundos
      
      let numClips, clipConfigs;
      
      if (maxClips === 1000) {
        // Modo automático: usar duración del video
        numClips = Math.min(clipsByDuration, MAX_CLIPS);
        clipConfigs = Array(numClips).fill({ duration: clipDuration });
      } else {
        // Modo manual: respetar maxClips pero limitar a 50
        const requestedClips = Math.min(maxClips, MAX_CLIPS);
        const totalRequestedDuration = requestedClips * clipDuration;
        
        if (totalRequestedDuration <= totalDuration) {
          // Video es suficientemente largo: distribuir tiempo restante en clips extendidos
          numClips = requestedClips;
          
          // Calcular tiempo restante
          const remainingDuration = totalDuration - totalRequestedDuration;
          
          if (remainingDuration > 0) {
            // Crear clips estándar y algunos extendidos
            const standardClips = Math.max(1, numClips - 2); // Dejar espacio para 1-2 clips extendidos
            const standardDuration = standardClips * clipDuration;
            const extendedDuration = totalDuration - standardDuration;
            
            clipConfigs = [];
            
            // Clips estándar
            for (let i = 0; i < standardClips; i++) {
              clipConfigs.push({ duration: clipDuration });
            }
            
            // Clips extendidos con tiempo restante
            const extendedClips = numClips - standardClips;
            const durationPerExtended = Math.min(extendedDuration / extendedClips, MAX_CLIP_DURATION);
            
            for (let i = 0; i < extendedClips; i++) {
              clipConfigs.push({ duration: durationPerExtended });
            }
          } else {
            // No hay tiempo restante, todos clips estándar
            clipConfigs = Array(numClips).fill({ duration: clipDuration });
          }
        } else {
          // Video es más corto: distribuir tiempo en menos clips
          numClips = Math.min(requestedClips, clipsByDuration);
          
          // Calcular tiempo restante para clips extendidos
          const standardClips = Math.max(1, numClips - 2); // Dejar espacio para 1-2 clips extendidos
          const standardDuration = standardClips * clipDuration;
          const remainingDuration = totalDuration - standardDuration;
          
          // Crear configuración de clips
          clipConfigs = [];
          
          // Clips estándar
          for (let i = 0; i < standardClips; i++) {
            clipConfigs.push({ duration: clipDuration });
          }
          
          // Clips extendidos con tiempo restante
          if (remainingDuration > 0) {
            const extendedClips = Math.min(2, numClips - standardClips);
            const durationPerExtended = Math.min(remainingDuration / extendedClips, MAX_CLIP_DURATION);
            
            for (let i = 0; i < extendedClips; i++) {
              clipConfigs.push({ duration: durationPerExtended });
            }
          }
          
          numClips = clipConfigs.length;
        }
      }
      
      logger.info(`Video duration: ${videoInfo.duration}s, Available clips by duration: ${clipsByDuration}, Requested maxClips: ${maxClips}, Final clips to create: ${numClips}`);
      logger.info(`Clip configuration:`, clipConfigs.map((config, i) => `Clip ${i+1}: ${config.duration}s`));

      const clips = [];

      // Procesar clips de manera secuencial para evitar sobrecarga
      let currentTime = startTime;
      
      for (let i = 0; i < numClips; i++) {
        const clipConfig = clipConfigs[i];
        const clipDuration = clipConfig.duration;
        
        // Calcular tiempo de inicio
        let clipStartTime = currentTime;
        
        // Si el clip se extiende más allá del video, ajustar
        if (clipStartTime + clipDuration > videoInfo.duration) {
          clipStartTime = Math.max(startTime, videoInfo.duration - clipDuration);
        }
        
        const clipEndTime = Math.min(clipStartTime + clipDuration, videoInfo.duration);
        const actualDuration = clipEndTime - clipStartTime;
        
        const clipFilename = `clip_${String(i + 1).padStart(3, '0')}.mp4`;
        const clipPath = path.join(outputDir, clipFilename);

        logger.info(`Processing clip ${i + 1}/${numClips} (start: ${clipStartTime}s, duration: ${actualDuration}s)...`);

        await this.createSingleClip(inputPath, clipPath, {
          startTime: clipStartTime,
          duration: actualDuration,
          quality,
          aspectRatio,
          resolution,
          fps,
          videoBitrate,
          audioBitrate,
          preset,
          crf,
          format,
          videoCodec,
          audioCodec,
          // HOTFIX: Pasar clip y body para normalización
          clip: { index: i + 1, startTime: clipStartTime, duration: actualDuration },
          body: options,
          jobId: options.jobId,
          clipIndex: i
        });

        // Thumbnail generation disabled - user doesn't need thumbnails
        // const thumbnailFilename = `thumb_${String(i + 1).padStart(3, '0')}.jpg`;
        // const thumbnailPath = path.join(outputDir, thumbnailFilename);
        // 
        // try {
        //   await this.extractThumbnail(clipPath, thumbnailPath, 0.5);
        //   logger.info(`Thumbnail generated: ${thumbnailFilename}`);
        // } catch (error) {
        //   logger.warn(`Failed to generate thumbnail for clip ${i + 1}:`, error.message);
        // }

        const clipInfo = {
          index: i + 1,
          filename: clipFilename,
          path: clipPath,
          startTime: clipStartTime,
          duration: actualDuration,
          size: fs.statSync(clipPath).size,
          thumbnail: null // No thumbnails generated
        };

        clips.push(clipInfo);
        logger.info(`Clip ${i + 1} completed: ${clipFilename} (${actualDuration}s)`);
        
        // Avanzar tiempo para el siguiente clip
        currentTime = clipEndTime;
        
        // Si llegamos al final del video, reiniciar desde el inicio
        if (currentTime >= videoInfo.duration) {
          currentTime = startTime;
        }
      }

      logger.success(`Successfully created ${clips.length} story clips`);
      return clips;
    } catch (error) {
      logger.error('Error creating story clips:', error.message);
      throw error;
    }
  }

  async createSingleClip(inputPath, outputPath, options = {}) {
    const {
      startTime = 0,
      duration = 5,
      quality = 'high',
      aspectRatio = '9:16',
      resolution = '720x1280',
      fps = 30,
      videoBitrate = '2000k',
      audioBitrate = '128k',
      preset = 'fast',
      crf = 23,
      format = 'mp4',
      videoCodec = 'libx264',
      audioCodec = 'aac',
      effects = {},
      overlays = {},
      filters = {},
      // HOTFIX: Nuevos parámetros para normalización
      clip = {},
      body = {},
      clipIndex = 0
    } = options;

    // Parsear resolución
    const [width, height] = resolution.split('x').map(Number);
    
    // Aplicar bitrate basado en calidad si no se especifica
    const finalVideoBitrate = quality === 'high' ? videoBitrate : 
                             quality === 'medium' ? '1000k' : '500k';

    // HOTFIX: Normalizar efectos por-clip vs globales
    // Si se pasan effects directamente y clip/body están vacíos, usar effects
    const bodyWithEffects = Object.keys(body).length > 0 ? body : { filters: effects };
    const clipWithEffects = Object.keys(clip).length > 0 ? clip : { effects };
    const normalizedEffects = normalizeEffects(clipWithEffects, bodyWithEffects);
    const clipNumber = (clipIndex !== undefined && clipIndex !== null) ? clipIndex + 1 : null;

    // DEBUG: Log overlays antes de buildVisualVF
    logger.info(`[DEBUG] Overlays antes de buildVisualVF:`, JSON.stringify(overlays));

    const vfEffects = buildVisualVF(normalizedEffects, { width, height, clipNumber, overlays });

    // DEBUG: Log de efectos normalizados
    logger.info(JSON.stringify({
      evt: 'debug_normalize_effects',
      jobId: options.jobId || 'unknown',
      clipIndex: options.clipIndex || 0,
      clip: clip,
      body: body,
      normalizedEffects: normalizedEffects,
      vfEffects: vfEffects
    }));
    
    // CRITICAL: Si no hay efectos en clip, buscar en clipsWithEffects
    if (!vfEffects && options.clipsWithEffects && options.clipsWithEffects.length > 0) {
      // Buscar clip por índice o por tiempo
      const clipWithEffects = options.clipsWithEffects.find(c => 
        (c.start === clip.start && c.end === clip.end) || 
        (c.index === options.clipIndex) ||
        (options.clipIndex !== undefined && options.clipsWithEffects[options.clipIndex])
      ) || (options.clipIndex !== undefined ? options.clipsWithEffects[options.clipIndex] : null);
      
      if (clipWithEffects && clipWithEffects.effects) {
        const normalizedEffectsFromClip = normalizeEffects(clipWithEffects, body);
        const vfEffectsFromClip = buildVisualVF(normalizedEffectsFromClip);
        if (vfEffectsFromClip) {
          // Usar efectos del clip específico
          const presetVF = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;
          const vfFinal = [vfEffectsFromClip, presetVF].filter(Boolean).join(',');
          
          logger.info(JSON.stringify({
            evt: 'ffmpeg_cmd_clip_effects', 
            jobId: options.jobId || 'unknown',
            clipIndex: options.clipIndex || 0,
            vfFinal,
            normalizedEffects: normalizedEffectsFromClip,
            clipWithEffects: clipWithEffects.effects
          }));
          
          // Aplicar filtros del clip
          return new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)
              .seekInput(startTime)
              .duration(duration)
              .videoCodec(videoCodec)
              .audioCodec(audioCodec)
              .videoBitrate(finalVideoBitrate)
              .audioBitrate(audioBitrate)
              .format(format)
              .videoFilters(vfFinal)
              .outputOptions([
                `-preset ${preset}`,
                `-crf ${crf}`,
                '-movflags +faststart',
                '-pix_fmt yuv420p'
              ])
              .on('start', (cmd) => {
                logger.info(`FFmpeg started: ${cmd}`);
              })
              .on('progress', (progress) => {
                if (progress.percent) {
                  logger.info(`Processing: ${progress.percent}% done`);
                }
              })
              .on('end', () => {
                logger.info('FFmpeg finished');
                resolve(outputPath);
              })
              .on('error', (err) => {
                logger.error('FFmpeg error:', err);
                reject(err);
              });
            command.save(outputPath);
          });
        }
      }
    }
    
    // FIX: Si vfEffects ya existe (contiene scale/crop/format de buildVisualVF),
    // NO añadir presetVF porque causaría doble escala conflictiva
    let vfFinal;
    let overlayInfo = null;

    if (vfEffects) {
      // Check if vfEffects is an object with overlay info
      if (typeof vfEffects === 'object' && vfEffects.filters) {
        vfFinal = vfEffects.filters;
        overlayInfo = {
          path: vfEffects.overlayPath,
          x: vfEffects.overlayX,
          y: vfEffects.overlayY,
          type: vfEffects.overlayType,
          duration: vfEffects.overlayDuration
        };
      } else {
        // vfEffects ya incluye scale + crop + format completo, usar directamente
        vfFinal = vfEffects;
      }
    } else {
      // Sin efectos visuales, usar preset básico con pad
      const presetVF = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;
      vfFinal = presetVF;
    }
    
    // Logging útil para debugging
    logger.info(JSON.stringify({
      evt: 'ffmpeg_cmd', 
      jobId: options.jobId || 'unknown',
      clipIndex: options.clipIndex || 0,
      vfFinal,
      normalizedEffects
    }));

    // DEBUG: Verificar si hay efectos/overlays
    logger.info(JSON.stringify({
      evt: 'debug_effects_check',
      jobId: options.jobId || 'unknown',
      clipIndex: options.clipIndex || 0,
      effectsKeys: Object.keys(effects),
      overlaysKeys: Object.keys(overlays),
      effectsLength: Object.keys(effects).length,
      overlaysLength: Object.keys(overlays).length,
      vfEffects: vfEffects,
      vfFinal: vfFinal
    }));

    // CRITICAL FIX: Si hay vfEffects (filtros visuales), usar vfFinal directamente
    if (vfEffects) {
      logger.info(JSON.stringify({
        evt: 'using_vfFinal_directly',
        jobId: options.jobId || 'unknown',
        clipIndex: options.clipIndex || 0,
        vfFinal: vfFinal
      }));
      
      // Usar vfFinal directamente sin pasar por el servicio de efectos
      return new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .seekInput(startTime)
          .duration(duration)
          .videoCodec(videoCodec)
          .audioCodec(audioCodec)
          .videoBitrate(finalVideoBitrate)
          .audioBitrate(audioBitrate)
          .format(format);

        // If we have an overlay, add it as an input and modify the filter
        if (overlayInfo && overlayInfo.path) {
          const fs = require('fs-extra');
          if (fs.existsSync(overlayInfo.path)) {
            command.input(overlayInfo.path);
            // Modify filter to include overlay
            // First apply all filters to main video, then overlay the image

            // For temporal indicators, add enable filter to show only during specified duration
            let overlayFilter = `overlay=${overlayInfo.x}:${overlayInfo.y}`;
            if (overlayInfo.type === 'temporal' && overlayInfo.duration) {
              // Enable overlay only from 0 to duration seconds
              overlayFilter += `:enable='between(t,0,${overlayInfo.duration})'`;
              logger.info(`[FFMPEG] Using temporal overlay: visible for ${overlayInfo.duration}s`);
            }

            const finalFilter = `[0:v]${vfFinal}[v];[v][1:v]${overlayFilter}`;
            command.complexFilter(finalFilter);
            logger.info(`[FFMPEG] Added overlay filter: ${finalFilter}`);
          } else {
            logger.warn(`[FFMPEG] Overlay image not found: ${overlayInfo.path}, using filters without overlay`);
            command.videoFilters(vfFinal);
          }
        } else {
          command.videoFilters(vfFinal);
        }

        command.outputOptions([
            `-preset ${preset}`,
            `-crf ${crf}`,
            '-movflags +faststart',
            '-pix_fmt yuv420p'
          ])
          .on('start', (cmd) => {
            logger.info(`FFmpeg started with vfFinal: ${cmd}`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              logger.info(`Processing: ${progress.percent}% done`);
            }
          })
          .on('end', () => {
            logger.info('FFmpeg finished');
            // Clean up overlay file if it exists
            if (overlayInfo && overlayInfo.path) {
              const fs = require('fs-extra');
              fs.remove(overlayInfo.path).catch(() => {});
            }
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('FFmpeg error:', err);
            // Clean up overlay file if it exists
            if (overlayInfo && overlayInfo.path) {
              const fs = require('fs-extra');
              fs.remove(overlayInfo.path).catch(() => {});
            }
            reject(err);
          });
        command.save(outputPath);
      });
    }

    // Si hay efectos o overlays, usar el servicio de efectos
    if (Object.keys(effects).length > 0 || Object.keys(overlays).length > 0) {
      const effectsService = require('../services/effects.service');
      
      // Aplicar efectos y overlays
      if (Object.keys(overlays).length > 0) {
        return await effectsService.applyOverlays(inputPath, outputPath, overlays, {
          startTime,
          duration,
          aspectRatio,
          resolution,
          fps,
          videoBitrate: finalVideoBitrate,
          audioBitrate,
          preset,
          crf,
          format,
          videoCodec,
          audioCodec
        });
      } else {
        return await effectsService.applyEffects(inputPath, outputPath, effects, {
          startTime,
          duration,
          aspectRatio,
          resolution,
          fps,
          videoBitrate: finalVideoBitrate,
          audioBitrate,
          preset,
          crf,
          format,
          videoCodec,
          audioCodec
        });
      }
    }

    // HOTFIX: Procesamiento con filtros unificados
    return new Promise((resolve, reject) => {
      // Timeout de 60 segundos para evitar procesos colgados
      const timeout = setTimeout(() => {
        command.kill('SIGKILL');
        reject(new Error(`FFmpeg timeout after 60 seconds processing clip`));
      }, 60000);

      const command = ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .videoCodec(videoCodec) // Codec personalizable
        .audioCodec(audioCodec) // Codec de audio personalizable
        .videoBitrate(finalVideoBitrate) // Bitrate personalizable
        .audioBitrate(audioBitrate) // Bitrate de audio personalizable
        .format(format) // Formato personalizable
        .videoFilters(vfFinal) // HOTFIX: Usar método videoFilters para evitar error 234
        .outputOptions([
          `-preset ${preset}`, // Preset personalizable
          `-crf ${crf}`, // CRF personalizable
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (commandLine) => {
          logger.debug('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          logger.debug(`Processing: ${progress.percent}% done`);
        })
        .on('end', async () => {
          clearTimeout(timeout);

          // Verificar que el archivo de salida existe
          const fs = require('fs-extra');
          try {
            const stats = await fs.stat(outputPath);
            if (stats.size === 0) {
              reject(new Error(`FFmpeg produced empty file: ${outputPath}`));
            } else {
              logger.debug(`Clip created successfully: ${outputPath} (${stats.size} bytes)`);
              resolve();
            }
          } catch (err) {
            reject(new Error(`FFmpeg failed to create output file: ${outputPath}`));
          }
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          logger.error('FFmpeg error:', err.message);
          reject(err);
        });

      command.save(outputPath);
    });
  }

  async createReelClip(inputPath, outputPath, options = {}) {
    const {
      startTime = 0,
      duration = 7,
      quality = 'high'
    } = options;

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .size('720x1280') // 9:16 aspect ratio
        .aspect('9:16')
        .fps(30)
        .videoBitrate(quality === 'high' ? '3M' : '2M')
        .audioBitrate('128k')
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-crf 22',
          '-movflags +faststart'
        ])
        .on('start', (commandLine) => {
          logger.debug('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          logger.debug(`Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          logger.debug(`Reel created: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg error:', err.message);
          reject(err);
        });

      command.save(outputPath);
    });
  }

  async extractThumbnail(inputPath, outputPath, timeOffset = 1) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timeOffset)
        .frames(1)
        .size('720x1280')
        .format('image2')
        .on('end', () => {
          logger.debug(`Thumbnail extracted: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          logger.error('Thumbnail extraction error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Crear clips desde segmentos específicos (modo manual)
   */
  async createManualClips(inputPath, outputDir, options = {}) {
    const {
      clips = [],
      quality = 'high',
      filters = {},
      effects = {},
      overlays = {},
      audio = {},
      cameraMovement = {},
      jobId = null  // Agregar jobId para actualizar progreso
    } = options;

    try {
      logger.info(`🎬 Creating ${clips.length} manual clips`);

      const videoInfo = await this.getVideoInfo(inputPath);
      const processedClips = [];

      for (let i = 0; i < clips.length; i++) {
        const clipDef = clips[i];
        const { start, end } = clipDef;
        const duration = end - start;

        // DEBUG: Log clip definition to see if indicator is present
        logger.info(`🔍 DEBUG - Clip ${i + 1} definition:`, JSON.stringify(clipDef, null, 2));
        if (clipDef.effects) {
          logger.info(`🔍 DEBUG - Clip ${i + 1} effects:`, JSON.stringify(clipDef.effects, null, 2));
          if (clipDef.effects.indicator) {
            logger.info(`✅ Clip ${i + 1} has indicator:`, JSON.stringify(clipDef.effects.indicator, null, 2));
          } else {
            logger.warn(`⚠️ Clip ${i + 1} missing indicator in effects`);
          }
        } else {
          logger.warn(`⚠️ Clip ${i + 1} has no effects object`);
        }

        if (end > videoInfo.duration) {
          logger.warn(`Clip ${i + 1} end (${end}s) exceeds duration. Adjusting.`);
          clipDef.end = videoInfo.duration;
        }

        if (start >= videoInfo.duration) {
          logger.warn(`Clip ${i + 1} start (${start}s) exceeds duration. Skipping.`);
          continue;
        }

        const clipFilename = `clip_${String(i + 1).padStart(3, '0')}.mp4`;
        const clipPath = path.join(outputDir, clipFilename);

        logger.info(`📎 Processing manual clip ${i + 1}/${clips.length} (${start}s - ${end}s)`);

        await this.createSingleClip(inputPath, clipPath, {
          startTime: start,
          duration: duration,
          quality,
          aspectRatio: '9:16',
          resolution: '720x1280',
          fps: 30,
          videoBitrate: quality === 'high' ? '2000k' : '1000k',
          audioBitrate: '128k',
          preset: 'fast',
          crf: 23,
          format: 'mp4',
          videoCodec: 'libx264',
          audioCodec: 'aac',
          filters: filters,
          effects: clipDef.effects || effects || {},  // PRIORIZAR efectos del clip
          overlays: clipDef.overlays || overlays || {},  // PRIORIZAR overlays del clip
          // HOTFIX: Pasar clip y body para normalización
          clip: clipDef,
          body: options,
          jobId: options.jobId,
          clipIndex: i
        });

        processedClips.push({
          index: i + 1,
          filename: clipFilename,
          path: clipPath,
          startTime: start,
          duration: duration,
          size: fs.statSync(clipPath).size,
          thumbnail: null
        });

        logger.info(`✅ Manual clip ${i + 1} completed`);

        // Actualizar progreso incremental si hay jobId
        if (jobId) {
          const progress = 30 + Math.floor(((i + 1) / clips.length) * 60); // 30-90% durante procesamiento
          const { updateJob } = require('../utils/jobs');
          updateJob(jobId, {
            status: 'processing',
            progress: progress,
            message: `Procesando clip ${i + 1} de ${clips.length}`
          });
          logger.info(`📊 Job ${jobId} progress: ${progress}%`);
        }
      }

      logger.success(`Created ${processedClips.length} manual clips`);
      return processedClips;
    } catch (error) {
      logger.error('Error creating manual clips:', error.message);
      throw error;
    }
  }

}

module.exports = new FFmpegHelper();
module.exports.normalizeEffects = normalizeEffects;
module.exports.buildVisualVF = buildVisualVF;
