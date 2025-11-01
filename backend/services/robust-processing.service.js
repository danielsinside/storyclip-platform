/**
 * Servicio de procesamiento robusto
 * Implementa el pipeline completo: upload → process → finalize
 * Sin quedarse en 95%
 */

const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const ffmpegHelper = require('../utils/ffmpeg');
const db = require('../database/db');
const uploadsRepo = require('./uploads.repository');
const metricoolService = require('./metricool.service');
const jobManager = require('./job-manager.service');
const { updateJob, getJob } = require('../utils/jobs');

const UPLOAD_TMP_DIR = process.env.UPLOAD_TMP_DIR || '/srv/storyclip/outputs/uploads';
const PROCESS_WORK_DIR = process.env.PROCESS_WORK_DIR || '/srv/storyclip/work';
const OUTPUT_ROOT = process.env.OUTPUT_ROOT || '/srv/storyclip/outputs';
const CDN_BASE = process.env.CDN_BASE || 'https://story.creatorsflow.app/outputs';

/**
 * Iniciar procesamiento desde uploadId
 */
async function startProcess({
  jobId,  // Ahora puede venir pre-generado desde el endpoint
  uploadId,
  videoUrl,
  mode = 'auto',
  userId = null,
  clipDuration = 5,
  maxClips = 50,
  clips = [],
  filters = {},
  audio = {},
  effects = {},
  overlays = {},
  cameraMovement = {},
  metadata = {}
}) {
  // Si no hay jobId, generar uno
  if (!jobId) {
    jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  try {
    // 1) Resolver archivo del upload o URL externa
    let src, ext, jobInput;

    // IMPORTANTE: Priorizar videoUrl para permitir reprocesamiento
    // Cuando se reprocesa, videoUrl apunta al output anterior que sigue disponible
    if (videoUrl) {
      // Usar URL (externa o de output anterior para reprocesamiento)
      src = videoUrl;
      ext = '.mp4'; // Asumir MP4 para URLs
      logger.info(`📥 Using videoUrl for processing: ${videoUrl}`);
    } else if (uploadId) {
      // Usar archivo subido (solo primera vez)
      const upl = uploadsRepo.get(uploadId);
      if (!upl?.path) {
        await createJob({
          jobId,
          status: 'error',
          progress: 0,
          message: `Upload not found for ${uploadId}`,
          userId
        });
        throw new Error(`Upload not found: ${uploadId}`);
      }
      src = upl.path;
      ext = path.extname(src).toLowerCase() || '.mp4';
      logger.info(`📁 Using upload file for processing: ${src}`);
    } else {
      await createJob({
        jobId,
        status: 'error',
        progress: 0,
        message: 'No uploadId or videoUrl provided',
        userId
      });
      throw new Error('No uploadId or videoUrl provided');
    }

    // 2) Preparar workdir del job
    const workDir = path.join(PROCESS_WORK_DIR, jobId);
    await fs.ensureDir(workDir);

    jobInput = path.join(workDir, `source${ext}`);

    // IMPORTANTE: manejar archivos locales vs URLs externas
    // Detectar si src es URL o path local
    const isUrl = src.startsWith('http://') || src.startsWith('https://');

    if (isUrl) {
      // URL externa o de reprocesamiento: descargar usando downloadService
      logger.info(`📥 Downloading video from URL: ${src} -> ${jobInput}`);
      const downloadService = require('./download.service');
      const downloadResult = await downloadService.downloadVideo(src);

      // Mover archivo descargado al workDir
      await fs.move(downloadResult.filePath, jobInput, { overwrite: true });
      logger.info(`✅ Downloaded video to workDir: ${jobInput}`);
    } else {
      // Archivo local: COPIAR (no mover) para mantener original disponible para reconfiguración
      try {
        await fs.copyFile(src, jobInput);
        logger.info(`✅ Copied upload to workDir: ${src} -> ${jobInput} (original preserved)`);

        // Verificar que la copia fue exitosa
        if (await fs.pathExists(jobInput)) {
          const stats = await fs.stat(jobInput);
          logger.info(`✅ Copy verification: ${jobInput} exists, size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        } else {
          throw new Error('Copy verification failed: destination file does not exist');
        }
      } catch (copyErr) {
        logger.error(`❌ Copy failed: ${copyErr.message}`);
        logger.warn(`🔄 Fallback: trying rename for ${src}`);
        try {
          await fs.rename(src, jobInput);
          logger.info(`⚠️ Moved upload to workDir: ${src} -> ${jobInput} (original may be lost)`);
        } catch (renameErr) {
          logger.error(`❌ Both copy and rename failed: ${renameErr.message}`);
          throw new Error(`Failed to process source ${src}: ${renameErr.message}`);
        }
      }
    }

    // 3) Registrar job en DB como "running: 10%"
    await createJob({
      jobId,
      userId,
      path: 'api',
      source: 'user',
      status: 'running',
      progress: 10,
      message: 'File prepared',
      inputJson: JSON.stringify({
        uploadId,
        videoUrl,
        mode,
        clipDuration,
        maxClips,
        clips,
        workDir,
        filters,
        audio,
        effects,
        overlays,
        cameraMovement,
        metadata
      })
    });

    // IMPORTANTE: Registrar job también en jobManager para que esté disponible en /api/jobs/:jobId/status
    try {
      // Crear el job en el jobManager
      const jobData = {
        id: jobId,
        status: 'RUNNING',
        progress: 10,
        message: 'File prepared',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        request: { uploadId, videoUrl, mode, clipDuration, maxClips, clips, filters },
        outputUrl: null,
        errorMessage: null,
        ffmpegCommand: null,
        processingTime: null
      };

      // Usar el método interno para agregar directamente a Map sin crear nuevo ID
      jobManager.jobs.set(jobId, jobData);
      logger.info(`Job ${jobId} registered in jobManager for status tracking`);
    } catch (error) {
      logger.warn(`Failed to register job ${jobId} in jobManager: ${error.message}`);
      // No fallar el proceso si no se puede registrar en jobManager
    }

    // 4) Lanzar pipeline async (no bloquear request)
    setImmediate(() => {
      runPipeline(jobId, jobInput, workDir, {
        clipDuration,
        maxClips,
        userId,
        uploadId,
        videoUrl,
        mode,
        clips,
        filters,
        audio,
        effects,
        overlays,
        cameraMovement,
        metadata
      })
        .catch(async err => {
          logger.error(`[runPipeline] fatal for ${jobId}:`, err);

          // CRITICAL: Actualizar DB cuando hay error en procesamiento asíncrono
          try {
            await db.run(`
              UPDATE jobs
              SET status = 'error',
                  error_msg = ?,
                  finished_at = ?
              WHERE job_id = ?
            `, [`Pipeline error: ${err?.message || err}`, new Date().toISOString(), jobId]);

            logger.info(`Job ${jobId} marked as error in DB after pipeline failure`);

            // También actualizar jobManager
            try {
              jobManager.failJob(jobId, `Pipeline error: ${err?.message || err}`);
              logger.info(`Job ${jobId} marked as error in jobManager after pipeline failure`);
            } catch (jmErr) {
              logger.warn(`Failed to mark job as error in jobManager: ${jmErr.message}`);
            }
          } catch (dbErr) {
            logger.error(`Failed to update job ${jobId} error status:`, dbErr);
          }
        });
    });

    return {
      success: true,
      jobId,
      status: 'running',
      message: 'Story processing started'
    };

  } catch (error) {
    logger.error(`startProcess error for ${uploadId}:`, error);
    throw error;
  }
}

/**
 * Pipeline completo de procesamiento
 */
async function runPipeline(jobId, inputPath, workDir, options = {}) {
  try {
    const {
      clipDuration = 5,
      maxClips = 50,
      userId = null,
      uploadId = null,
      videoUrl,
      mode = 'auto',
      clips = [],
      filters = {},
      audio = {},
      cameraMovement = {},
      metadata = {}
    } = options;

    // Usar let para permitir reasignación
    let effects = options.effects || {};
    let overlays = options.overlays || {};

    await updateJobProgress(jobId, 30, 'Analyzing video...');

    // Actualizar también en jobManager
    try {
      jobManager.updateProgress(jobId, 30, 'Analyzing video...');
    } catch (e) {
      logger.warn(`Failed to update jobManager progress: ${e.message}`);
    }

    // === ffmpeg/generación de clips ===
    logger.info(`🎬 Generating clips for ${jobId}...`);
    logger.info(`📋 Mode: ${mode}, Clips to process: ${mode === 'manual' ? clips.length : maxClips}`);

    // Log detallado de los clips recibidos
    if (mode === 'manual' && clips.length > 0) {
      logger.info(`📎 Manual clips received:`, {
        count: clips.length,
        first3: clips.slice(0, 3),
        last: clips[clips.length - 1]
      });
    }

    // Leer efectos de la base de datos si hay uploadId, o usar los efectos del request
    if (uploadId && (!effects || Object.keys(effects).length === 0)) {
      try {
        const effectsService = require('./effects.service');
        const effectsConfig = await effectsService.getEffectsFromDatabase(uploadId);
        effects = effectsConfig.effects || {};

        // FIX: Solo sobrescribir overlays si no vienen del request
        // Los overlays del request tienen prioridad sobre los de la base de datos
        if (!overlays || Object.keys(overlays).length === 0) {
          overlays = effectsConfig.overlays || {};
        }

        logger.info(`Loaded effects for upload ${uploadId}:`, { effects, overlays });
      } catch (error) {
        logger.warn(`Could not load effects for upload ${uploadId}:`, error.message);
      }
    }

    logger.info(`Using effects and overlays:`, { effects, overlays });

    // Log de filtros para debugging
    if (filters && Object.keys(filters).length > 0) {
      logger.info(`Applying filters to clips:`, filters);
    }

    // Determinar qué clips crear según el modo
    let clipsToCreate;
    const totalClipsToProcess = mode === 'manual' ? clips.length : maxClips;

    if (mode === 'manual' && clips.length > 0) {
      logger.info(`📽️ Manual mode: Processing ${clips.length} specific clips`);
      clipsToCreate = await ffmpegHelper.createManualClips(inputPath, workDir, {
        clips,
        quality: 'high',
        filters: filters,
        effects: effects || {},
        overlays: overlays || {},
        audio: audio || {},
        cameraMovement: cameraMovement || {},
        jobId: jobId, // Pasar jobId para actualizar progreso
        // HOTFIX: Pasar filtros por clip para que se apliquen
        body: { filters, effects, overlays, metadata },
        // CRITICAL: Pasar clips con efectos para que normalizeEffects funcione
        clipsWithEffects: clips
      });
    } else {
      logger.info(`Auto mode: Generating clips automatically`);
      clipsToCreate = await ffmpegHelper.createStoryClips(inputPath, workDir, {
        clipDuration,
        maxClips,
        quality: 'high',
        randomOffset: false,
        filters: filters,
        effects: effects || {},
        overlays: overlays || {},
        audio: audio || {},
        cameraMovement: cameraMovement || {},
        // HOTFIX: Pasar filtros por clip para que se apliquen
        body: { filters, effects, overlays, metadata },
        // CRITICAL: Pasar clips con efectos para que normalizeEffects funcione
        clipsWithEffects: clips
      });
    }

    logger.info(`Generated ${clipsToCreate.length} clips for ${jobId}`);
    await updateJobProgress(jobId, 90, 'Exporting clips...');

    // Actualizar también en jobManager
    try {
      jobManager.updateProgress(jobId, 90, 'Exporting clips...');
    } catch (e) {
      logger.warn(`Failed to update jobManager progress: ${e.message}`);
    }

    // === Finalize: mover a OUTPUT_ROOT/{jobId} y construir artifacts ===
    // HOTFIX: Remove .mp4 extension from jobId if it exists (handles legacy uploads)
    const cleanJobId = jobId.replace(/\.mp4$/, '');
    const outDir = path.join(OUTPUT_ROOT, 'uploads', cleanJobId); // Usar subdirectorio uploads
    await fs.ensureDir(outDir);

    const artifacts = [];
    const outputs = []; // Array de outputs para el job

    for (let i = 0; i < clipsToCreate.length; i++) {
      const n = String(i + 1).padStart(3, '0');
      const src = path.join(workDir, `clip_${n}.mp4`);
      const dst = path.join(outDir, `clip_${n}.mp4`);

      if (await fs.pathExists(src)) {
        try {
          await fs.rename(src, dst);
        } catch (renameErr) {
          logger.warn(`Rename failed for clip ${n}, copying...`);
          await fs.copyFile(src, dst);
          await fs.unlink(src).catch(() => {});
        }

        // Asegurar permisos para Nginx
        await fs.chmod(dst, 0o644).catch(() => {});

        // Obtener tamaño del archivo
        const stats = await fs.stat(dst);

        // Calcular duración del clip
        const clipDurationSeconds = mode === 'manual' && clips[i]
          ? clips[i].end - clips[i].start
          : clipDuration;

        artifacts.push({
          id: `clip_${n}`,
          type: 'video',
          filename: `clip_${n}.mp4`,
          url: `${CDN_BASE}/uploads/${cleanJobId}/clip_${n}.mp4`, // URL absoluta con CDN_BASE
          format: 'mp4',
          size: stats.size,
          duration: clipDurationSeconds
        });

        // Agregar al array de outputs
        outputs.push({
          index: i + 1,
          url: `${CDN_BASE}/uploads/${cleanJobId}/clip_${n}.mp4`, // URL absoluta con CDN_BASE
          durationSeconds: clipDurationSeconds,
          size: stats.size
        });
      } else {
        logger.error(`CRITICAL: Clip ${n} not found in workDir: ${src}`);

        // Log contenido del directorio para debugging
        try {
          const files = await fs.readdir(workDir);
          logger.error(`WorkDir contents: ${files.join(', ')}`);
        } catch (e) {
          logger.error(`Could not read workDir: ${e.message}`);
        }
      }
    }

    // Asegurar permisos del output dir
    await fs.chmod(outDir, 0o755).catch(() => {});

    if (artifacts.length === 0) {
      throw new Error('No clips were generated');
    }

    const outputUrls = artifacts.map(a => a.url);

    // Marcar job como completado en DB con progress=100
    await db.run(`
      UPDATE jobs
      SET status = 'done',
          progress = 100,
          error_msg = ?,
          output_urls = ?,
          finished_at = ?
      WHERE job_id = ?
    `, [
      `Job completed successfully - ${artifacts.length} clips generated`,
      JSON.stringify(outputUrls),
      new Date().toISOString(),
      jobId
    ]);

    logger.success(`Job ${jobId} completed with ${artifacts.length} clips`);

    // Actualizar nuestro job store centralizado con outputs
    updateJob(jobId, {
      status: 'done',
      progress: 100,
      outputUrl: outputs[0]?.url || `${CDN_BASE}/uploads/${cleanJobId}/clip_001.mp4`, // URL absoluta con CDN_BASE
      outputs: outputs, // Array completo de outputs
      message: `Procesamiento completado - ${artifacts.length} clips generados`,
      metadata: {
        totalClips: artifacts.length,
        clips: artifacts,
        outputs: outputs  // También en metadata para compatibilidad
      }
    });

    // Actualizar jobManager como completado CON metadata y outputs
    try {
      const metadata = {
        totalClips: artifacts.length,
        clips: artifacts,
        outputs: outputs
      };

      jobManager.completeJob(
        jobId,
        outputUrls[0] || null,  // outputUrl principal
        null,                    // ffmpegCommand
        null,                    // processingTime
        metadata,                // metadata con clips
        outputs                  // array completo de outputs
      );
      logger.info(`Job ${jobId} marked as complete in jobManager with ${artifacts.length} clips`);
    } catch (e) {
      logger.warn(`Failed to complete job in jobManager: ${e.message}`);
    }

    // Limpieza del workDir (best effort) - pero mantener video original si es necesario
    if (uploadId) {
      // Para uploads locales, mantener el video original disponible para reconfiguración
      const originalVideoPath = uploadsRepo.get(uploadId)?.path;
      if (originalVideoPath && await fs.pathExists(originalVideoPath)) {
        logger.info(`✅ Keeping original video available for reconfiguration: ${originalVideoPath}`);
        // Solo limpiar archivos temporales, no el video original
        try {
          const tempFiles = await fs.readdir(workDir);
          let cleanedCount = 0;
          for (const file of tempFiles) {
            if (file !== `source${ext}`) { // Mantener el source.mp4
              await fs.unlink(path.join(workDir, file)).catch(() => {});
              cleanedCount++;
            }
          }
          logger.info(`🧹 Cleaned ${cleanedCount} temp files, kept source video for ${jobId}`);
        } catch (err) {
          logger.warn(`⚠️ Failed to cleanup temp files for ${jobId}:`, err.message);
        }
      } else {
        // Si no hay video original disponible, limpiar todo
        logger.warn(`⚠️ Original video not found, cleaning entire workDir for ${jobId}`);
        await fs.remove(workDir).catch(err => {
          logger.warn(`⚠️ Failed to cleanup workDir for ${jobId}:`, err.message);
        });
      }
    } else {
      // Para URLs externas, limpiar todo
      logger.info(`🧹 Cleaning workDir for external URL job ${jobId}`);
      await fs.remove(workDir).catch(err => {
        logger.warn(`⚠️ Failed to cleanup workDir for ${jobId}:`, err.message);
      });
    }

    return {
      jobId,
      status: 'done',
      progress: 100,
      artifacts
    };

  } catch (err) {
    logger.error(`[pipeline] error for ${jobId}:`, err?.message || err);

    await db.run(`
      UPDATE jobs
      SET status = 'error',
          error_msg = ?,
          finished_at = ?
      WHERE job_id = ?
    `, [`Processing error: ${err?.message || err}`, new Date().toISOString(), jobId]);

    // Actualizar nuestro job store centralizado
    updateJob(jobId, {
      status: 'error',
      errorMessage: err?.message || 'Error en procesamiento'
    });

    // Actualizar jobManager como error
    try {
      jobManager.failJob(jobId, `Processing error: ${err?.message || err}`);
      logger.info(`Job ${jobId} marked as error in jobManager`);
    } catch (e) {
      logger.warn(`Failed to mark job as error in jobManager: ${e.message}`);
    }

    throw err;
  }
}

/**
 * Crear job en DB
 */
async function createJob({ jobId, userId = null, path = 'api', source = 'user', status = 'queued', progress = 0, message = null, inputJson = null }) {
  await db.run(`
    INSERT INTO jobs (job_id, user_id, path, source, status, progress, error_msg, input_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [jobId, userId, path, source, status, progress, message, inputJson, new Date().toISOString()]);

  logger.info(`Job ${jobId} created with status: ${status}, progress: ${progress}`);
}

/**
 * Actualizar progreso del job
 */
async function updateJobProgress(jobId, progress, message = null) {
  await db.run(`
    UPDATE jobs
    SET progress = ?,
        error_msg = ?
    WHERE job_id = ?
  `, [progress, message, jobId]);

  logger.info(`Job ${jobId} progress: ${progress}% - ${message || ''}`);

  // Actualizar nuestro job store centralizado
  updateJob(jobId, {
    status: 'processing',
    progress: progress,
    message: message || 'Procesando...'
  });

  // También actualizar en jobManager para que esté disponible en /api/jobs/:jobId/status
  try {
    jobManager.updateProgress(jobId, progress, message);
  } catch (e) {
    // No fallar si jobManager no tiene el job (puede ser de una ejecución anterior)
    logger.debug(`JobManager update skipped: ${e.message}`);
  }
}

/**
 * Obtener status del job desde DB + verificar archivos físicos
 */
async function getJobStatus(jobId) {
  const job = await db.get(`
    SELECT job_id, status, progress, error_msg as message, output_urls, created_at, finished_at
    FROM jobs
    WHERE job_id = ?
  `, [jobId]);

  if (!job) {
    return null;
  }

  // Parsear output_urls si existe
  let artifacts = [];
  if (job.output_urls) {
    try {
      const urls = JSON.parse(job.output_urls);
      artifacts = urls.map((url, idx) => ({
        id: `clip_${String(idx + 1).padStart(3, '0')}`,
        url,
        type: 'video',
        format: 'mp4'
      }));
    } catch (e) {
      logger.warn(`Failed to parse output_urls for job ${jobId}:`, e.message);
    }
  }

  // Si el job está completado, verificar físicamente los archivos
  if (job.status === 'done' && artifacts.length === 0) {
    // HOTFIX: Remove .mp4 extension from jobId if it exists
    const cleanJobId = jobId.replace(/\.mp4$/, '');
    const outDir = path.join(OUTPUT_ROOT, 'uploads', cleanJobId); // Check uploads subdirectory

    if (await fs.pathExists(outDir)) {
      try {
        const files = await fs.readdir(outDir);
        const clipFiles = files.filter(f => /^clip_\d{3}\.mp4$/.test(f)).sort();

        artifacts = await Promise.all(clipFiles.map(async (filename, idx) => {
          const filePath = path.join(outDir, filename);
          const stats = await fs.stat(filePath);

          return {
            id: `clip_${String(idx + 1).padStart(3, '0')}`,
            url: `${CDN_BASE}/uploads/${cleanJobId}/${filename}`, // URL absoluta con CDN_BASE
            type: 'video',
            format: 'mp4',
            filename,
            size: stats.size
          };
        }));

        logger.info(`Found ${artifacts.length} clips in filesystem for job ${jobId}`);
      } catch (e) {
        logger.warn(`Failed to read clips from filesystem for job ${jobId}:`, e.message);
      }
    }
  }

  // Normalizar URLs con Metricool si hay artifacts
  // DESHABILITADO PERMANENTEMENTE: Metricool no está configurado y causa problemas
  // if (artifacts.length > 0) {
  //   try {
  //     logger.info(`Normalizing ${artifacts.length} URLs with Metricool for job ${jobId}`);
  //     artifacts = await metricoolService.normalizeClipUrls(artifacts);
  //     logger.info(`Successfully normalized ${artifacts.length} URLs for job ${jobId}`);
  //   } catch (normalizeError) {
  //     logger.error(`Error normalizing URLs for job ${jobId}, using original URLs:`, normalizeError.message);
  //     // HOTFIX: Asegurar que se mantengan todas las URLs originales
  //     logger.info(`Keeping all ${artifacts.length} original URLs for job ${jobId}`);
  //   }
  // }
  
  // Usar URLs originales directamente (más confiable)
  logger.info(`Using original URLs for ${artifacts.length} artifacts for job ${jobId}`);

  // HOTFIX: Obtener información de filtros aplicados desde input_json
  let filtersApplied = {};
  let effectsApplied = {};
  let overlaysApplied = {};
  
  try {
    const inputData = await db.get(`
      SELECT input_json FROM jobs WHERE job_id = ?
    `, [jobId]);
    
    if (inputData?.input_json) {
      const inputJson = JSON.parse(inputData.input_json);
      filtersApplied = inputJson.filters || {};
      effectsApplied = inputJson.effects || {};
      overlaysApplied = inputJson.overlays || {};
    }
  } catch (e) {
    logger.warn(`Failed to parse input_json for job ${jobId}:`, e.message);
  }

  return {
    id: job.job_id,
    status: job.status,
    progress: job.progress || 0,
    message: job.message || '',
    result: artifacts.length > 0 ? { artifacts } : null,
    outputs: artifacts.length > 0 ? artifacts.map(a => a.normalizedUrl || a.url) : null,
    totalClips: artifacts.length,
    createdAt: job.created_at,
    finishedAt: job.finished_at,
    // HOTFIX: Incluir información de filtros aplicados
    filters: {
      applied: filtersApplied,
      effects: effectsApplied,
      overlays: overlaysApplied
    }
  };
}

module.exports = {
  startProcess,
  getJobStatus,
  createJob,
  updateJobProgress
};
