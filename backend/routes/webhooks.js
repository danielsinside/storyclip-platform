const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const storyService = require('../services/story.service');
const { authenticateWebhook } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/error');

// Webhook para recibir notificaciones de Supabase/Edge
router.post('/vps', authenticateWebhook, asyncHandler(async (req, res) => {
  const { jobId, status, progress, outputs, error } = req.body;

  logger.info(`Received webhook for job: ${jobId}, status: ${status}`);

  // Validar datos requeridos
  if (!jobId) {
    throw new ValidationError('jobId is required');
  }

  if (!status || !['completed', 'failed', 'processing'].includes(status)) {
    throw new ValidationError('status must be: completed, failed, or processing');
  }

  try {
    // Buscar story por jobId
    const story = storyService.getStoryByJobId(jobId);
    
    if (!story) {
      throw new NotFoundError(`Story with jobId ${jobId} not found`);
    }

    // Actualizar story según el status
    switch (status) {
      case 'processing':
        storyService.updateStoryByJobId(jobId, {
          status: 'processing',
          progress: progress || 0,
          error: null
        });
        logger.info(`Story ${story.id} marked as processing`);
        break;

      case 'completed':
        if (!outputs || !Array.isArray(outputs)) {
          throw new ValidationError('outputs array is required for completed status');
        }

        storyService.updateStoryByJobId(jobId, {
          status: 'completed',
          progress: 100,
          outputs: outputs,
          error: null
        });
        logger.success(`Story ${story.id} marked as completed with ${outputs.length} outputs`);
        break;

      case 'failed':
        storyService.updateStoryByJobId(jobId, {
          status: 'failed',
          progress: 0,
          error: error || 'Processing failed'
        });
        logger.error(`Story ${story.id} marked as failed: ${error}`);
        break;

      default:
        throw new ValidationError(`Invalid status: ${status}`);
    }

    // Respuesta exitosa
    res.json({
      success: true,
      message: `Story ${story.id} updated successfully`,
      storyId: story.id,
      jobId: jobId,
      status: status
    });

  } catch (error) {
    logger.error(`Error processing webhook for job ${jobId}:`, error.message);
    
    // Si es un error de validación o not found, devolver 400
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code || 'VALIDATION_ERROR'
      });
    }

    // Para otros errores, devolver 500
    throw error;
  }
}));

// Webhook de prueba (sin autenticación para testing)
router.post('/test', asyncHandler(async (req, res) => {
  const { jobId, status, progress, outputs, error } = req.body;

  logger.info(`Test webhook received for job: ${jobId}, status: ${status}`);

  // Simular procesamiento
  await new Promise(resolve => setTimeout(resolve, 1000));

  res.json({
    success: true,
    message: 'Test webhook processed successfully',
    received: {
      jobId,
      status,
      progress,
      outputs: outputs ? outputs.length : 0,
      error
    },
    timestamp: new Date().toISOString()
  });
}));

// Webhook para notificaciones de estado (opcional)
router.post('/status', authenticateWebhook, asyncHandler(async (req, res) => {
  const { jobId, progress, message } = req.body;

  if (!jobId) {
    throw new ValidationError('jobId is required');
  }

  try {
    const story = storyService.getStoryByJobId(jobId);
    
    // Actualizar solo el progreso
    storyService.updateProgress(jobId, progress || 0);

    logger.info(`Progress updated for job ${jobId}: ${progress}% - ${message || ''}`);

    res.json({
      success: true,
      message: 'Progress updated successfully',
      jobId: jobId,
      progress: progress
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: `Job ${jobId} not found`,
        code: 'JOB_NOT_FOUND'
      });
    }
    throw error;
  }
}));

// Webhook para agregar outputs individuales
router.post('/output', authenticateWebhook, asyncHandler(async (req, res) => {
  const { jobId, output } = req.body;

  if (!jobId) {
    throw new ValidationError('jobId is required');
  }

  if (!output) {
    throw new ValidationError('output is required');
  }

  try {
    const story = storyService.getStoryByJobId(jobId);
    
    // Agregar output al story
    storyService.addOutput(jobId, output);

    logger.info(`Output added for job ${jobId}: ${output.type}`);

    res.json({
      success: true,
      message: 'Output added successfully',
      jobId: jobId,
      output: output
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: `Job ${jobId} not found`,
        code: 'JOB_NOT_FOUND'
      });
    }
    throw error;
  }
}));

// Endpoint para verificar webhook (health check)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webhooks',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /webhooks/vps - Main webhook endpoint',
      'POST /webhooks/test - Test webhook (no auth)',
      'POST /webhooks/status - Progress updates',
      'POST /webhooks/output - Add individual outputs'
    ]
  });
});

module.exports = router;

