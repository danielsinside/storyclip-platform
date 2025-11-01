const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const logger = require('../utils/logger');

class JobsService {
  constructor() {
    this.realtimeEnabled = process.env.REALTIME_ENABLED === 'true';
  }

  // Crear o obtener job existente (idempotencia)
  async createOrGetJob({ idempotencyKey, userId, path, source = 'user', flowId, input }) {
    try {
      // Buscar job existente
      const existing = await db.get(
        'SELECT * FROM jobs WHERE idempotency_key = ?',
        [idempotencyKey]
      );

      if (existing) {
        logger.info(`Found existing job: ${existing.job_id} for key: ${idempotencyKey}`);
        return existing;
      }

      // Crear nuevo job
      const jobId = uuidv4();
      const inputJson = input ? JSON.stringify(input) : '{}';

      await db.run(
        `INSERT INTO jobs (
          job_id, user_id, path, source, idempotency_key, flow_id, 
          status, progress, input_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [jobId, userId, path, source, idempotencyKey, flowId, 'queued', 0, inputJson, new Date().toISOString()]
      );

      const newJob = await db.get('SELECT * FROM jobs WHERE job_id = ?', [jobId]);
      logger.info(`Created new job: ${jobId} for key: ${idempotencyKey}`);
      
      return newJob;
    } catch (error) {
      logger.error('Error creating/getting job:', error.message);
      throw error;
    }
  }

  // Actualizar job
  async updateJob(jobId, patch) {
    try {
      const fields = [];
      const values = [];

      // Construir query dinámicamente
      Object.keys(patch).forEach(key => {
        if (patch[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(patch[key]);
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(jobId);

      await db.run(
        `UPDATE jobs SET ${fields.join(', ')} WHERE job_id = ?`,
        values
      );

      const updatedJob = await db.get('SELECT * FROM jobs WHERE job_id = ?', [jobId]);
      logger.info(`Updated job: ${jobId}`);
      
      return updatedJob;
    } catch (error) {
      logger.error('Error updating job:', error.message);
      throw error;
    }
  }

  // Obtener job por ID
  async getJob(jobId) {
    try {
      const job = await db.get('SELECT * FROM jobs WHERE job_id = ?', [jobId]);
      return job;
    } catch (error) {
      logger.error('Error getting job:', error.message);
      throw error;
    }
  }

  // Emitir evento de job (simulado para ahora, se puede conectar a WebSockets/SSE)
  async emitJobEvent(jobId, payload) {
    if (!this.realtimeEnabled) {
      logger.debug(`Realtime disabled, skipping event for job: ${jobId}`);
      return;
    }

    try {
      // Por ahora solo logueamos, pero aquí se puede conectar a:
      // - WebSockets
      // - Server-Sent Events
      // - Supabase Realtime
      // - Redis Pub/Sub
      
      logger.info(`Job Event [${jobId}]:`, payload);
      
      // Ejemplo de implementación con WebSockets:
      // if (this.io) {
      //   this.io.to(`job:${jobId}`).emit('job_update', payload);
      // }
      
    } catch (error) {
      logger.error('Error emitting job event:', error.message);
      // No lanzar error para no interrumpir el procesamiento principal
    }
  }

  // Obtener estadísticas de jobs
  async getJobStats() {
    try {
      const stats = await db.query(`
        SELECT 
          path,
          source,
          status,
          COUNT(*) as count,
          AVG(progress) as avg_progress,
          MIN(created_at) as first_job,
          MAX(created_at) as last_job
        FROM jobs 
        GROUP BY path, source, status
        ORDER BY last_job DESC
      `);
      
      return stats;
    } catch (error) {
      logger.error('Error getting job stats:', error.message);
      throw error;
    }
  }

  // Limpiar jobs antiguos
  async cleanupOldJobs(maxAgeDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      
      const result = await db.run(
        'DELETE FROM jobs WHERE created_at < ? AND status IN (?, ?)',
        [cutoffDate.toISOString(), 'done', 'error']
      );
      
      logger.info(`Cleaned up ${result.changes} old jobs`);
      return result.changes;
    } catch (error) {
      logger.error('Error cleaning up old jobs:', error.message);
      throw error;
    }
  }

  // Obtener jobs por usuario
  async getJobsByUser(userId, limit = 50, offset = 0) {
    try {
      const jobs = await db.query(
        'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );
      
      return jobs;
    } catch (error) {
      logger.error('Error getting jobs by user:', error.message);
      throw error;
    }
  }

  // Obtener jobs por estado
  async getJobsByStatus(status, limit = 100) {
    try {
      const jobs = await db.query(
        'SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?',
        [status, limit]
      );
      
      return jobs;
    } catch (error) {
      logger.error('Error getting jobs by status:', error.message);
      throw error;
    }
  }
}

module.exports = new JobsService();
