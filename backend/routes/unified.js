const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/error');
const { uploadDirectGuard, requireAuth, extractRequestInfo, requestLogger } = require('../middleware/uploadDirectGuard');
const { startStandardProcess, processFileUpload, processUrlUpload, getJobStatus } = require('../handlers/processCommon');
const jobsService = require('../services/jobs.service');

// Multer para upload-direct
const multer = require('multer');
const upload = multer({ 
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
    files: 1,
    fieldSize: 10 * 1024 * 1024 * 1024, // 10GB para campos
    fieldNameSize: 1000,
    fields: 10
  }
});

// Middleware flexible que acepta cualquier campo de archivo
const flexibleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      logger.error('Upload error:', err);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      });
    }
    next();
  });
};

// Middleware común para todas las rutas
router.use(requestLogger);
router.use(extractRequestInfo);

// 1. API REST principal (con autenticación)
router.post('/v1/process', requireAuth, asyncHandler(async (req, res) => {
  return startStandardProcess({
    req,
    res,
    path: 'api',
    doProcess: processUrlUpload
  });
}));

// 2. API Simple (con autenticación)
router.post('/process-simple', requireAuth, asyncHandler(async (req, res) => {
  return startStandardProcess({
    req,
    res,
    path: 'simple',
    doProcess: processUrlUpload
  });
}));

// 3. Upload-direct (solo test/dev, con protección)
router.post('/videos/upload-direct', flexibleUpload, uploadDirectGuard, asyncHandler(async (req, res) => {
  // Log estructurado para observabilidad
  const idempotencyKey = req.get('Idempotency-Key');
  const flowId = req.get('X-Flow-Id');
  
  logger.debug('Upload-direct request', {
    idempotencyKey: idempotencyKey ? `${idempotencyKey.substring(0, 8)}...` : 'none',
    flowId: flowId || 'none',
    hasFile: !!req.files?.length,
    fileSize: req.files?.[0]?.size || 0
  });
  
  return startStandardProcess({
    req,
    res,
    path: 'upload-direct',
    doProcess: processFileUpload
  });
}));

// 4. Endpoint de polling estándar
router.get('/clips/:jobId/json', asyncHandler(async (req, res) => {
  return getJobStatus(req, res);
}));

// 5. Endpoint de estadísticas de jobs
router.get('/jobs/stats', requireAuth, asyncHandler(async (req, res) => {
  try {
    const stats = await jobsService.getJobStats();
    res.json({
      success: true,
      stats,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting job stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// 6. Endpoint para obtener jobs por usuario
router.get('/jobs/user/:userId', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const jobs = await jobsService.getJobsByUser(userId, parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      jobs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: jobs.length
      }
    });
  } catch (error) {
    logger.error('Error getting user jobs:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// 7. Endpoint para obtener jobs por estado
router.get('/jobs/status/:status', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { status } = req.params;
    const { limit = 100 } = req.query;
    
    const jobs = await jobsService.getJobsByStatus(status, parseInt(limit));
    
    res.json({
      success: true,
      jobs,
      status,
      count: jobs.length
    });
  } catch (error) {
    logger.error('Error getting jobs by status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// 8. Endpoint para limpiar jobs antiguos
router.post('/jobs/cleanup', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { maxAgeDays = 30 } = req.body;
    
    const cleanedCount = await jobsService.cleanupOldJobs(maxAgeDays);
    
    res.json({
      success: true,
      cleaned_count: cleanedCount,
      max_age_days: maxAgeDays,
      message: `Cleaned up ${cleanedCount} old jobs`
    });
  } catch (error) {
    logger.error('Error cleaning up jobs:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// 9. Endpoint de salud del sistema unificado
router.get('/health/unified', asyncHandler(async (req, res) => {
  try {
    const stats = await jobsService.getJobStats();
    const recentJobs = await jobsService.getJobsByStatus('running', 5);
    
    res.json({
      success: true,
      status: 'healthy',
      system: {
        unified_processing: true,
        realtime_enabled: process.env.REALTIME_ENABLED === 'true',
        upload_direct_enabled: process.env.ALLOW_UPLOAD_DIRECT_TEST === 'true',
        auth_required: process.env.REQUIRE_AUTH === 'true'
      },
      stats: {
        total_jobs: stats.reduce((sum, stat) => sum + stat.count, 0),
        by_path: stats.reduce((acc, stat) => {
          acc[stat.path] = (acc[stat.path] || 0) + stat.count;
          return acc;
        }, {}),
        by_source: stats.reduce((acc, stat) => {
          acc[stat.source] = (acc[stat.source] || 0) + stat.count;
          return acc;
        }, {})
      },
      recent_activity: {
        running_jobs: recentJobs.length,
        jobs: recentJobs.map(job => ({
          job_id: job.job_id,
          path: job.path,
          source: job.source,
          progress: job.progress,
          started_at: job.started_at
        }))
      },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting unified health:', error.message);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
}));

module.exports = router;
