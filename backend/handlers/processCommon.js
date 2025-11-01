const jobsService = require('../services/jobs.service');
const processingService = require('../services/processing.service');
const logger = require('../utils/logger');

/**
 * Handler común para todas las vías de procesamiento
 * Centraliza la lógica de jobs, idempotencia y eventos
 */
async function startStandardProcess({
  req,
  res,
  path,
  doProcess
}) {
  const { requestInfo } = req;
  const { userId, source, flowId, idempotencyKey } = requestInfo;

  let job;

  try {
    // Crear o obtener job existente
    job = await jobsService.createOrGetJob({
      idempotencyKey,
      userId,
      path,
      source,
      flowId,
      input: req.body?.options || req.body?.config || {}
    });

    logger.info(`Processing job: ${job.job_id} (path: ${path}, source: ${source})`);

    // Si ya está finalizado, devolver resultado
    if (job.status === 'done') {
      const outputUrls = job.output_urls ? JSON.parse(job.output_urls) : [];
      logger.info(`Job already completed: ${job.job_id}`);
      
      await jobsService.emitJobEvent(job.job_id, {
        status: 'done',
        progress: 100,
        output_urls: outputUrls,
        message: 'Job already completed'
      });

      return res.json({
        job_id: job.job_id,
        status: 'done',
        progress: 100,
        output_urls: outputUrls,
        path: job.path,
        source: job.source
      });
    }

    // Si ya está en progreso, devolver estado actual
    if (job.status === 'running') {
      logger.info(`Job already running: ${job.job_id}`);
      
      await jobsService.emitJobEvent(job.job_id, {
        status: 'running',
        progress: job.progress,
        message: 'Job already in progress'
      });

      return res.json({
        job_id: job.job_id,
        status: 'running',
        progress: job.progress,
        path: job.path,
        source: job.source
      });
    }

    // Emitir evento de cola
    await jobsService.emitJobEvent(job.job_id, {
      status: 'queued',
      progress: 0,
      message: 'Job queued for processing'
    });

    // Marcar como running
    await jobsService.updateJob(job.job_id, {
      status: 'running',
      started_at: new Date().toISOString()
    });

    await jobsService.emitJobEvent(job.job_id, {
      status: 'running',
      progress: 5,
      message: 'Starting processing'
    });

    // Ejecutar procesamiento
    const result = await doProcess(job, req);

    // Actualizar job como completado
    const outputUrls = result.outputUrls || result.outputs || [];
    await jobsService.updateJob(job.job_id, {
      status: 'done',
      progress: 100,
      output_urls: JSON.stringify(outputUrls),
      finished_at: new Date().toISOString()
    });

    // Emitir evento de completado
    await jobsService.emitJobEvent(job.job_id, {
      status: 'done',
      progress: 100,
      output_urls: outputUrls,
      message: 'Processing completed successfully'
    });

    logger.success(`Job completed: ${job.job_id}`);

    return res.json({
      job_id: job.job_id,
      status: 'done',
      progress: 100,
      output_urls: outputUrls,
      path: job.path,
      source: job.source,
      additionalUrls: result.additionalUrls || {}
    });

  } catch (error) {
    logger.error(`Job failed: ${job?.job_id || 'unknown'}`, error.message);

    // Actualizar job como error
    if (job) {
      await jobsService.updateJob(job.job_id, {
        status: 'error',
        error_msg: error.message,
        finished_at: new Date().toISOString()
      });

      // Emitir evento de error
      await jobsService.emitJobEvent(job.job_id, {
        status: 'error',
        error: error.message,
        message: 'Processing failed'
      });
    }

    return res.status(500).json({
      job_id: job?.job_id || null,
      status: 'error',
      error: error.message,
      path: path,
      source: source
    });
  }
}

/**
 * Wrapper para procesamiento de archivos (upload-direct)
 */
async function processFileUpload(job, req) {
  const { input_json } = job;
  const options = input_json ? JSON.parse(input_json) : {};
  
  // Obtener archivo del request
  const file = req.files?.[0] || req.file;
  if (!file) {
    throw new Error('No file provided');
  }

  const { duration, clipCount, clipMode } = req.body;

  // Mapear parámetros del frontend al formato del backend
  const processingOptions = {
    jobId: job.job_id,
    clipDuration: duration || options?.slicing?.clip_duration_seconds || options?.clipDuration || 3,
    maxClips: clipCount || options?.slicing?.clips_total || options?.maxClips || 50,
    clipMode: clipMode || options?.clipMode || 'auto',
    quality: options?.quality || 'high',
    startTime: options?.slicing?.start_time || options?.startTime || 0
  };

  logger.info(`Processing options mapped:`, processingOptions);
  logger.info(`Frontend parameters:`, { duration, clipCount, clipMode });
  logger.info(`Raw options from job:`, options);
  logger.info(`Raw request body:`, req.body);

  // Procesar con el servicio existente
  const result = await processingService.processStoryFromFile(file.path, processingOptions);

  return {
    outputUrls: result.outputs?.map(output => output.path) || [],
    additionalUrls: {
      viewerUrl: `https://story.creatorsflow.app/api/clips/${job.job_id}`,
      jsonUrl: `https://story.creatorsflow.app/api/clips/${job.job_id}/json`,
      clipsIndexUrl: `https://story.creatorsflow.app/api/clips`
    }
  };
}

/**
 * Wrapper para procesamiento de URLs (API REST)
 */
async function processUrlUpload(job, req) {
  const { input_json } = job;
  const options = input_json ? JSON.parse(input_json) : {};
  
  const { videoUrl, duration, clipCount, clipMode } = req.body;
  if (!videoUrl) {
    throw new Error('No video URL provided');
  }

  // Mapear parámetros del frontend al formato del backend
  const processingOptions = {
    jobId: job.job_id,
    clipDuration: duration || options?.slicing?.clip_duration_seconds || options?.clipDuration || 3,
    maxClips: clipCount || options?.slicing?.clips_total || options?.maxClips || 50,
    clipMode: clipMode || options?.clipMode || 'auto',
    quality: options?.quality || 'high',
    startTime: options?.slicing?.start_time || options?.startTime || 0
  };

  logger.info(`Processing options mapped:`, processingOptions);
  logger.info(`Frontend parameters:`, { duration, clipCount, clipMode });

  // Procesar con el servicio existente
  const result = await processingService.processStory(videoUrl, processingOptions);

  return {
    outputUrls: result.outputs?.map(output => output.path) || [],
    additionalUrls: {
      viewerUrl: `https://story.creatorsflow.app/api/clips/${job.job_id}`,
      jsonUrl: `https://story.creatorsflow.app/api/clips/${job.job_id}/json`,
      clipsIndexUrl: `https://story.creatorsflow.app/api/clips`
    }
  };
}

/**
 * Handler para polling de estado de job
 */
async function getJobStatus(req, res) {
  try {
    const { jobId } = req.params;
    const job = await jobsService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found',
        job_id: jobId
      });
    }

    const outputUrls = job.output_urls ? JSON.parse(job.output_urls) : [];

    res.json({
      job_id: job.job_id,
      status: job.status,
      progress: job.progress,
      output_urls: outputUrls,
      path: job.path,
      source: job.source,
      created_at: job.created_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
      error_msg: job.error_msg
    });

  } catch (error) {
    logger.error('Error getting job status:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = {
  startStandardProcess,
  processFileUpload,
  processUrlUpload,
  getJobStatus
};
