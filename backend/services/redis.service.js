/**
 * Servicio Redis para batch publishing
 * Maneja el estado de los jobs de publicación masiva
 */

const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Crear un nuevo batch
   */
  async createBatch(items, options = {}) {
    const batchId = uuidv4();
    const initialState = {
      batchId,
      items: items || [],
      status: 'queued',
      progress: 0,
      completed: 0,
      failed: 0,
      total: items ? items.length : 0,
      results: [],
      errors: [],
      createdAt: new Date().toISOString(),
      etaSec: options.etaSec || 300, // 5 minutos por defecto
      ttl: options.ttl || 7200 // 2 horas por defecto
    };

    try {
      await this.client.setEx(
        `batch:${batchId}`, 
        initialState.ttl, 
        JSON.stringify(initialState)
      );
      
      logger.info(`Batch created: ${batchId} with ${initialState.total} items`);
      return batchId;
    } catch (error) {
      logger.error('Failed to create batch:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de un batch
   */
  async getBatchStatus(batchId) {
    try {
      const raw = await this.client.get(`batch:${batchId}`);
      if (!raw) {
        return null;
      }
      
      const batch = JSON.parse(raw);
      return batch;
    } catch (error) {
      logger.error('Failed to get batch status:', error);
      return null;
    }
  }

  /**
   * Actualizar estado de un batch
   */
  async updateBatchStatus(batchId, updates) {
    try {
      const current = await this.getBatchStatus(batchId);
      if (!current) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const updated = {
        ...current,
        ...updates,
        lastUpdated: new Date().toISOString()
      };

      await this.client.setEx(
        `batch:${batchId}`, 
        updated.ttl, 
        JSON.stringify(updated)
      );

      logger.info(`Batch updated: ${batchId}`, updates);
      return updated;
    } catch (error) {
      logger.error('Failed to update batch status:', error);
      throw error;
    }
  }

  /**
   * Agregar resultado a un batch
   */
  async addBatchResult(batchId, result) {
    try {
      const current = await this.getBatchStatus(batchId);
      if (!current) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const updated = {
        ...current,
        results: [...current.results, result],
        completed: current.completed + 1,
        progress: Math.round(((current.completed + 1) / current.total) * 100)
      };

      // Si todos los items están completados
      if (updated.completed >= updated.total) {
        updated.status = 'completed';
        updated.done = true;
      }

      await this.client.setEx(
        `batch:${batchId}`, 
        updated.ttl, 
        JSON.stringify(updated)
      );

      return updated;
    } catch (error) {
      logger.error('Failed to add batch result:', error);
      throw error;
    }
  }

  /**
   * Agregar error a un batch
   */
  async addBatchError(batchId, error) {
    try {
      const current = await this.getBatchStatus(batchId);
      if (!current) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const updated = {
        ...current,
        errors: [...current.errors, error],
        failed: current.failed + 1,
        completed: current.completed + 1,
        progress: Math.round(((current.completed + 1) / current.total) * 100)
      };

      // Si todos los items están procesados (completados o fallidos)
      if (updated.completed >= updated.total) {
        updated.status = 'completed';
        updated.done = true;
      }

      await this.client.setEx(
        `batch:${batchId}`, 
        updated.ttl, 
        JSON.stringify(updated)
      );

      return updated;
    } catch (error) {
      logger.error('Failed to add batch error:', error);
      throw error;
    }
  }

  /**
   * Eliminar un batch
   */
  async deleteBatch(batchId) {
    try {
      await this.client.del(`batch:${batchId}`);
      logger.info(`Batch deleted: ${batchId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete batch:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de Redis
   */
  async getStats() {
    try {
      const info = await this.client.info('memory');
      const keys = await this.client.keys('batch:*');
      
      return {
        connected: this.isConnected,
        totalBatches: keys.length,
        memoryInfo: info
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      return {
        connected: false,
        totalBatches: 0,
        error: error.message
      };
    }
  }
}

// Crear instancia singleton
const redisService = new RedisService();

// Conectar automáticamente al iniciar
redisService.connect().catch(err => {
  logger.error('Failed to connect to Redis on startup:', err);
});

module.exports = redisService;






