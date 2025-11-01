const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const logger = require('../utils/logger');
const processingService = require('../services/processing.service');
const downloadService = require('../services/download.service');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/error');

// Configurar multer para subir videos
const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../tmp/uploads');
      await fs.ensureDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB límite
    files: 1,
    fieldSize: 10 * 1024 * 1024 * 1024, // 10GB
    fieldNameSize: 1000,
    fields: 100
  }
});

/**
 * POST /api/process
 * Procesa un video desde URL o archivo subido
 * Compatible con el frontend storyclip-tester-optimized
 */
router.post('/process', uploadMiddleware.single('videoFile'), asyncHandler(async (req, res) => {
  try {
    const {
      videoUrl,
      distribution,
      filters,
      flip,
      overlay,
      callbackUrl
    } = req.body;
    
    // Parsear JSON strings
    const distributionConfig = typeof distribution === 'string' ? JSON.parse(distribution) : distribution;
    const filtersConfig = typeof filters === 'string' ? JSON.parse(filters) : filters;
    const flipConfig = typeof flip === 'string' ? JSON.parse(flip) : flip;
    const overlayConfig = typeof overlay === 'string' ? JSON.parse(overlay) : overlay;
    
    const jobId = uuidv4();
    let videoFilePath = null;
    let shouldCleanup = false;
    
    // Determinar la fuente del video
    if (req.file) {
      // Video subido como archivo
      videoFilePath = req.file.path;
      shouldCleanup = true;
      logger.info(`Processing uploaded file: ${req.file.filename}`);
    } else if (videoUrl) {
      // Video desde URL - descargar primero
      logger.info(`Downloading video from URL: ${videoUrl}`);
      const downloadResult = await downloadService.downloadVideo(videoUrl);
      videoFilePath = downloadResult.filePath;
      shouldCleanup = true;
    } else {
      throw new ValidationError('Either videoFile or videoUrl must be provided');
    }
    
    logger.info(`Starting video processing for job: ${jobId}`);
    logger.info(`Distribution config:`, distributionConfig);
    
    // Preparar opciones de procesamiento
    const processingOptions = {
      jobId,
      clipDuration: distributionConfig.clipDuration || 3,
      maxClips: distributionConfig.maxClips || 10,
      quality: 'high',
      startTime: 0,
      randomOffset: distributionConfig.randomOffset || false
    };
    
    // Iniciar procesamiento en background
    setImmediate(async () => {
      try {
        const result = await processingService.processStoryFromFile(videoFilePath, processingOptions);
        logger.success(`Processing completed for job: ${jobId}`);
        
        // Si hay callback URL, enviar notificación
        if (callbackUrl) {
          try {
            await axios.post(callbackUrl, {
              jobId,
              status: 'completed',
              result
            });
          } catch (callbackError) {
            logger.error(`Failed to send callback: ${callbackError.message}`);
          }
        }
      } catch (processingError) {
        logger.error(`Processing failed for job: ${jobId}`, processingError.message);
        
        if (callbackUrl) {
          try {
            await axios.post(callbackUrl, {
              jobId,
              status: 'failed',
              error: processingError.message
            });
          } catch (callbackError) {
            logger.error(`Failed to send error callback: ${callbackError.message}`);
          }
        }
      } finally {
        // Limpiar archivo temporal si es necesario
        if (shouldCleanup && videoFilePath) {
          try {
            await fs.remove(videoFilePath);
            logger.info(`Cleaned up temporary file: ${videoFilePath}`);
          } catch (cleanupError) {
            logger.error(`Failed to cleanup file: ${cleanupError.message}`);
          }
        }
      }
    });
    
    // Responder inmediatamente con el jobId
    res.status(202).json({
      success: true,
      jobId,
      message: 'Video processing started',
      status: 'pending'
    });
    
  } catch (error) {
    logger.error('Error starting video processing:', error);
    throw error;
  }
}));

/**
 * GET /api/job/:jobId
 * Obtiene el estado de un job de procesamiento
 */
