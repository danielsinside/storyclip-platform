const Queue = require('bull');
const logger = require('../utils/logger');
const processingService = require('./processing.service');

class QueueService {
  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;
    
    // Crear colas
    this.storyQueue = new Queue('story processing', this.redisUrl);
    this.reelQueue = new Queue('reel processing', this.redisUrl);
    this.imageQueue = new Queue('image processing', this.redisUrl);

    this.setupQueues();
  }

  setupQueues() {
    // Configurar procesadores de cola
    this.storyQueue.process('process-story', this.maxConcurrentJobs, async (job) => {
      return await this.processStoryJob(job);
    });

    this.reelQueue.process('process-reel', this.maxConcurrentJobs, async (job) => {
      return await this.processReelJob(job);
    });

    this.imageQueue.process('process-image', this.maxConcurrentJobs, async (job) => {
      return await this.processImageJob(job);
    });

    // Eventos de la cola de stories
    this.storyQueue.on('completed', (job, result) => {
      logger.success(`Story job completed: ${job.id}`);
    });

    this.storyQueue.on('failed', (job, err) => {
      logger.error(`Story job failed: ${job.id}`, err.message);
    });

    this.storyQueue.on('progress', (job, progress) => {
      logger.info(`Story job progress: ${job.id} - ${progress}%`);
    });

    // Eventos de la cola de reels
    this.reelQueue.on('completed', (job, result) => {
      logger.success(`Reel job completed: ${job.id}`);
    });

    this.reelQueue.on('failed', (job, err) => {
      logger.error(`Reel job failed: ${job.id}`, err.message);
    });

    // Eventos de la cola de imágenes
    this.imageQueue.on('completed', (job, result) => {
      logger.success(`Image job completed: ${job.id}`);
    });

    this.imageQueue.on('failed', (job, err) => {
      logger.error(`Image job failed: ${job.id}`, err.message);
    });

    logger.info('Queue service initialized with Redis:', this.redisUrl);
  }

  // Procesar job de story
  async processStoryJob(job) {
    const { jobId, videoUrl, options = {} } = job.data;
    
    try {
      logger.info(`Starting story processing job: ${jobId}`);
      
      // Actualizar progreso
      await job.progress(10);
      
      // Procesar el video
      const result = await processingService.processStory(videoUrl, options, (progress) => {
        job.progress(10 + (progress * 0.8)); // 10-90%
      });
      
      // Completar
      await job.progress(100);
      
      logger.success(`Story processing completed: ${jobId}`);
      return result;
      
    } catch (error) {
      logger.error(`Story processing failed: ${jobId}`, error.message);
      throw error;
    }
  }

  // Procesar job de reel
  async processReelJob(job) {
    const { jobId, videoUrl, options = {} } = job.data;
    
    try {
      logger.info(`Starting reel processing job: ${jobId}`);
      
      await job.progress(10);
      
      const result = await processingService.processReel(videoUrl, options, (progress) => {
        job.progress(10 + (progress * 0.8));
      });
      
      await job.progress(100);
      
      logger.success(`Reel processing completed: ${jobId}`);
      return result;
      
    } catch (error) {
      logger.error(`Reel processing failed: ${jobId}`, error.message);
      throw error;
    }
  }

  // Procesar job de imagen
  async processImageJob(job) {
    const { jobId, imageUrl, options = {} } = job.data;
    
    try {
      logger.info(`Starting image processing job: ${jobId}`);
      
      await job.progress(10);
      
      const result = await processingService.processImage(imageUrl, options, (progress) => {
        job.progress(10 + (progress * 0.8));
      });
      
      await job.progress(100);
      
      logger.success(`Image processing completed: ${jobId}`);
      return result;
      
    } catch (error) {
      logger.error(`Image processing failed: ${jobId}`, error.message);
      throw error;
    }
  }

  // Agregar job de story a la cola
  async addStoryJob(jobId, videoUrl, options = {}) {
    const job = await this.storyQueue.add('process-story', {
      jobId,
      videoUrl,
      options
    }, {
      jobId: jobId, // usar jobId personalizado
      removeOnComplete: 10, // mantener solo 10 jobs completados
      removeOnFail: 5, // mantener solo 5 jobs fallidos
      attempts: 3, // reintentar hasta 3 veces
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info(`Story job added to queue: ${jobId} (Bull job: ${job.id})`);
    return job;
  }

  // Agregar job de reel a la cola
  async addReelJob(jobId, videoUrl, options = {}) {
    const job = await this.reelQueue.add('process-reel', {
      jobId,
      videoUrl,
      options
    }, {
      jobId: jobId,
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info(`Reel job added to queue: ${jobId} (Bull job: ${job.id})`);
    return job;
  }

  // Agregar job de imagen a la cola
  async addImageJob(jobId, imageUrl, options = {}) {
    const job = await this.imageQueue.add('process-image', {
      jobId,
      imageUrl,
      options
    }, {
      jobId: jobId,
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info(`Image job added to queue: ${jobId} (Bull job: ${job.id})`);
    return job;
  }

  // Obtener estado de un job
  async getJobStatus(jobId, queueType = 'story') {
    const queue = this.getQueue(queueType);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();
    
    return {
      id: job.id,
      jobId: jobId,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null
    };
  }

  // Obtener cola por tipo
  getQueue(queueType) {
    switch (queueType) {
      case 'story':
        return this.storyQueue;
      case 'reel':
        return this.reelQueue;
      case 'image':
        return this.imageQueue;
      default:
        throw new Error(`Unknown queue type: ${queueType}`);
    }
  }

  // Obtener estadísticas de todas las colas
  async getQueueStats() {
    const [storyStats, reelStats, imageStats] = await Promise.all([
      this.getQueueStatsForQueue(this.storyQueue, 'story'),
      this.getQueueStatsForQueue(this.reelQueue, 'reel'),
      this.getQueueStatsForQueue(this.imageQueue, 'image')
    ]);

    return {
      story: storyStats,
      reel: reelStats,
      image: imageStats,
      total: {
        waiting: storyStats.waiting + reelStats.waiting + imageStats.waiting,
        active: storyStats.active + reelStats.active + imageStats.active,
        completed: storyStats.completed + reelStats.completed + imageStats.completed,
        failed: storyStats.failed + reelStats.failed + imageStats.failed
      }
    };
  }

  // Obtener estadísticas de una cola específica
  async getQueueStatsForQueue(queue, name) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ]);

    return {
      name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  // Limpiar colas
  async cleanQueues() {
    await Promise.all([
      this.storyQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 horas
      this.storyQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'), // 7 días
      this.reelQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.reelQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
      this.imageQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.imageQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed')
    ]);

    logger.info('Queues cleaned successfully');
  }

  // Cerrar conexiones
  async close() {
    await Promise.all([
      this.storyQueue.close(),
      this.reelQueue.close(),
      this.imageQueue.close()
    ]);

    logger.info('Queue service closed');
  }
}

module.exports = new QueueService();

