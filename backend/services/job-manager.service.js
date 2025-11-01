/**
 * Servicio de gestión de jobs persistente
 * Resuelve el problema de "Job not found"
 */

const logger = require('../utils/logger');

class JobManager {
  constructor() {
    this.jobs = new Map(); // En producción usar Redis o DB
    this.jobCounter = 0;
  }

  /**
   * Crear un nuevo job
   */
  createJob(processBody) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const job = {
      id: jobId,
      status: 'PENDING',
      progress: 0,
      message: 'Job created, waiting for processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      request: processBody,
      outputUrl: null,
      errorMessage: null,
      ffmpegCommand: null,
      processingTime: null,
      metadata: null,  // Agregar soporte para metadata
      outputs: null    // Agregar soporte para múltiples outputs
    };

    this.jobs.set(jobId, job);

    logger.info(`[JOB] Created job ${jobId} with status PENDING`);
    return job;
  }

  /**
   * Actualizar estado del job
   */
  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, updatedJob);
    
    logger.info(`[JOB] Updated job ${jobId}: ${updates.status || 'status changed'} - ${updates.message || 'no message'}`);
    return updatedJob;
  }

  /**
   * Obtener job por ID
   */
  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    return job;
  }

  /**
   * Marcar job como completado
   */
  completeJob(jobId, outputUrl, ffmpegCommand = null, processingTime = null, metadata = null, outputs = null) {
    const updates = {
      status: 'DONE',
      progress: 100,
      message: 'Processing completed successfully',
      outputUrl,
      ffmpegCommand,
      processingTime
    };

    // Agregar metadata si está disponible
    if (metadata) {
      updates.metadata = metadata;
    }

    // Agregar outputs si están disponibles
    if (outputs) {
      updates.outputs = outputs;
    }

    return this.updateJob(jobId, updates);
  }

  /**
   * Marcar job como error
   */
  failJob(jobId, errorMessage) {
    return this.updateJob(jobId, {
      status: 'ERROR',
      progress: 0,
      message: 'Processing failed',
      errorMessage
    });
  }

  /**
   * Marcar job como procesando
   */
  startProcessing(jobId) {
    return this.updateJob(jobId, {
      status: 'RUNNING',
      progress: 10,
      message: 'Processing started'
    });
  }

  /**
   * Actualizar progreso del job
   */
  updateProgress(jobId, progress, message = null) {
    const updates = { progress };
    if (message) updates.message = message;
    return this.updateJob(jobId, updates);
  }

  /**
   * Listar todos los jobs (para debugging)
   */
  listJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Limpiar jobs antiguos (más de 24 horas)
   */
  cleanupOldJobs() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (new Date(job.createdAt) < cutoff) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`[JOB] Cleaned up ${cleaned} old jobs`);
    }
  }
}

// Singleton instance
const jobManager = new JobManager();

// Cleanup cada hora
setInterval(() => {
  jobManager.cleanupOldJobs();
}, 60 * 60 * 1000);

module.exports = jobManager;