router.get('/job/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  
  const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
  const jobDir = path.join(outputDir, jobId);
  
  // Verificar si existe el directorio del job
  if (!fs.existsSync(jobDir)) {
    return res.json({
      id: jobId,
      status: 'pending',
      progress: 0,
      message: 'Job is being processed'
    });
  }
  
  // Leer los clips generados
  const files = fs.readdirSync(jobDir);
  const clipFiles = files.filter(file => file.startsWith('clip_') && file.endsWith('.mp4'));
  const thumbnailFile = files.find(file => file.startsWith('thumbnail'));
  
  if (clipFiles.length === 0) {
    return res.json({
      id: jobId,
      status: 'processing',
      progress: 50,
      message: 'Generating clips...'
    });
  }
  
  // Generar URLs para cada clip
  const baseUrl = process.env.PUBLIC_URL || `https://${req.get('host')}`;
  const clips = clipFiles.map((filename, index) => {
    const clipPath = path.join(jobDir, filename);
    const stats = fs.statSync(clipPath);
    
    return {
      id: `${jobId}-clip-${index + 1}`,
      url: `${baseUrl}/outputs/${jobId}/${filename}`,
      filename,
      size: stats.size,
      duration: 3,
      startTime: index * 3,
      format: 'mp4',
      resolution: '720x1280',
      aspectRatio: '9:16'
    };
  });
  
  // Thumbnail
  let thumbnail = null;
  if (thumbnailFile) {
    thumbnail = `${baseUrl}/outputs/${jobId}/${thumbnailFile}`;
  }
  
  res.json({
    id: jobId,
    status: 'completed',
    progress: 100,
    clips,
    thumbnail,
    totalClips: clips.length,
    completedAt: new Date().toISOString()
  });
}));

/**
 * GET /api/metadata/:jobId
 * Obtiene la metadata detallada de los clips
 */
router.get('/metadata/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  
  const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
  const jobDir = path.join(outputDir, jobId);
  
  if (!fs.existsSync(jobDir)) {
    throw new NotFoundError(`Job ${jobId} not found`);
  }
  
  const files = fs.readdirSync(jobDir);
  const clipFiles = files.filter(file => file.startsWith('clip_') && file.endsWith('.mp4'));
  
  const baseUrl = process.env.PUBLIC_URL || `https://${req.get('host')}`;
  
  const clips = clipFiles.map((filename, index) => {
    const clipPath = path.join(jobDir, filename);
    const stats = fs.statSync(clipPath);
    
    return {
      id: `${jobId}-clip-${index + 1}`,
      filename,
      url: `${baseUrl}/outputs/${jobId}/${filename}`,
      size: stats.size,
      duration: 3,
      startTime: index * 3,
      metadata: {
        format: 'mp4',
        resolution: '720x1280',
        aspectRatio: '9:16',
        codec: 'h264',
        bitrate: '2M'
      }
    };
  });
  
  res.json({
    jobId,
    totalClips: clips.length,
    clips,
    generatedAt: new Date().toISOString()
  });
}));

/**
 * GET /api/downloadZip
 * Descarga un ZIP con todos los clips de un job
 */
router.get('/downloadZip', asyncHandler(async (req, res) => {
  const { jobId } = req.query;
  
  if (!jobId) {
    throw new ValidationError('jobId parameter is required');
  }
  
  const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
  const jobDir = path.join(outputDir, jobId);
  
  if (!fs.existsSync(jobDir)) {
    throw new NotFoundError(`Job ${jobId} not found`);
  }
  
  // Configurar headers para descarga
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="clips-${jobId}.zip"`);
  
  // Crear archive
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });
  
  archive.on('error', (err) => {
    logger.error('Archive error:', err);
    throw err;
  });
  
  // Pipe archive al response
  archive.pipe(res);
  
  // Agregar todos los archivos del directorio
  archive.directory(jobDir, false);
  
  // Finalizar el archive
  await archive.finalize();
  
  logger.info(`ZIP downloaded for job: ${jobId}`);
}));

module.exports = router;
