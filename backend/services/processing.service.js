const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const ffmpegHelper = require('../utils/ffmpeg');
const downloadService = require('./download.service');
const storyService = require('./story.service');

// Importar métricas
const { 
  m_jobs_created, 
  m_jobs_completed, 
  m_jobs_failed, 
  m_job_duration, 
  m_queue_depth,
  m_active_jobs,
  m_throughput_per_minute
} = require('../src/metrics');

class ProcessingService {
  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
    this.tempDir = process.env.TEMP_DIR || '/srv/storyclip/tmp';
    this.webhookUrl = process.env.WEBHOOK_URL;
    this.videoBackendKey = process.env.VIDEO_BACKEND_KEY;
  }

  /**
   * Verifica que los clips existan en el directorio final del job y
   * si se generaron en otra ruta temporal, los mueve al destino.
   */
  async reconcileOutputs(jobId, expectedJobOutputDir) {
    await fs.ensureDir(expectedJobOutputDir);

    // Si ya hay clips en destino, nada que hacer
    const existing = await fs.readdir(expectedJobOutputDir).catch(() => []);
    const hasClips = existing.some(f => /^clip_\d{3}\.mp4$/.test(f));
    if (hasClips) {
      return;
    }

    // Buscar posibles ubicaciones temporales donde ffmpeg pudo escribir
    const candidateDirs = [
      path.join(this.tempDir, jobId),
      path.join(this.tempDir, 'processing', jobId),
      path.join('/tmp', jobId),
      path.join('/tmp', 'uploads', jobId)
    ];

    for (const dir of candidateDirs) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        const clipFiles = files.filter(f => /^clip_\d{3}\.mp4$/.test(f));
        if (clipFiles.length > 0) {
          // Mover clips al directorio final
          for (const file of clipFiles) {
            const src = path.join(dir, file);
            const dst = path.join(expectedJobOutputDir, file);
            await fs.move(src, dst, { overwrite: true });
          }
          break;
        }
      }
    }

    // Permisos seguros para que Nginx pueda servir
    await fs.chmod(expectedJobOutputDir, 0o755).catch(() => {});
    const finalFiles = await fs.readdir(expectedJobOutputDir).catch(() => []);
    await Promise.all(finalFiles.map(async f => {
      const fp = path.join(expectedJobOutputDir, f);
      try { await fs.chmod(fp, 0o644); } catch (_) {}
    }));
  }

  // Procesar story desde archivo local
  async processStoryFromFile(filePath, options = {}, progressCallback = null) {
    const jobId = options.jobId || uuidv4();

    try {
      logger.info(`Starting story processing from file for job: ${jobId}`);

      // Asegurar directorios
      await fs.ensureDir(this.outputDir);
      await fs.ensureDir(this.tempDir);

      // Actualizar progreso
      if (progressCallback) progressCallback(10);

      // Verificar que el archivo existe
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Temporary file not found: ${filePath}`);
      }

      // Loggear información del archivo para debug
      const fileStats = await fs.stat(filePath);
      logger.info(`Processing file: ${filePath}, size: ${fileStats.size} bytes`);

      if (progressCallback) progressCallback(30);

      // Crear directorio de salida para este job
      const jobOutputDir = path.join(this.outputDir, jobId);
      await fs.ensureDir(jobOutputDir);

      // Procesar con FFmpeg
      logger.info(`Processing video with FFmpeg...`);
      logger.info(`FFmpeg input: ${filePath}, output: ${jobOutputDir}`);
      
      // Leer efectos de la base de datos si hay storyId
      let effects = {};
      let overlays = {};
      
      if (options.storyId) {
        const effectsService = require('./effects.service');
        const effectsConfig = await effectsService.getEffectsFromDatabase(options.storyId);
        effects = effectsConfig.effects || {};
        overlays = effectsConfig.overlays || {};
        
        logger.info(`Loaded effects for story ${options.storyId}:`, { effects, overlays });
      }

      const clips = await ffmpegHelper.createStoryClips(filePath, jobOutputDir, {
        clipDuration: options.clipDuration || 5,
        maxClips: options.maxClips || 1000,
        quality: options.quality || 'high',
        startTime: options.startTime || 0,
        aspectRatio: options.aspectRatio || '9:16',
        resolution: options.resolution || '720x1280',
        fps: options.fps || 30,
        videoBitrate: options.videoBitrate || '2000k',
        audioBitrate: options.audioBitrate || '128k',
        preset: options.preset || 'fast',
        crf: options.crf || 23,
        format: options.format || 'mp4',
        videoCodec: options.videoCodec || 'libx264',
        audioCodec: options.audioCodec || 'aac',
        effects: effects,
        overlays: overlays
      });

      logger.info(`FFmpeg completed, generated ${clips.length} clips`);
      if (progressCallback) progressCallback(80);

      // Reconciliar por si algo generó en rutas temporales y ajustar permisos
      await this.reconcileOutputs(jobId, jobOutputDir);

      // Preparar outputs
      const outputs = clips.map(clip => ({
        type: 'story_clip',
        path: `/outputs/${jobId}/${clip.filename}`,
        filename: clip.filename,
        size: clip.size,
        duration: clip.duration,
        startTime: clip.startTime,
        metadata: {
          aspectRatio: '9:16',
          resolution: '720x1280',
          format: 'mp4'
        }
      }));

      // Artifacts enriquecidos con URL pública
      const publicBase = 'https://story.creatorsflow.app/outputs';
      const artifacts = outputs.map(o => ({
        id: o.filename.replace('.mp4',''),
        type: 'video',
        url: `${publicBase}/${jobId}/${o.filename}`,
        filename: o.filename
      }));

      // Thumbnail generation disabled - user doesn't need thumbnails
      // const thumbnailPath = path.join(jobOutputDir, 'thumbnail');
      // await ffmpegHelper.extractThumbnail(filePath, thumbnailPath, 0);
      // 
      // const thumbnailFiles = await fs.readdir(jobOutputDir);
      // const thumbnailFile = thumbnailFiles.find(file => file.startsWith('thumbnail') && !file.endsWith('.mp4'));
      // 
      // if (thumbnailFile) {
      //   const finalThumbnailPath = path.join(jobOutputDir, thumbnailFile);
      //   outputs.push({
      //     type: 'thumbnail',
      //     path: `/outputs/${jobId}/${thumbnailFile}`,
      //     filename: thumbnailFile,
      //     size: (await fs.stat(finalThumbnailPath)).size,
      //     metadata: {
      //       format: thumbnailFile.split('.').pop() || 'jpg',
      //       resolution: '720x1280'
      //     }
      //   });
      // }

      if (progressCallback) progressCallback(95);

      // Preparar URLs adicionales para el frontend
      const additionalUrls = {
        viewerUrl: `https://story.creatorsflow.app/api/clips/${jobId}`,
        jsonUrl: `https://story.creatorsflow.app/api/clips/${jobId}/json`,
        clipsIndexUrl: `https://story.creatorsflow.app/api/clips`
      };

      // Enviar webhook con URLs adicionales
      await this.sendWebhook(jobId, 'completed', 100, outputs, null, additionalUrls);

      if (progressCallback) progressCallback(100);

      logger.success(`Story processing completed: ${jobId}`);
      return {
        jobId,
        status: 'completed',
        progress: 100,
        message: 'Job completed - 100%',
        outputs,
        result: {
          artifacts
        },
        totalClips: clips.length
      };

    } catch (error) {
      logger.error(`Story processing failed: ${jobId}`, error.message);
      
      // Enviar webhook de error
      await this.sendWebhook(jobId, 'failed', 0, null, error.message);
      
      throw error;
    }
  }

  // Procesar story (clips de 5 segundos)
  async processStory(videoUrl, options = {}, progressCallback = null) {
    const jobId = options.jobId || uuidv4();
    const preset = options.preset || 'storyclip_social_916';
    let tempFilePath = null;
    let endTimer = null;

    try {
      logger.info(`Starting story processing for job: ${jobId}`);

      // Métricas: job creado
      m_jobs_created.inc({ preset });
      m_active_jobs.inc();

      // Métricas: timer de duración
      endTimer = m_job_duration.startTimer({ preset });

      // Asegurar directorios
      await fs.ensureDir(this.outputDir);
      await fs.ensureDir(this.tempDir);

      // Actualizar progreso
      if (progressCallback) progressCallback(10);

      // Descargar video
      logger.info(`Downloading video: ${videoUrl}`);
      const downloadResult = await downloadService.downloadVideo(videoUrl);
      tempFilePath = downloadResult.filePath;

      if (progressCallback) progressCallback(30);

      // Crear directorio de salida para este job
      const jobOutputDir = path.join(this.outputDir, jobId);
      await fs.ensureDir(jobOutputDir);

      // Procesar con FFmpeg
      logger.info(`Processing video with FFmpeg...`);
      logger.info(`Effects and overlays:`, { effects: options.effects, overlays: options.overlays });
      
      const clips = await ffmpegHelper.createStoryClips(tempFilePath, jobOutputDir, {
        clipDuration: options.clipDuration || 5,
        maxClips: options.maxClips || 1000,
        quality: options.quality || 'high',
        startTime: options.startTime || 0,
        aspectRatio: options.aspectRatio || '9:16',
        resolution: options.resolution || '720x1280',
        fps: options.fps || 30,
        videoBitrate: options.videoBitrate || '2000k',
        audioBitrate: options.audioBitrate || '128k',
        preset: options.preset || 'fast',
        crf: options.crf || 23,
        format: options.format || 'mp4',
        videoCodec: options.videoCodec || 'libx264',
        audioCodec: options.audioCodec || 'aac',
        effects: options.effects || {},
        overlays: options.overlays || {}
      });

      if (progressCallback) progressCallback(80);

      // Preparar outputs
      const outputs = clips.map(clip => ({
        type: 'story_clip',
        path: `/outputs/${jobId}/${clip.filename}`,
        filename: clip.filename,
        size: clip.size,
        duration: clip.duration,
        startTime: clip.startTime,
        metadata: {
          aspectRatio: '9:16',
          resolution: '720x1280',
          format: 'mp4'
        }
      }));

      // Thumbnail generation disabled - user doesn't need thumbnails
      // const thumbnailPath = path.join(jobOutputDir, 'thumbnail.jpg');
      // await ffmpegHelper.extractThumbnail(tempFilePath, thumbnailPath);
      // 
      // outputs.push({
      //   type: 'thumbnail',
      //   path: `/outputs/${jobId}/thumbnail.jpg`,
      //   filename: 'thumbnail.jpg',
      //   size: (await fs.stat(thumbnailPath)).size,
      //   metadata: {
      //     format: 'jpg',
      //     resolution: '720x1280'
      //   }
      // });

      if (progressCallback) progressCallback(95);

      // Preparar URLs adicionales para el frontend
      const additionalUrls = {
        viewerUrl: `https://story.creatorsflow.app/api/clips/${jobId}`,
        jsonUrl: `https://story.creatorsflow.app/api/clips/${jobId}/json`,
        clipsIndexUrl: `https://story.creatorsflow.app/api/clips`
      };

      // Enviar webhook con URLs adicionales
      await this.sendWebhook(jobId, 'completed', 100, outputs, null, additionalUrls);

      if (progressCallback) progressCallback(100);

      // Métricas: job completado exitosamente
      if (endTimer) endTimer();
      m_jobs_completed.inc({ preset });
      m_active_jobs.dec();

      logger.success(`Story processing completed: ${jobId}`);
      return {
        jobId,
        status: 'completed',
        outputs,
        totalClips: clips.length
      };

    } catch (error) {
      logger.error(`Story processing failed: ${jobId}`, error.message);
      
      // Métricas: job fallido
      if (endTimer) endTimer();
      m_jobs_failed.inc({ preset, reason: error.code || 'unknown' });
      m_active_jobs.dec();
      
      // Enviar webhook de error
      await this.sendWebhook(jobId, 'failed', 0, null, error.message);
      
      throw error;
    } finally {
      // Limpiar archivo temporal
      if (tempFilePath) {
        await downloadService.cleanupFile(tempFilePath);
      }
    }
  }

  // Procesar reel (clip de 7 segundos)
  async processReel(videoUrl, options = {}, progressCallback = null) {
    const jobId = options.jobId || uuidv4();
    let tempFilePath = null;

    try {
      logger.info(`Starting reel processing for job: ${jobId}`);

      await fs.ensureDir(this.outputDir);
      await fs.ensureDir(this.tempDir);

      if (progressCallback) progressCallback(10);

      // Descargar video
      const downloadResult = await downloadService.downloadVideo(videoUrl);
      tempFilePath = downloadResult.filePath;

      if (progressCallback) progressCallback(30);

      // Crear directorio de salida
      const jobOutputDir = path.join(this.outputDir, jobId);
      await fs.ensureDir(jobOutputDir);

      // Procesar con FFmpeg
      const reelFilename = `reel_${Date.now()}.mp4`;
      const reelPath = path.join(jobOutputDir, reelFilename);

      await ffmpegHelper.createReelClip(tempFilePath, reelPath, {
        startTime: options.startTime || 0,
        duration: options.duration || 7,
        quality: options.quality || 'high'
      });

      if (progressCallback) progressCallback(80);

      // Preparar outputs
      const outputs = [{
        type: 'reel_clip',
        path: `/outputs/${jobId}/${reelFilename}`,
        filename: reelFilename,
        size: (await fs.stat(reelPath)).size,
        duration: options.duration || 7,
        metadata: {
          aspectRatio: '9:16',
          resolution: '720x1280',
          format: 'mp4'
        }
      }];

      // Thumbnail generation disabled - user doesn't need thumbnails
      // const thumbnailPath = path.join(jobOutputDir, 'thumbnail.jpg');
      // await ffmpegHelper.extractThumbnail(tempFilePath, thumbnailPath);
      // 
      // outputs.push({
      //   type: 'thumbnail',
      //   path: `/outputs/${jobId}/thumbnail.jpg`,
      //   filename: 'thumbnail.jpg',
      //   size: (await fs.stat(thumbnailPath)).size,
      //   metadata: {
      //     format: 'jpg',
      //     resolution: '720x1280'
      //   }
      // });

      if (progressCallback) progressCallback(95);

      // Preparar URLs adicionales para el frontend
      const additionalUrls = {
        viewerUrl: `https://story.creatorsflow.app/api/clips/${jobId}`,
        jsonUrl: `https://story.creatorsflow.app/api/clips/${jobId}/json`,
        clipsIndexUrl: `https://story.creatorsflow.app/api/clips`
      };

      // Enviar webhook con URLs adicionales
      await this.sendWebhook(jobId, 'completed', 100, outputs, null, additionalUrls);

      if (progressCallback) progressCallback(100);

      logger.success(`Reel processing completed: ${jobId}`);
      return {
        jobId,
        status: 'completed',
        outputs
      };

    } catch (error) {
      logger.error(`Reel processing failed: ${jobId}`, error.message);
      await this.sendWebhook(jobId, 'failed', 0, null, error.message);
      throw error;
    } finally {
      if (tempFilePath) {
        await downloadService.cleanupFile(tempFilePath);
      }
    }
  }

  // Procesar imagen (extraer frame como imagen)
  async processImage(videoUrl, options = {}, progressCallback = null) {
    const jobId = options.jobId || uuidv4();
    let tempFilePath = null;

    try {
      logger.info(`Starting image processing for job: ${jobId}`);

      await fs.ensureDir(this.outputDir);
      await fs.ensureDir(this.tempDir);

      if (progressCallback) progressCallback(10);

      // Descargar video
      const downloadResult = await downloadService.downloadVideo(videoUrl);
      tempFilePath = downloadResult.filePath;

      if (progressCallback) progressCallback(30);

      // Crear directorio de salida
      const jobOutputDir = path.join(this.outputDir, jobId);
      await fs.ensureDir(jobOutputDir);

      // Extraer frame como imagen
      const imageFilename = `frame_${Date.now()}.jpg`;
      const imagePath = path.join(jobOutputDir, imageFilename);

      await ffmpegHelper.extractThumbnail(tempFilePath, imagePath, options.timeOffset || 1);

      if (progressCallback) progressCallback(80);

      // Preparar outputs
      const outputs = [{
        type: 'image',
        path: `/outputs/${jobId}/${imageFilename}`,
        filename: imageFilename,
        size: (await fs.stat(imagePath)).size,
        metadata: {
          format: 'jpg',
          resolution: '720x1280',
          timeOffset: options.timeOffset || 1
        }
      }];

      if (progressCallback) progressCallback(95);

      // Preparar URLs adicionales para el frontend
      const additionalUrls = {
        viewerUrl: `https://story.creatorsflow.app/api/clips/${jobId}`,
        jsonUrl: `https://story.creatorsflow.app/api/clips/${jobId}/json`,
        clipsIndexUrl: `https://story.creatorsflow.app/api/clips`
      };

      // Enviar webhook con URLs adicionales
      await this.sendWebhook(jobId, 'completed', 100, outputs, null, additionalUrls);

      if (progressCallback) progressCallback(100);

      logger.success(`Image processing completed: ${jobId}`);
      return {
        jobId,
        status: 'completed',
        outputs
      };

    } catch (error) {
      logger.error(`Image processing failed: ${jobId}`, error.message);
      await this.sendWebhook(jobId, 'failed', 0, null, error.message);
      throw error;
    } finally {
      if (tempFilePath) {
        await downloadService.cleanupFile(tempFilePath);
      }
    }
  }

  // Enviar webhook a Supabase
  async sendWebhook(jobId, status, progress, outputs = null, error = null, additionalUrls = null) {
    if (!this.webhookUrl || !this.videoBackendKey) {
      logger.warn('Webhook URL or key not configured, skipping webhook');
      return;
    }

    try {
      const payload = {
        jobId,
        status,
        progress,
        outputs,
        error,
        additionalUrls,
        timestamp: new Date().toISOString()
      };

      logger.info(`Sending webhook for job: ${jobId}, status: ${status}`);

      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.videoBackendKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.success(`Webhook sent successfully: ${response.status}`);
      return response.data;

    } catch (error) {
      logger.error('Failed to send webhook:', error.message);
      // No lanzar error para no interrumpir el procesamiento principal
    }
  }

  // Obtener información del video
  async getVideoInfo(videoUrl) {
    let tempFilePath = null;

    try {
      // Descargar video temporalmente
      const downloadResult = await downloadService.downloadVideo(videoUrl);
      tempFilePath = downloadResult.filePath;

      // Obtener información con FFmpeg
      const info = await ffmpegHelper.getVideoInfo(tempFilePath);
      
      return {
        ...info,
        originalUrl: videoUrl,
        downloadedSize: downloadResult.size
      };

    } catch (error) {
      logger.error('Error getting video info:', error.message);
      throw error;
    } finally {
      if (tempFilePath) {
        await downloadService.cleanupFile(tempFilePath);
      }
    }
  }

  // Limpiar outputs antiguos
  async cleanupOldOutputs(maxAgeDays = 7) {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
      
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory() && (now - stats.mtime.getTime() > maxAge)) {
          await fs.remove(filePath);
          cleanedCount++;
        }
      }

      logger.info(`Cleaned up ${cleanedCount} old output directories`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up old outputs:', error.message);
      return 0;
    }
  }

  /**
   * Procesar video con el nuevo sistema de jobs
   * Integra validación, gestión de jobs y FFmpeg mejorado
   */
  async processVideoWithJob({ jobId, processBody, videoInfo }) {
    const logger = require('../utils/logger');
    const path = require('path');
    const fs = require('fs-extra');
    const { v4: uuidv4 } = require('uuid');
    
    logger.info(`[PROCESSING] Starting job ${jobId} with new system`);
    
    try {
      // 1. Preparar directorios
      const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
      const tempDir = process.env.TEMP_DIR || '/srv/storyclip/tmp';
      await fs.ensureDir(outputDir);
      await fs.ensureDir(tempDir);
      
      // 2. Generar nombre de archivo de salida
      const outputFileName = `${jobId}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);
      
      // 3. Procesar con FFmpeg mejorado
      const ffmpegHelper = require('../utils/ffmpeg');
      const { normalizeEffects, buildVisualVF } = ffmpegHelper;
      
      // Construir filtros visuales con escala/crop 9:16
      const normalizedEffects = normalizeEffects(
        { effects: processBody.effects || {} }, 
        processBody
      );
      
      const vfCommand = buildVisualVF(normalizedEffects, {
        width: 1080,
        height: 1920
      });
      
      logger.info(`[PROCESSING] Job ${jobId} FFmpeg command: -vf "${vfCommand}"`);
      
      // 4. Ejecutar FFmpeg
      const ffmpegCommand = await ffmpegHelper.processClip({
        inputPath: processBody.videoUrl,
        outputPath,
        startTime: 0,
        duration: videoInfo?.duration || 10,
        options: {
          jobId,
          clipsWithEffects: [processBody.effects],
          clipIndex: 0,
          width: 1080,
          height: 1920
        }
      });
      
      // 5. Verificar que el archivo se creó
      if (!await fs.pathExists(outputPath)) {
        throw new Error('Output file was not created');
      }
      
      // 6. Generar URL de salida
      const outputUrl = `${process.env.CDN_BASE || 'https://story.creatorsflow.app/outputs'}/${outputFileName}`;
      
      logger.info(`[PROCESSING] Job ${jobId} completed successfully: ${outputUrl}`);
      
      return {
        success: true,
        outputUrl,
        outputPath,
        ffmpegCommand: vfCommand,
        processingTime: Date.now(),
        jobId
      };
      
    } catch (error) {
      logger.error(`[PROCESSING] Job ${jobId} failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ProcessingService();

