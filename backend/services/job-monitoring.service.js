const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class JobMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.activeJobs = new Map();
    this.outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
    this.tempDir = process.env.TEMP_DIR || '/srv/storyclip/tmp';
    this.monitoringInterval = 2000; // 2 segundos
    this.isMonitoring = false;
    this.monitoringTimer = null;
  }

  /**
   * Iniciar monitoreo de jobs activos
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Job monitoring already started');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting job monitoring service...');

    this.monitoringTimer = setInterval(() => {
      this.checkActiveJobs();
    }, this.monitoringInterval);

    logger.info('Job monitoring service started');
  }

  /**
   * Detener monitoreo de jobs
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    logger.info('Job monitoring service stopped');
  }

  /**
   * Registrar un job para monitoreo
   */
  registerJob(jobId, options = {}) {
    const jobInfo = {
      jobId,
      status: 'queued',
      progress: 0,
      message: 'Job queued for processing',
      startTime: Date.now(),
      lastUpdate: Date.now(),
      options,
      outputDir: path.join(this.outputDir, jobId),
      tempDir: path.join(this.tempDir, jobId)
    };

    this.activeJobs.set(jobId, jobInfo);
    logger.info(`Job ${jobId} registered for monitoring`);

    // Emitir evento de job registrado
    this.emit('jobRegistered', jobInfo);

    return jobInfo;
  }

  /**
   * Actualizar estado de un job
   */
  updateJobStatus(jobId, status, progress = null, message = null) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      logger.warn(`Job ${jobId} not found in active jobs`);
      return;
    }

    const oldStatus = job.status;
    const oldProgress = job.progress;

    job.status = status;
    job.lastUpdate = Date.now();

    if (progress !== null) {
      job.progress = Math.max(0, Math.min(100, progress));
    }

    if (message) {
      job.message = message;
    }

    // Emitir evento de actualización
    this.emit('jobUpdated', {
      jobId,
      status,
      progress: job.progress,
      message: job.message,
      oldStatus,
      oldProgress,
      duration: Date.now() - job.startTime
    });

    logger.info(`Job ${jobId} status updated: ${status} (${job.progress}%) - ${message || ''}`);

    // Si el job está completado o falló, removerlo del monitoreo activo
    if (status === 'completed' || status === 'failed' || status === 'done') {
      this.unregisterJob(jobId);
    }
  }

  /**
   * Desregistrar un job del monitoreo
   */
  unregisterJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.endTime = Date.now();
      job.duration = job.endTime - job.startTime;

      this.activeJobs.delete(jobId);
      logger.info(`Job ${jobId} unregistered from monitoring (duration: ${job.duration}ms)`);

      // Emitir evento de job completado
      this.emit('jobCompleted', job);
    }
  }

  /**
   * Obtener estado de un job
   */
  getJobStatus(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      startTime: job.startTime,
      lastUpdate: job.lastUpdate,
      duration: Date.now() - job.startTime,
      options: job.options
    };
  }

  /**
   * Obtener todos los jobs activos
   */
  getActiveJobs() {
    return Array.from(this.activeJobs.values()).map(job => ({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      startTime: job.startTime,
      lastUpdate: job.lastUpdate,
      duration: Date.now() - job.startTime
    }));
  }

  /**
   * Verificar jobs activos
   */
  async checkActiveJobs() {
    if (this.activeJobs.size === 0) {
      return;
    }

    for (const [jobId, job] of this.activeJobs) {
      try {
        await this.checkJobProgress(jobId, job);
      } catch (error) {
        logger.error(`Error checking job ${jobId}:`, error);
        this.updateJobStatus(jobId, 'failed', null, `Monitoring error: ${error.message}`);
      }
    }
  }

  /**
   * Verificar progreso de un job específico
   */
  async checkJobProgress(jobId, job) {
    const { outputDir, tempDir } = job;

    // Verificar si el directorio de salida existe
    const outputExists = await fs.pathExists(outputDir);
    const tempExists = await fs.pathExists(tempDir);

    if (!outputExists && !tempExists) {
      // Job aún no ha comenzado
      if (job.status === 'queued') {
        this.updateJobStatus(jobId, 'processing', 10, 'Starting video processing...');
      }
      return;
    }

    // Verificar archivos de salida
    if (outputExists) {
      const files = await fs.readdir(outputDir);
      const clipFiles = files.filter(f => /^clip_\d{3}\.mp4$/.test(f));
      
      if (clipFiles.length > 0) {
        // Archivos de salida encontrados
        const progress = Math.min(90, 50 + (clipFiles.length * 10));
        this.updateJobStatus(jobId, 'processing', progress, `Generated ${clipFiles.length} clips`);
        
        // Verificar si el procesamiento está completo
        if (await this.isJobComplete(jobId, outputDir)) {
          this.updateJobStatus(jobId, 'completed', 100, 'Video processing completed');
        }
      }
    }

    // Verificar archivos temporales
    if (tempExists && job.status === 'processing') {
      const tempFiles = await fs.readdir(tempDir);
      const processingFiles = tempFiles.filter(f => f.endsWith('.mp4') || f.endsWith('.tmp'));
      
      if (processingFiles.length > 0) {
        const progress = Math.min(80, 20 + (processingFiles.length * 15));
        this.updateJobStatus(jobId, 'processing', progress, 'Processing video files...');
      }
    }

    // Verificar si el job ha estado inactivo por mucho tiempo
    const inactiveTime = Date.now() - job.lastUpdate;
    if (inactiveTime > 300000) { // 5 minutos
      this.updateJobStatus(jobId, 'failed', null, 'Job timeout - no activity detected');
    }
  }

  /**
   * Verificar si un job está completo
   */
  async isJobComplete(jobId, outputDir) {
    try {
      const files = await fs.readdir(outputDir);
      const clipFiles = files.filter(f => /^clip_\d{3}\.mp4$/.test(f));
      
      if (clipFiles.length === 0) {
        return false;
      }

      // Verificar que los archivos no estén siendo escritos
      for (const file of clipFiles) {
        const filePath = path.join(outputDir, file);
        const stats = await fs.stat(filePath);
        const now = Date.now();
        const fileAge = now - stats.mtime.getTime();
        
        // Si el archivo fue modificado en los últimos 10 segundos, aún se está escribiendo
        if (fileAge < 10000) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(`Error checking job completion for ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Obtener estadísticas del monitoreo
   */
  getStats() {
    const jobs = Array.from(this.activeJobs.values());
    const statusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalActiveJobs: jobs.length,
      statusCounts,
      monitoringActive: this.isMonitoring,
      averageProgress: jobs.length > 0 ? 
        jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length : 0
    };
  }

  /**
   * Limpiar jobs antiguos
   */
  cleanupOldJobs() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [jobId, job] of this.activeJobs) {
      if (now - job.startTime > maxAge) {
        this.unregisterJob(jobId);
        logger.info(`Cleaned up old job: ${jobId}`);
      }
    }
  }
}

// Crear instancia singleton
const jobMonitoringService = new JobMonitoringService();

// Iniciar monitoreo automáticamente
jobMonitoringService.startMonitoring();

// Limpiar jobs antiguos cada hora
setInterval(() => {
  jobMonitoringService.cleanupOldJobs();
}, 60 * 60 * 1000);

module.exports = jobMonitoringService;









