/**
 * Rutas de videos para el frontend
 * Endpoint: /api/videos/upload
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');

const router = express.Router();

// Configurar multer para uploads de videos - SISTEMA ESTABLE POR JOBID
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Generar jobId único
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Crear directorio específico para este job
    const jobDir = `/srv/storyclip/uploads/${jobId}`;
    await fs.ensureDir(jobDir);
    
    // Guardar jobId en req para usar en filename
    req.jobId = jobId;
    
    cb(null, jobDir);
  },
  filename: (req, file, cb) => {
    // Siempre guardar como source.mp4 en el directorio del job
    cb(null, 'source.mp4');
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB límite
    files: 1, // Un archivo a la vez
    fieldSize: 10 * 1024 * 1024 * 1024, // 10GB
    fieldNameSize: 1000,
    fields: 100
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo videos
    const allowedTypes = /mp4|mov|avi|mkv|webm|m4v|3gp|flv|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video (MP4, MOV, AVI, MKV, WEBM, M4V, 3GP, FLV, WMV)'));
    }
  }
});

/**
 * POST /api/videos/upload
 * Endpoint principal para upload de videos desde el frontend
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
        code: 'NO_FILE'
      });
    }

    const jobId = req.jobId;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const originalName = req.file.originalname;
    
    logger.info(`[VIDEOS] Video uploaded: ${originalName} -> ${jobId}/source.mp4 (${fileSize} bytes)`);

    // Generar URL de acceso usando el nuevo sistema de media
    const previewUrl = `/media/${jobId}/source.mp4`;
    
    // Guardar información del upload en el repositorio
    const uploadInfo = {
      id: jobId,
      originalName: originalName,
      size: fileSize,
      path: filePath,
      uploadedAt: new Date().toISOString(),
      previewUrl: previewUrl,
      type: 'video',
      jobId: jobId
    };

    // Registrar en el repositorio de uploads
    const uploadsRepo = require('../services/uploads.repository');
    uploadsRepo.set(jobId, uploadInfo);

    // Respuesta exitosa con el nuevo formato
    res.json({
      success: true,
      jobId: jobId,
      previewUrl: previewUrl,
      message: 'File uploaded successfully. Use jobId to process.'
    });

  } catch (error) {
    logger.error(`[VIDEOS] Upload error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      code: 'UPLOAD_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/videos/:uploadId/info
 * Obtener información de un video subido
 */
