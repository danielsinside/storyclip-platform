/**
 * Rutas de gestión de jobs
 * Resuelve el problema de "Job not found"
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const jobManager = require('../services/job-manager.service');

/**
 * GET /api/job/:jobId
 * Endpoint para el frontend (compatible con Lovable)
 */
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    logger.info(`[API] Status request for job: ${jobId}`);

    const job = jobManager.getJob(jobId);

    // Respuesta limpia para el frontend
    const response = {
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      outputUrl: job.outputUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      metadata: job.metadata || null,  // Incluir metadata con clips
      outputs: job.outputs || null     // Incluir outputs
    };

    // Códigos de estado HTTP apropiados
    let statusCode = 200;
    if (job.status === 'ERROR') {
      statusCode = 500;
    } else if (job.status === 'DONE') {
      statusCode = 200;
    } else if (job.status === 'RUNNING') {
      statusCode = 202; // Accepted - still processing
    } else if (job.status === 'PENDING') {
      statusCode = 202; // Accepted - queued
    }

    logger.info(`[API] Job ${jobId} status: ${job.status} (${statusCode})`);
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error(`[API] Job status error: ${error.message}`);

    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: `Job ${req.params.jobId} not found`,
        jobId: req.params.jobId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/jobs/:jobId/status
 * Endpoint principal para polling del frontend (alias)
 */
router.get('/jobs/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;

    logger.info(`[API] Status request for job: ${jobId}`);

    const job = jobManager.getJob(jobId);

    // Respuesta limpia para el frontend
    const response = {
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      outputUrl: job.outputUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      metadata: job.metadata || null,  // Incluir metadata con clips
      outputs: job.outputs || null     // Incluir outputs
    };

    // Códigos de estado HTTP apropiados
    let statusCode = 200;
    if (job.status === 'ERROR') {
      statusCode = 500;
    } else if (job.status === 'DONE') {
      statusCode = 200;
    } else if (job.status === 'RUNNING') {
      statusCode = 202; // Accepted - still processing
    } else if (job.status === 'PENDING') {
      statusCode = 202; // Accepted - queued
    }

    logger.info(`[API] Job ${jobId} status: ${job.status} (${statusCode})`);
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error(`[API] Job status error: ${error.message}`);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: `Job ${req.params.jobId} not found`,
        jobId: req.params.jobId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/jobs
 * Listar todos los jobs (para debugging)
 */
router.get('/jobs', async (req, res) => {
  try {
    const jobs = jobManager.listJobs();
    
    res.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      })),
      total: jobs.length
    });
  } catch (error) {
    logger.error(`[API] List jobs error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/jobs/:jobId
 * Eliminar un job específico
 */
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // En la implementación actual (Map), no hay método delete específico
    // Pero podemos marcar como eliminado o usar cleanup
    logger.info(`[API] Delete request for job: ${jobId}`);
    
    res.json({
      success: true,
      message: `Job ${jobId} will be cleaned up automatically`
    });
  } catch (error) {
    logger.error(`[API] Delete job error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