router.get('/:uploadId/info', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const uploadsRepo = require('../services/uploads.repository');
    const uploadInfo = uploadsRepo.get(uploadId);

    if (!uploadInfo) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      uploadId: uploadId,
      videoUrl: uploadInfo.videoUrl,
      fileInfo: {
        originalName: uploadInfo.originalName,
        size: uploadInfo.size,
        uploadedAt: uploadInfo.uploadedAt
      }
    });

  } catch (error) {
    logger.error(`[VIDEOS] Get info error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * DELETE /api/videos/:uploadId
 * Eliminar un video subido
 */
router.delete('/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const uploadsRepo = require('../services/uploads.repository');
    const uploadInfo = uploadsRepo.get(uploadId);

    if (!uploadInfo) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      });
    }

    // Eliminar archivo físico
    try {
      await fs.unlink(uploadInfo.path);
      logger.info(`[VIDEOS] Deleted video file: ${uploadInfo.path}`);
    } catch (unlinkError) {
      logger.warn(`[VIDEOS] Could not delete file ${uploadInfo.path}: ${unlinkError.message}`);
    }

    // Eliminar del repositorio
    uploadsRepo.delete(uploadId);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    logger.error(`[VIDEOS] Delete error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/videos/:jobId/apply-filter
 * Aplicar filtro y generar preview filtrado
 */
router.post('/:jobId/apply-filter', async (req, res) => {
  try {
    const { jobId } = req.params;
    const filterConfig = req.body;
    
    logger.info(`[VIDEOS] Applying filter to job ${jobId}`);
    
    // Determinar la ruta del video según el sistema
    let sourcePath;
    let uploadInfo;
    
    if (jobId.startsWith('job_')) {
      // Nuevo sistema - buscar en uploads repository
      const uploadsRepo = require('../services/uploads.repository');
      uploadInfo = uploadsRepo.get(jobId);
      
      if (!uploadInfo) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
          code: 'JOB_NOT_FOUND'
        });
      }
      
      sourcePath = `/srv/storyclip/uploads/${jobId}/source.mp4`;
    } else {
      // Sistema legacy - buscar en outputs/uploads
      sourcePath = `/srv/storyclip/outputs/uploads/${jobId}.mp4`;
      
      // Verificar que existe el archivo
      if (!await fs.pathExists(sourcePath)) {
        return res.status(404).json({
          success: false,
          error: 'Source video not found',
          code: 'SOURCE_NOT_FOUND'
        });
      }
      
      // Crear uploadInfo simulado para el sistema legacy
      uploadInfo = {
        id: jobId,
        path: sourcePath,
        type: 'video'
      };
    }
    
    // Verificar que existe el archivo source
    if (!await fs.pathExists(sourcePath)) {
      return res.status(404).json({
        success: false,
        error: 'Source video not found',
        code: 'SOURCE_NOT_FOUND'
      });
    }
    
    // Procesar con FFmpeg
    const ffmpeg = require('fluent-ffmpeg');
    
    // Determinar la ruta del archivo filtrado según el sistema
    let filteredPath;
    let filteredPreviewUrl;
    
    if (jobId.startsWith('job_')) {
      // Nuevo sistema - guardar en uploads
      filteredPath = `/srv/storyclip/uploads/${jobId}/filtered.mp4`;
      filteredPreviewUrl = `/media/${jobId}/filtered.mp4`;
    } else {
      // Sistema legacy - guardar en outputs/uploads
      filteredPath = `/srv/storyclip/outputs/uploads/${jobId}_filtered.mp4`;
      filteredPreviewUrl = `/outputs/uploads/${jobId}_filtered.mp4`;
    }
    
    return new Promise((resolve, reject) => {
      let ffmpegCommand = ffmpeg(sourcePath);
      
      // Aplicar filtros según la configuración
      if (filterConfig.brightness !== undefined) {
        ffmpegCommand = ffmpegCommand.videoFilters(`eq=brightness=${filterConfig.brightness}`);
      }
      
      if (filterConfig.contrast !== undefined) {
        ffmpegCommand = ffmpegCommand.videoFilters(`eq=contrast=${filterConfig.contrast}`);
      }
      
      if (filterConfig.saturation !== undefined) {
        ffmpegCommand = ffmpegCommand.videoFilters(`eq=saturation=${filterConfig.saturation}`);
      }
      
      if (filterConfig.hue !== undefined) {
        ffmpegCommand = ffmpegCommand.videoFilters(`eq=hue=${filterConfig.hue}`);
      }
      
      // Configurar output
      ffmpegCommand
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a copy'
        ])
        .output(filteredPath)
        .on('start', (commandLine) => {
          logger.info(`[VIDEOS] FFmpeg started for job ${jobId}: ${commandLine}`);
        })
        .on('progress', (progress) => {
          logger.info(`[VIDEOS] FFmpeg progress for job ${jobId}: ${progress.percent}%`);
        })
        .on('end', () => {
          logger.info(`[VIDEOS] FFmpeg completed for job ${jobId}`);
          
          // Verificar que el archivo se creó
          fs.pathExists(filteredPath).then(exists => {
            if (exists) {
              const filteredPreviewUrl = `/media/${jobId}/filtered.mp4`;
              
              res.json({
                success: true,
                filteredPreviewUrl: filteredPreviewUrl,
                message: 'Filter applied successfully'
              });
              resolve();
            } else {
              logger.error(`[VIDEOS] Filtered file not created for job ${jobId}`);
              res.status(500).json({
                success: false,
                error: 'Filtered file not created',
                code: 'FILTER_FAILED'
              });
              resolve();
            }
          });
        })
        .on('error', (err) => {
          logger.error(`[VIDEOS] FFmpeg error for job ${jobId}: ${err.message}`);
          
          // NO romper el preview actual - devolver error limpio
          res.json({
            error: true,
            message: 'FFmpeg failed',
            code: err.code || 'FFMPEG_ERROR',
            details: err.message
          });
          resolve();
        })
        .run();
    });

  } catch (error) {
    logger.error(`[VIDEOS] Apply filter error: ${error.message}`);
    
    // NO romper el preview actual - devolver error limpio
    res.json({
      error: true,
      message: 'Filter application failed',
      code: 'FILTER_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/videos/register-existing
 * Endpoint temporal para registrar uploads existentes en el sistema de archivos
 */
router.post('/register-existing', async (req, res) => {
  try {
    const { jobId, originalName = 'unknown.mp4' } = req.body;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'jobId is required',
        code: 'MISSING_JOB_ID'
      });
    }
    
    const filePath = `/srv/storyclip/uploads/${jobId}/source.mp4`;
    
    // Verificar que el archivo existe
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }
    
    // Obtener información del archivo
    const fileStats = await fs.stat(filePath);
    
    // Generar URL de acceso
    const previewUrl = `/media/${jobId}/source.mp4`;
    
    // Guardar información del upload en el repositorio
    const uploadInfo = {
      id: jobId,
      originalName: originalName,
      size: fileStats.size,
      path: filePath,
      uploadedAt: new Date().toISOString(),
      previewUrl: previewUrl,
      type: 'video',
      jobId: jobId
    };
    
    // Registrar en el repositorio de uploads
    const uploadsRepo = require('../services/uploads.repository');
    uploadsRepo.set(jobId, uploadInfo);
    
    logger.info(`[VIDEOS] Registered existing upload: ${jobId} -> ${filePath} (${fileStats.size} bytes)`);
    
    res.json({
      success: true,
      jobId: jobId,
      previewUrl: previewUrl,
      message: 'Upload registered successfully'
    });
    
  } catch (error) {
    logger.error(`[VIDEOS] Register existing upload error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to register upload',
      code: 'REGISTER_ERROR',
      details: error.message
    });
  }
});

module.exports = router;
