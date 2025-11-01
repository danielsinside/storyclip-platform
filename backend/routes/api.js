const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');
const storyService = require('../services/story.service');
const queueService = require('../services/queue.service');
const downloadService = require('../services/download.service');
const processingService = require('../services/processing.service');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/error');
const metricoolService = require('../services/metricool.service');

// Helper function to format date in local timezone
function formatDateInTimezone(date, timezone = 'America/New_York') {
  // Convert to the target timezone and get components
  const targetDate = new Date(date.toLocaleString("en-US", {timeZone: timezone}));
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  const seconds = String(targetDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Configuración del servidor
router.get('/config', (req, res) => {
  res.json({
    maxFileSize: '10GB',
    supportedFormats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    maxConcurrentJobs: process.env.MAX_CONCURRENT_JOBS || 3,
    clipDurations: {
      story: [5, 7, 10],
      reel: [7, 15, 30]
    },
    outputFormats: {
      story: 'mp4 (720x1280, 9:16)',
      reel: 'mp4 (720x1280, 9:16)',
      image: 'jpg (720x1280, 9:16)'
    }
  });
});

// Autenticación mock
router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  // Mock authentication - en producción usar JWT real
  if (email === 'admin@storyclip.com' && password === 'admin123') {
    const token = 'mock-token-123';
    res.json({
      success: true,
      token,
      user: {
        id: 'mock-user-id',
        email: email,
        role: 'admin'
      }
    });
  } else {
    throw new ValidationError('Invalid credentials');
  }
}));

// Obtener todos los stories
router.get('/stories', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, status } = req.query;
  
  const result = storyService.getAllStories({
    limit: parseInt(limit),
    offset: parseInt(offset),
    status
  });

  res.json(result);
}));

// Crear nuevo story
router.post('/stories', authenticateToken, asyncHandler(async (req, res) => {
  const { videoUrl, title, description, options = {} } = req.body;

  // Validar datos
  storyService.validateStoryData({ videoUrl, title, description });

  // Crear story
  const story = storyService.createStory({
    videoUrl,
    title,
    description,
    options
  });

  logger.info(`New story created: ${story.id}`);

  res.status(201).json(story);
}));

// Obtener story por ID
router.get('/stories/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const story = storyService.getStoryById(id);
  res.json(story);
}));

// Actualizar story
router.patch('/stories/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validar que solo se permitan ciertos campos
  const allowedFields = ['title', 'description'];
  const filteredUpdates = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }

  const updatedStory = storyService.updateStory(id, filteredUpdates);
  res.json(updatedStory);
}));

// Eliminar story
router.delete('/stories/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = storyService.deleteStory(id);
  res.json(result);
}));

// Iniciar procesamiento de story
router.post('/stories/:id/process', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    type = 'story', 
    options = {},
    // Parámetros avanzados del frontend
    clipDuration = 5,
    maxClips = 1000,
    quality = 'high',
    startTime = 0,
    aspectRatio = '9:16',
    resolution = '720x1280',
    fps = 30,
    videoBitrate = '2000k',
    audioBitrate = '128k',
    preset = 'fast',
    crf = 23,
    format = 'mp4',
    videoCodec = 'libx264',
    audioCodec = 'aac',
    // Efectos y overlays
    effects = {},
    overlays = {}
  } = req.body;

  const story = storyService.getStoryById(id);

  if (story.status === 'processing') {
    throw new ValidationError('Story is already being processed');
  }

  if (story.status === 'completed') {
    throw new ValidationError('Story has already been processed');
  }

  // Combinar parámetros del frontend con options
  const processingOptions = {
    ...options,
    clipDuration,
    maxClips,
    quality,
    startTime,
    aspectRatio,
    resolution,
    fps,
    videoBitrate,
    audioBitrate,
    preset,
    crf,
    format,
    videoCodec,
    audioCodec,
    effects,
    overlays
  };

  // Marcar como procesando
  storyService.markAsProcessing(story.jobId);

  // Agregar job a la cola
  let job;
  switch (type) {
    case 'story':
      job = await queueService.addStoryJob(story.jobId, story.videoUrl, processingOptions);
      break;
    case 'reel':
      job = await queueService.addReelJob(story.jobId, story.videoUrl, processingOptions);
      break;
    case 'image':
      job = await queueService.addImageJob(story.jobId, story.videoUrl, processingOptions);
      break;
    default:
      throw new ValidationError('Invalid processing type. Must be: story, reel, or image');
  }

  logger.info(`Processing started for story: ${id}, type: ${type}`);
  logger.info(`Processing options:`, processingOptions);

  res.json({
    success: true,
    message: 'Processing started',
    jobId: story.jobId,
    bullJobId: job.id,
    type,
    status: 'processing',
    options: processingOptions
  });
}));

// Obtener estado del procesamiento
router.get('/stories/:id/status', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Intentar primero obtener del sistema de jobs (nuevo)
  const robustProcessing = require('../services/robust-processing.service');
  const jobMonitoringService = require('../services/job-monitoring.service');
  
  try {
    // Primero intentar del sistema de monitoreo
    const monitoringStatus = jobMonitoringService.getJobStatus(id);
    
    if (monitoringStatus) {
      return res.json({
        success: true,
        storyId: id,
        jobId: id,
        status: monitoringStatus.status,
        progress: monitoringStatus.progress,
        message: monitoringStatus.message,
        outputs: monitoringStatus.outputs || [],
        result: monitoringStatus.result || null
      });
    }

    // Si no, intentar del sistema robusto
    const jobStatus = await robustProcessing.getJobStatus(id);
    
    if (jobStatus) {
      return res.json({
        success: true,
        storyId: id,
        jobId: id,
        status: jobStatus.status,
        progress: jobStatus.progress,
        message: jobStatus.message || 'Processing',
        outputs: jobStatus.outputs || [],
        result: jobStatus.result || null
      });
    }
  } catch (error) {
    logger.warn(`Job status lookup failed for ${id}, trying old story system: ${error.message}`);
  }
  
  // Si no se encuentra, intentar con el sistema viejo de stories
  try {
    const story = storyService.getStoryById(id);

    // Obtener estado del job en la cola
    let queueStatus = null;
    try {
      queueStatus = await queueService.getJobStatus(story.jobId, 'story');
    } catch (error) {
      // Job no encontrado en cola, usar estado del story
    }

    return res.json({
      storyId: id,
      jobId: story.jobId,
      status: story.status,
      progress: story.progress,
      outputs: story.outputs,
      error: story.error,
      queueStatus,
      metadata: story.metadata
    });
  } catch (error) {
    // No se encontró ni como job ni como story
    return res.status(404).json({
      success: false,
      error: 'Story or job not found',
      message: 'No se encontró el trabajo. Puede que haya expirado o el ID sea inválido.'
    });
  }
}));

// Obtener parámetros disponibles para procesamiento
router.get('/processing/parameters', (req, res) => {
  res.json({
    success: true,
    parameters: {
      // Parámetros básicos
      clipDuration: {
        type: 'number',
        default: 5,
        min: 1,
        max: 60,
        description: 'Duración de cada clip en segundos'
      },
      maxClips: {
        type: 'number',
        default: 1000,
        min: 1,
        max: 50,
        description: 'Máximo número de clips a generar'
      },
      quality: {
        type: 'select',
        default: 'high',
        options: ['low', 'medium', 'high'],
        description: 'Calidad del video'
      },
      startTime: {
        type: 'number',
        default: 0,
        min: 0,
        description: 'Tiempo de inicio en segundos'
      },
      
      // Parámetros de video
      aspectRatio: {
        type: 'select',
        default: '9:16',
        options: ['9:16', '16:9', '1:1', '4:3', '3:4'],
        description: 'Proporción del video'
      },
      resolution: {
        type: 'select',
        default: '720x1280',
        options: ['720x1280', '1080x1920', '720x720', '1080x1080', '1280x720', '1920x1080'],
        description: 'Resolución del video'
      },
      fps: {
        type: 'number',
        default: 30,
        min: 15,
        max: 60,
        description: 'Frames por segundo'
      },
      
      // Parámetros de codificación
      videoBitrate: {
        type: 'select',
        default: '2000k',
        options: ['500k', '1000k', '2000k', '3000k', '4000k', '5000k'],
        description: 'Bitrate del video'
      },
      audioBitrate: {
        type: 'select',
        default: '128k',
        options: ['64k', '128k', '192k', '256k', '320k'],
        description: 'Bitrate del audio'
      },
      preset: {
        type: 'select',
        default: 'fast',
        options: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'],
        description: 'Preset de codificación FFmpeg'
      },
      crf: {
        type: 'number',
        default: 23,
        min: 0,
        max: 51,
        description: 'Constant Rate Factor (0=lossless, 51=worst)'
      },
      
      // Parámetros de formato
      format: {
        type: 'select',
        default: 'mp4',
        options: ['mp4', 'webm', 'avi', 'mov'],
        description: 'Formato de salida'
      },
      videoCodec: {
        type: 'select',
        default: 'libx264',
        options: ['libx264', 'libx265', 'libvpx', 'libvpx-vp9'],
        description: 'Codec de video'
      },
      audioCodec: {
        type: 'select',
        default: 'aac',
        options: ['aac', 'mp3', 'opus', 'vorbis'],
        description: 'Codec de audio'
      }
    },
    presets: {
      story: {
        clipDuration: 5,
        maxClips: 1000,
        quality: 'high',
        aspectRatio: '9:16',
        resolution: '720x1280',
        fps: 30,
        videoBitrate: '2000k',
        audioBitrate: '128k',
        preset: 'fast',
        crf: 23,
        format: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac'
      },
      reel: {
        clipDuration: 7,
        maxClips: 1000,
        quality: 'high',
        aspectRatio: '9:16',
        resolution: '720x1280',
        fps: 30,
        videoBitrate: '3000k',
        audioBitrate: '128k',
        preset: 'fast',
        crf: 22,
        format: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac'
      },
      image: {
        clipDuration: 1,
        maxClips: 1,
        quality: 'high',
        aspectRatio: '9:16',
        resolution: '720x1280',
        fps: 30,
        videoBitrate: '2000k',
        audioBitrate: '128k',
        preset: 'fast',
        crf: 23,
        format: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac'
      }
    }
  });
});

// Obtener información del video sin procesar
router.post('/video/info', authenticateToken, asyncHandler(async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    throw new ValidationError('videoUrl is required');
  }

  const info = await processingService.getVideoInfo(videoUrl);
  res.json(info);
}));

// Normalizar URL de video - Subir a servicio temporal si es necesario
router.post('/normalize-url', asyncHandler(async (req, res) => {
  const { url, userId = '4172139', blogId } = req.body;

  if (!url) {
    throw new ValidationError('url is required');
  }

  try {
    logger.info(`Processing URL for Metricool: ${url}`);
    
    // Si la URL es de nuestro servidor, subirla a un servicio temporal
    if (url.includes('story.creatorsflow.app')) {
      logger.info(`Uploading local file to temporary service: ${url}`);
      
      // Descargar el archivo desde nuestra URL
      const fileResponse = await fetch(url);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status}`);
      }
      
      const fileBuffer = await fileResponse.arrayBuffer();
      logger.info(`File downloaded, size: ${fileBuffer.byteLength} bytes`);
      
      // Subir a file.io
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', Buffer.from(fileBuffer), {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });
      
      const uploadResponse = await fetch('https://file.io', {
        method: 'POST',
        body: form
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to file.io: ${uploadResponse.status}`);
      }
      
      const uploadData = await uploadResponse.json();
      const tempUrl = uploadData.link;
      
      logger.info(`✅ File uploaded to temporary service: ${tempUrl}`);
      
      res.json({
        success: true,
        normalizedUrl: tempUrl,
        mediaId: null
      });
    } else {
      // Para URLs externas, usar directamente
      logger.info(`Using external URL directly: ${url}`);
      res.json({
        success: true,
        normalizedUrl: url,
        mediaId: null
      });
    }
  } catch (error) {
    logger.error(`Error processing URL: ${error.message}`);
    res.json({
      success: false,
      normalizedUrl: url,
      mediaId: null,
      error: error.message
    });
  }
}));

// Obtener páginas disponibles de Metricool
router.get('/brands', asyncHandler(async (req, res) => {
  try {
    logger.info('Fetching available brands from Metricool');
    
    const response = await fetch('https://app.metricool.com/api/admin/simpleProfiles?userId=4172139', {
      headers: {
        'X-Mc-Auth': process.env.METRICOOL_USER_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Metricool API error: ${response.status} ${response.statusText}`);
    }

    const brands = await response.json();
    logger.info(`Found ${brands.length} brands`);
    
    res.json({
      success: true,
      brands: brands
    });
  } catch (error) {
    logger.error(`Error fetching brands: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Publicar Story a Facebook usando Metricool
// Función para publicar un solo post
async function publishSinglePost(post, delayMode = 'NATURAL') {
  const { normalizedUrl, mediaId, blogId, userId = '4172139', creatorUserMail = 'daniel@creatorsflow.app', publicationDateTime, creationDateTime, message } = post;

  if ((!normalizedUrl && !mediaId) || !blogId) {
    throw new Error('mediaId (or normalizedUrl) and blogId are required');
  }

  const publishUrl = `https://app.metricool.com/api/v2/scheduler/posts?userId=${userId}&blogId=${blogId}`;
  
  // Use provided publication date/time or default to immediate
  let publishTime;
  let creationTime;
  
  if (publicationDateTime) {
    // Parse the formatted date string (YYYY-MM-DDTHH:MM:SS) - already in local timezone
    publishTime = new Date(publicationDateTime); // Don't add Z, it's already local time
    creationTime = creationDateTime ? new Date(creationDateTime) : new Date();
    
    // Validate that the scheduled time is in the future (allow 1 minute buffer)
    const now = new Date();
    const bufferTime = new Date(now.getTime() + 60000); // 1 minute buffer
    
    logger.info(`Time validation - Now: ${now.toISOString()}, Publish: ${publishTime.toISOString()}, Buffer: ${bufferTime.toISOString()}`);
    logger.info(`Time difference: ${publishTime.getTime() - now.getTime()}ms, Buffer: ${bufferTime.getTime() - now.getTime()}ms`);
    
    if (publishTime <= bufferTime) {
      logger.warn(`Publication time too close - Publish: ${publishTime.toISOString()}, Buffer: ${bufferTime.toISOString()}`);
      throw new Error('La fecha y hora de publicación debe ser al menos 1 minuto en el futuro');
    }
  } else {
    // Default to immediate publication (current time + 30 seconds)
    const now = new Date();
    publishTime = new Date(now.getTime() + 30000);
    creationTime = now;
  }
  
  // Log publication details
  const isScheduled = publicationDateTime && new Date(publicationDateTime) > new Date();
  const mode = isScheduled ? 'programada' : 'inmediata';
  logger.info(`Publishing story to Facebook via Metricool - BlogId: ${blogId}, Modo: ${mode}`);
  logger.info(`Creation time: ${creationTime.toISOString()}, Publication time: ${publishTime.toISOString()}`);
  
  const postData = {
    text: message || "", // Usar el mensaje proporcionado
    autoPublish: true,
    saveExternalMediaFiles: true, // Metricool descarga y guarda el archivo antes de publicar
    publicationDate: {
      dateTime: formatDateInTimezone(publishTime, 'America/New_York'), // yyyy-MM-ddTHH:mm:ss format in local timezone
      timezone: "America/New_York" // Timezone
    },
    creationDate: {
      dateTime: formatDateInTimezone(creationTime, 'America/New_York'), // yyyy-MM-ddTHH:mm:ss format in local timezone
      timezone: "America/New_York" // Timezone
    },
    providers: [
      {
        network: "facebook"
      }
    ],
    facebookData: {
      type: "STORY"
    },
    media: mediaId ? 
      { mediaId: mediaId } : 
      [normalizedUrl], // Array de URLs como en la configuración original
    mediaAltText: [null], // Alt text para accesibilidad
    creatorUserMail: creatorUserMail,
    creatorUserId: parseInt(userId)
  };
  
  const response = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'X-Mc-Auth': process.env.METRICOOL_USER_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Metricool API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  logger.info(`Story published successfully to blogId ${blogId}: ${JSON.stringify(result)}`);
  
  return {
    success: true,
    result: result,
    post: post
  };
}

// Endpoint modificado que soporta tanto posts individuales como arrays
router.post('/publish-story', asyncHandler(async (req, res) => {
  try {
    const { jobId, delayMode = 'NATURAL', posts, normalizedUrl, mediaId, blogId, userId = '4172139', creatorUserMail = 'daniel@creatorsflow.app', publicationDateTime, creationDateTime, message } = req.body;

    // CASO A: Array de posts (publicación masiva)
    if (posts && Array.isArray(posts) && posts.length > 0) {
      logger.info(`[BATCH] Procesando ${posts.length} posts para jobId: ${jobId}`);
      
      const results = [];
      let successCount = 0;
      let failCount = 0;
      
      // Procesar posts secuencialmente para evitar rate limits
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        try {
          logger.info(`[BATCH] Procesando post ${i + 1}/${posts.length}: ${post.message || post.normalizedUrl}`);
          
          const result = await publishSinglePost(post, delayMode);
          results.push({
            success: true,
            postId: result.result?.data?.id || null,
            post: post,
            index: i + 1
          });
          successCount++;
          
          // Pequeña pausa entre posts para evitar rate limits
          if (i < posts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre posts
          }
          
        } catch (error) {
          logger.error(`[BATCH] Error en post ${i + 1}:`, error.message);
          results.push({
            success: false,
            error: error.message,
            post: post,
            index: i + 1
          });
          failCount++;
        }
      }
      
      logger.info(`[BATCH] Completado: ${successCount} exitosos, ${failCount} fallidos`);
      
      return res.json({
        success: successCount > 0,
        count: results.length,
        successful: successCount,
        failed: failCount,
        results: results,
        message: `Publicación masiva completada: ${successCount} exitosos, ${failCount} fallidos`
      });
    }
    
    // CASO B: Post individual (compatibilidad con código existente)
    if ((!normalizedUrl && !mediaId) || !blogId) {
      return res.status(400).json({
        success: false,
        error: 'mediaId (or normalizedUrl) and blogId are required'
      });
    }
    
    logger.info(`[SINGLE] Procesando post individual: ${message || normalizedUrl}`);
    
    const result = await publishSinglePost({
      normalizedUrl,
      mediaId,
      blogId,
      userId,
      creatorUserMail,
      publicationDateTime,
      creationDateTime,
      message
    }, delayMode);
    
    res.json({
      success: true,
      result: result.result
    });
    
  } catch (error) {
    logger.error(`Error en publish-story: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Upload directo con multipart/form-data (para archivos grandes)
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

// Upload directo (para testing - sin autenticación)
router.post('/videos/upload', flexibleUpload, asyncHandler(async (req, res) => {
  logger.info(`Upload request: ${req.body.filename || 'unknown'} (${req.body.fileSize || 'unknown'})`);
  logger.info(`Request body:`, req.body);
  logger.info(`Files:`, req.files);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      debug: {
        headers: req.headers,
        body: req.body,
        files: req.files
      }
    });
  }

  const file = req.files[0];
  const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Generar nombre de archivo con extensión .mp4 garantizada
  const fileName = `${videoId}.mp4`;
  
  // Mover archivo al directorio de outputs para acceso directo
  const outputDir = '/srv/storyclip/outputs/uploads';
  fs.ensureDirSync(outputDir);
  const outputPath = path.join(outputDir, fileName);
  fs.moveSync(file.path, outputPath);
  
  // Generar URL de preview inmediata
  const previewUrl = `https://story.creatorsflow.app/outputs/uploads/${fileName}`;
  
  // Respuesta en el formato esperado por la Edge Function
  res.json({
    video_id: videoId,
    temp_path: file.path,
    previewUrl: previewUrl,
    success: true,
    message: 'Upload received successfully',
    filename: file.originalname,
    fileSize: file.size,
    contentType: file.mimetype,
    timestamp: new Date().toISOString()
  });
}));

// COMENTADO: Handler legacy reemplazado por sistema unificado en routes/unified.js
// router.post('/videos/upload-direct', flexibleUpload, asyncHandler(async (req, res) => {
//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: 'No file uploaded'
//     });
//   }

//   const file = req.files[0]; // Tomar el primer archivo
//   const { originalname, filename, path: tempPath, size } = file;
  
//   logger.info(`Direct upload: ${originalname} (${size} bytes)`);
  
//   // Generar IDs únicos
//   const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
//   // Respuesta en el formato esperado (compatible con frontend)
//   res.json({
//     video_id: videoId,
//     temp_path: tempPath,
//     tempPath: tempPath, // También en camelCase para compatibilidad
//     success: true,
//     message: 'Upload received successfully',
//     filename: originalname,
//     content_type: file.mimetype,
//     file_size: size,
//     // Campos adicionales para máxima compatibilidad
//     data: {
//       video_id: videoId,
//       temp_path: tempPath,
//       tempPath: tempPath
//     }
//   });
// }));

// Endpoint de debug para ver qué espera el frontend
router.post('/videos/upload-debug', flexibleUpload, asyncHandler(async (req, res) => {
  logger.info('Debug upload - Headers:', req.headers);
  logger.info('Debug upload - Body:', req.body);
  logger.info('Debug upload - Files:', req.files);
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      debug: {
        headers: req.headers,
        body: req.body,
        files: req.files
      }
    });
  }

  const file = req.files[0];
  const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    success: true,
    message: 'Debug upload successful',
    video_id: videoId,
    temp_path: file.path,
    tempPath: file.path,
    filename: file.originalname,
    debug: {
      headers: req.headers,
      body: req.body,
      files: req.files,
      file_info: {
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }
    }
  });
}));

// Procesamiento de story (para Edge Function)
router.post('/v1/process/story', asyncHandler(async (req, res) => {
  const { jobId, tempPath, fileName, options } = req.body;

  logger.info(`Process story request: jobId=${jobId}, tempPath=${tempPath}, fileName=${fileName}`);
  logger.info(`Request body:`, req.body);

  const processingJobId = jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Registrar job en el sistema de monitoreo
  const jobMonitoringService = require('../services/job-monitoring.service');
  jobMonitoringService.registerJob(processingJobId, {
    source: 'api',
    tempPath,
    fileName,
    options
  });
  
  // Registrar job en la base de datos del sistema robusto
  const robustProcessing = require('../services/robust-processing.service');
  await robustProcessing.createJob({
    jobId: processingJobId,
    status: 'queued',
    progress: 0,
    message: 'Job queued for processing',
    userId: null
  });
  
  // Iniciar procesamiento real en background
  setImmediate(async () => {
    try {
      const processingService = require('../services/processing.service');
      const fs = require('fs-extra');
      const path = require('path');
      
      // Actualizar estado a procesando
      jobMonitoringService.updateJobStatus(processingJobId, 'processing', 10, 'Starting video processing...');
      
      // Verificar que el archivo temporal existe
      if (!await fs.pathExists(tempPath)) {
        throw new Error(`Temporary file not found: ${tempPath}`);
      }
      
      // Procesar el video usando el archivo temporal directamente
      const processingOptions = {
        jobId: processingJobId,
        clipDuration: options?.slicing?.clip_duration_seconds || options?.clipDuration || 3,
        maxClips: options?.slicing?.clips_total || options?.maxClips || 50,
        quality: options?.quality || 'high',
        startTime: options?.slicing?.start_time || options?.startTime || 0
      };
      
      logger.info(`Processing options from frontend:`, processingOptions);
      logger.info(`Raw options received:`, options);
      logger.info(`Raw request body:`, req.body);
      
      // Actualizar progreso
      jobMonitoringService.updateJobStatus(processingJobId, 'processing', 30, 'Processing video files...');
      
      const result = await processingService.processStoryFromFile(tempPath, processingOptions);
      
      // Actualizar estado a completado
      jobMonitoringService.updateJobStatus(processingJobId, 'completed', 100, 'Video processing completed');
      
      // Actualizar estado en la base de datos
      await robustProcessing.updateJobProgress(processingJobId, 'completed', 100, 'Video processing completed');
      
      logger.info(`Processing completed for job: ${processingJobId}`, result);
    } catch (error) {
      logger.error(`Processing failed for job: ${processingJobId}`, error.message);
      jobMonitoringService.updateJobStatus(processingJobId, 'failed', null, `Processing failed: ${error.message}`);
      
      // Actualizar estado en la base de datos
      await robustProcessing.updateJobProgress(processingJobId, 'failed', null, `Processing failed: ${error.message}`);
    }
  });
  
  res.json({
    success: true,
    jobId: processingJobId,
    vpsJobId: processingJobId,
    status: 'processing',
    message: 'Story processing started',
    websocketUrl: `wss://${req.get('host')}/ws?jobId=${processingJobId}`
  });
}));

// Consultar estado del job (para Edge Function)
router.get('/v1/jobs/:jobId/status', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  logger.info(`Get job status request: jobId=${jobId}`);

  // Verificar si el archivo de salida existe
  const fs = require('fs');
  const path = require('path');
  const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
  const jobDir = path.join(outputDir, 'uploads', jobId);
  const videoFile = path.join(jobDir, 'clip_001.mp4');
  
  const fileExists = fs.existsSync(videoFile);
  
  // Simular progreso basado en el tiempo transcurrido desde la creación del job
  // Extraer timestamp del jobId (formato: job_TIMESTAMP_RANDOM)
  const timestampMatch = jobId.match(/job_(\d+)_/);
  const jobStartTime = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
  const elapsedTime = Date.now() - jobStartTime;
  const processingTime = 30000; // 30 segundos para completar
  
  let status = 'processing';
  let progress = Math.min(Math.floor((elapsedTime / processingTime) * 100), 95);
  
  // Solo marcar como completado si el archivo existe
  if (elapsedTime > processingTime && fileExists) {
    status = 'completed';
    progress = 100;
  } else if (elapsedTime > processingTime && !fileExists) {
    // Si ha pasado el tiempo pero no hay archivo, mantener en processing
    status = 'processing';
    progress = 95;
  }
  
  // Si el job está completado, leer todos los clips generados
  let result = null;
  let outputs = [];
  
  const isComplete = (status === 'completed' || status === 'done');
  
  if (isComplete && fileExists) {
    try {
      // Leer todos los archivos en el directorio del job
      const files = fs.readdirSync(jobDir);
      const clipFiles = files.filter(file => file.startsWith('clip_') && file.endsWith('.mp4'));
      const thumbnailFile = files.find(file => file.startsWith('thumbnail') && !file.endsWith('.mp4'));
      
      // Generar información para cada clip
      const artifacts = [];
      const filesList = [];
      const clips = [];
      
      clipFiles.forEach((filename, index) => {
        const clipPath = path.join(jobDir, filename);
        const stats = fs.statSync(clipPath);
        const clipId = `clip_${Date.now()}_${index}`;
        const clipUrl = `https://story.creatorsflow.app/outputs/uploads/${jobId}/${filename}`;
        
        artifacts.push({
          id: clipId,
          type: 'video',
          url: clipUrl,
          format: 'mp4',
          duration: 3, // Duración estándar de clips
          filename: filename,
          aspectRatio: '9:16', // Aspect ratio para stories
          resolution: '720x1280',
          size: stats.size
        });
        
        filesList.push({
          id: `file_${Date.now()}_${index}`,
          type: 'video',
          url: clipUrl,
          format: 'mp4',
          duration: 3,
          filename: filename,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: stats.size
        });
        
        clips.push({
          id: clipId,
          type: 'video',
          url: clipUrl,
          format: 'mp4',
          duration: 3,
          filename: filename,
          startTime: index * 3,
          endTime: (index + 1) * 3,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: stats.size
        });
        
        outputs.push({
          id: `output_${Date.now()}_${index}`,
          type: 'video',
          url: clipUrl,
          format: 'mp4',
          duration: 3,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: stats.size
        });
      });
      
      // Agregar thumbnail si existe
      if (thumbnailFile) {
        const thumbnailPath = path.join(jobDir, thumbnailFile);
        const thumbnailStats = fs.statSync(thumbnailPath);
        
        const thumbnailFormat = thumbnailFile.split('.').pop() || 'jpg';
        
        artifacts.push({
          id: `thumbnail_${Date.now()}`,
          type: 'thumbnail',
          url: `https://story.creatorsflow.app/outputs/uploads/${jobId}/${thumbnailFile}`,
          format: thumbnailFormat,
          filename: thumbnailFile,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: thumbnailStats.size
        });
        
        filesList.push({
          id: `file_thumbnail_${Date.now()}`,
          type: 'thumbnail',
          url: `https://story.creatorsflow.app/outputs/uploads/${jobId}/${thumbnailFile}`,
          format: thumbnailFormat,
          filename: thumbnailFile,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: thumbnailStats.size
        });
        
        outputs.push({
          id: `output_thumbnail_${Date.now()}`,
          type: 'thumbnail',
          url: `https://story.creatorsflow.app/outputs/uploads/${jobId}/${thumbnailFile}`,
          format: thumbnailFormat,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: thumbnailStats.size
        });
      }
      
      // Normalizar URLs de clips con Metricool
      const normalizedClips = await metricoolService.normalizeClipUrls(clips);
      const normalizedArtifacts = await metricoolService.normalizeClipUrls(artifacts);
      const normalizedFiles = await metricoolService.normalizeClipUrls(filesList);
      
      result = {
        artifacts: normalizedArtifacts,
        files: normalizedFiles,
        clips: normalizedClips,
        clips_generated: clipFiles.length,
        base_url: "https://story.creatorsflow.app/outputs/uploads/",
        total_files: clipFiles.length + (thumbnailFile ? 1 : 0),
        total_clips: clipFiles.length,
        message: "Job completed successfully"
      };
      
    } catch (error) {
      logger.error(`Error reading job directory: ${jobId}`, error.message);
      // Fallback a un solo clip si hay error
      result = {
        artifacts: [{
          id: `output_${Date.now()}`,
          type: 'video',
          url: `https://story.creatorsflow.app/outputs/uploads/${jobId}/clip_001.mp4`,
          format: 'mp4',
          duration: 3,
          filename: `clip_001.mp4`,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: 0
        }],
        files: [{
          id: `file_${Date.now()}`,
          type: 'video',
          url: `https://story.creatorsflow.app/outputs/uploads/${jobId}/clip_001.mp4`,
          format: 'mp4',
          duration: 3,
          filename: `clip_001.mp4`,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: 0
        }],
        clips: [{
          id: `clip_${Date.now()}`,
          type: 'video',
          url: `https://story.creatorsflow.app/outputs/uploads/${jobId}/clip_001.mp4`,
          format: 'mp4',
          duration: 3,
          filename: `clip_001.mp4`,
          startTime: 0,
          endTime: 3,
          aspectRatio: '9:16',
          resolution: '720x1280',
          size: 0
        }],
        clips_generated: 1,
        base_url: "https://story.creatorsflow.app/outputs/uploads/",
        total_files: 1,
        total_clips: 1,
        message: "Job completed successfully"
      };
      
      outputs = [{
        id: `output_${Date.now()}`,
        type: 'video',
        url: `https://story.creatorsflow.app/outputs/uploads/${jobId}/clip_001.mp4`,
        format: 'mp4',
        duration: 3,
        aspectRatio: '9:16',
        resolution: '720x1280',
        size: 0
      }];
    }
  }
  
  // Normalizar URLs si hay result con clips
  if (result && result.clips && result.clips.length > 0) {
    try {
      result.clips = await metricoolService.normalizeClipUrls(result.clips);
      if (result.artifacts) {
        result.artifacts = await metricoolService.normalizeClipUrls(result.artifacts);
      }
      if (result.files) {
        result.files = await metricoolService.normalizeClipUrls(result.files);
      }
    } catch (normalizeError) {
      logger.error('Error normalizing URLs, using original URLs:', normalizeError.message);
    }
  }

  res.json({
    success: true,
    jobId,
    status,
    progress,
    message: `Job ${status} - ${progress}%`,
    result,
    outputs,
    timestamp: new Date().toISOString()
  });
}));

// Upload signing (mock)
router.post('/uploads/sign', authenticateToken, asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;

  if (!filename) {
    throw new ValidationError('filename is required');
  }

  // Mock upload signing - en producción integrar con AWS S3 o similar
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    uploadId,
    uploadUrl: `https://mock-uploads.storyclip.com/${uploadId}`,
    fields: {
      'Content-Type': contentType || 'video/mp4',
      'key': filename
    },
    expiresIn: 10800 // 1 hora
  });
}));

// Estadísticas del sistema
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const [storyStats, queueStats] = await Promise.all([
    storyService.getStats(),
    queueService.getQueueStats()
  ]);

  res.json({
    stories: storyStats,
    queues: queueStats,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    }
  });
}));

// Limpiar datos antiguos
router.post('/cleanup', authenticateToken, asyncHandler(async (req, res) => {
  const [storiesCleaned, outputsCleaned, tempFilesCleaned] = await Promise.all([
    storyService.cleanupOldStories(),
    processingService.cleanupOldOutputs(),
    require('../services/download.service').cleanupOldFiles()
  ]);

  await queueService.cleanQueues();

  res.json({
    success: true,
    cleaned: {
      stories: storiesCleaned,
      outputs: outputsCleaned,
      tempFiles: tempFilesCleaned
    }
  });
}));

// Índice de clips - página web que muestra todos los jobs con clips procesados
router.get('/clips', asyncHandler(async (req, res) => {
  const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
  const fs = require('fs-extra');
  const path = require('path');
  
  try {
    // Leer todos los directorios de jobs
    const files = await fs.readdir(outputDir);
    const jobDirs = [];
    
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        // Verificar si tiene clips
        const jobFiles = await fs.readdir(filePath);
        const clipFiles = jobFiles.filter(f => f.startsWith('clip_') && f.endsWith('.mp4'));
        const thumbnailFiles = jobFiles.filter(f => f.startsWith('thumb_') && f.endsWith('.jpg'));
        const mainThumbnail = jobFiles.find(f => f.startsWith('thumbnail') && !f.endsWith('.mp4') && !f.startsWith('thumb_'));
        
        if (clipFiles.length > 0) {
          jobDirs.push({
            jobId: file,
            clipCount: clipFiles.length,
            thumbnailCount: thumbnailFiles.length + (mainThumbnail ? 1 : 0),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            hasMainThumbnail: !!mainThumbnail,
            mainThumbnail: mainThumbnail
          });
        }
      }
    }
    
    // Ordenar por fecha de modificación (más recientes primero)
    jobDirs.sort((a, b) => b.modifiedAt - a.modifiedAt);
    
    // Generar HTML
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎬 Clips Procesados - StoryClip</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { 
            font-size: 2.5em; 
            margin-bottom: 10px; 
            font-weight: 300;
          }
          .header p { 
            font-size: 1.1em; 
            opacity: 0.9; 
          }
          .content { 
            padding: 30px; 
          }
          .stats { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
            text-align: center;
          }
          .stats h2 { 
            color: #333; 
            margin-bottom: 15px; 
            font-size: 1.5em;
          }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 20px; 
            margin-top: 20px;
          }
          .stat-item { 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .stat-number { 
            font-size: 2em; 
            font-weight: bold; 
            color: #667eea; 
            margin-bottom: 5px;
          }
          .stat-label { 
            color: #666; 
            font-size: 0.9em; 
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .jobs-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-top: 20px;
          }
          .job-card { 
            background: white; 
            border-radius: 10px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            cursor: pointer;
          }
          .job-card:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 8px 25px rgba(0,0,0,0.15); 
          }
          .job-thumbnail { 
            width: 100%; 
            height: 200px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 3em;
            position: relative;
            overflow: hidden;
          }
          .job-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .job-info { 
            padding: 20px; 
          }
          .job-id { 
            font-weight: bold; 
            color: #333; 
            margin-bottom: 10px; 
            font-size: 1.1em;
            word-break: break-all;
          }
          .job-stats { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 15px;
          }
          .job-stat { 
            text-align: center;
          }
          .job-stat-number { 
            font-size: 1.5em; 
            font-weight: bold; 
            color: #667eea; 
          }
          .job-stat-label { 
            font-size: 0.8em; 
            color: #666; 
            text-transform: uppercase;
          }
          .job-date { 
            color: #666; 
            font-size: 0.9em; 
            margin-bottom: 15px;
          }
          .view-button { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            font-weight: bold;
            width: 100%;
            transition: opacity 0.3s ease;
          }
          .view-button:hover { 
            opacity: 0.9; 
          }
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
          }
          .empty-state h3 {
            font-size: 1.5em;
            margin-bottom: 10px;
            color: #333;
          }
          .empty-state p {
            font-size: 1.1em;
            line-height: 1.6;
          }
          @media (max-width: 768px) {
            .container { margin: 10px; border-radius: 10px; }
            .header { padding: 20px; }
            .header h1 { font-size: 2em; }
            .content { padding: 20px; }
            .jobs-grid { grid-template-columns: 1fr; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 Clips Procesados</h1>
            <p>Explora todos tus videos procesados</p>
          </div>
          
          <div class="content">
            <div class="stats">
              <h2>📊 Estadísticas Generales</h2>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-number">${jobDirs.length}</div>
                  <div class="stat-label">Videos Procesados</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">${jobDirs.reduce((sum, job) => sum + job.clipCount, 0)}</div>
                  <div class="stat-label">Clips Totales</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">${jobDirs.reduce((sum, job) => sum + job.thumbnailCount, 0)}</div>
                  <div class="stat-label">Thumbnails</div>
                </div>
              </div>
            </div>
            
            ${jobDirs.length === 0 ? `
              <div class="empty-state">
                <h3>🎬 No hay clips procesados</h3>
                <p>Sube un video para comenzar a generar clips automáticamente.</p>
              </div>
            ` : `
              <h2 style="margin-bottom: 20px; color: #333;">🎥 Videos Procesados</h2>
              <div class="jobs-grid">
                ${jobDirs.map(job => `
                  <div class="job-card" onclick="window.location.href='/api/clips/${job.jobId}'">
                    <div class="job-thumbnail">
                      ${job.hasMainThumbnail ? 
                        `<img src="/outputs/${job.jobId}/${job.mainThumbnail}" alt="Thumbnail">` : 
                        '🎬'
                      }
                    </div>
                    <div class="job-info">
                      <div class="job-id">${job.jobId}</div>
                      <div class="job-stats">
                        <div class="job-stat">
                          <div class="job-stat-number">${job.clipCount}</div>
                          <div class="job-stat-label">Clips</div>
                        </div>
                        <div class="job-stat">
                          <div class="job-stat-number">${job.thumbnailCount}</div>
                          <div class="job-stat-label">Thumbnails</div>
                        </div>
                      </div>
                      <div class="job-date">
                        📅 ${job.modifiedAt.toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <button class="view-button">Ver Clips</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    logger.error('Error reading clips index:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error reading clips index',
      message: error.message
    });
  }
}));

// Visor de clips - página web que muestra todos los clips de un job
router.get('/clips/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  
  logger.info(`Generating clips viewer for job: ${jobId}`);
  
  // Verificar si el directorio del job existe
  const fs = require('fs');
  const path = require('path');
  const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
  const jobDir = path.join(outputDir, jobId);
  
  if (!fs.existsSync(jobDir)) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job No Encontrado - StoryClip</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .error { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Job No Encontrado</h1>
          <p>El job <strong>${jobId}</strong> no existe o aún no ha sido procesado.</p>
          <p><a href="/">← Volver al inicio</a></p>
        </div>
      </body>
      </html>
    `);
  }
  
  // Leer archivos del directorio del job
  const files = fs.readdirSync(jobDir);
  const clipFiles = files.filter(file => file.startsWith('clip_') && file.endsWith('.mp4'));
  const thumbnailFiles = files.filter(file => file.startsWith('thumb_') && file.endsWith('.jpg'));
  const mainThumbnailFile = files.find(file => file.startsWith('thumbnail') && !file.endsWith('.mp4') && !file.startsWith('thumb_'));
  
  // Ordenar clips por número
  clipFiles.sort((a, b) => {
    const numA = parseInt(a.match(/clip_(\d+)/)[1]);
    const numB = parseInt(b.match(/clip_(\d+)/)[1]);
    return numA - numB;
  });
  
  // LIMITAR a máximo 50 clips (por si hay archivos extra)
  const displayClips = clipFiles.slice(0, 50);
  
  // Calcular distribución de duraciones usando ffprobe
  const durationStats = {};
  const ffmpeg = require('fluent-ffmpeg');
  
  for (const filename of displayClips.slice(0, 5)) { // Solo verificar los primeros 5 para no sobrecargar
    const clipPath = path.join(jobDir, filename);
    try {
      const duration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(clipPath, (err, metadata) => {
          if (err) {
            resolve(3); // Fallback a 3s si hay error
          } else {
            resolve(Math.round(parseFloat(metadata.format.duration) || 3));
          }
        });
      });
      durationStats[duration] = (durationStats[duration] || 0) + 1;
    } catch (error) {
      // Fallback a 3s si hay error
      durationStats[3] = (durationStats[3] || 0) + 1;
    }
  }
  
  // Si no pudimos obtener duraciones reales, asumir distribución típica
  if (Object.keys(durationStats).length === 0) {
    const totalClips = displayClips.length;
    if (totalClips <= 50) {
      // Distribución típica: mayoría de 3s, algunos extendidos
      const standardClips = Math.max(1, totalClips - 2);
      const extendedClips = totalClips - standardClips;
      durationStats[3] = standardClips;
      if (extendedClips > 0) {
        durationStats[30] = extendedClips; // Asumir clips extendidos de 30s
      }
    } else {
      durationStats[3] = totalClips;
    }
  }
  
  // Generar HTML
  const baseUrl = `https://story.creatorsflow.app/outputs/${jobId}`;
  const clipsHtml = displayClips.map((filename, index) => {
    const clipUrl = `${baseUrl}/${filename}`;
    const clipNumber = index + 1;
    const thumbnailFilename = `thumb_${String(clipNumber).padStart(3, '0')}.jpg`;
    const thumbnailUrl = `${baseUrl}/${thumbnailFilename}`;
    const hasThumbnail = thumbnailFiles.includes(thumbnailFilename);
    
    return `
      <div class="clip-item">
        <h3>Clip ${clipNumber}</h3>
        <video controls preload="metadata" class="clip-video" ${hasThumbnail ? `poster="${thumbnailUrl}"` : ''}>
          <source src="${clipUrl}" type="video/mp4">
          Tu navegador no soporta el elemento video.
        </video>
        <div class="clip-info">
          <p><strong>Archivo:</strong> ${filename}</p>
          <p><strong>URL:</strong> <a href="${clipUrl}" target="_blank">${clipUrl}</a></p>
          ${hasThumbnail ? `<p><strong>Thumbnail:</strong> <a href="${thumbnailUrl}" target="_blank">${thumbnailFilename}</a></p>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  const thumbnailHtml = mainThumbnailFile ? `
    <div class="thumbnail-section">
      <h3>📸 Thumbnail Principal</h3>
      <img src="${baseUrl}/${mainThumbnailFile}" alt="Thumbnail" class="thumbnail">
      <p><strong>Archivo:</strong> ${mainThumbnailFile}</p>
    </div>
  ` : '';
  
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Clips del Job ${jobId} - StoryClip</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 15px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .content { padding: 30px; }
        .stats { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 10px; 
          margin-bottom: 30px; 
          text-align: center;
        }
        .stats h2 { color: #333; margin-bottom: 15px; }
        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 20px; 
        }
        .stat-item { 
          background: white; 
          padding: 15px; 
          border-radius: 8px; 
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .clips-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 25px; 
          margin-top: 30px;
        }
        .clip-item { 
          background: #f8f9fa; 
          border-radius: 10px; 
          padding: 20px; 
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }
        .clip-item:hover { transform: translateY(-5px); }
        .clip-item h3 { 
          color: #333; 
          margin-bottom: 15px; 
          text-align: center;
          font-size: 1.3em;
        }
        .clip-video { 
          width: 100%; 
          border-radius: 8px; 
          margin-bottom: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          background: #f8f9fa;
          object-fit: cover;
          aspect-ratio: 9/16;
          min-height: 200px;
        }
        .clip-info { 
          background: white; 
          padding: 15px; 
          border-radius: 8px; 
          font-size: 0.9em;
        }
        .clip-info p { margin-bottom: 8px; }
        .clip-info a { 
          color: #667eea; 
          text-decoration: none; 
          word-break: break-all;
        }
        .clip-info a:hover { text-decoration: underline; }
        .thumbnail-section { 
          background: #e8f5e8; 
          padding: 20px; 
          border-radius: 10px; 
          margin-bottom: 30px; 
          text-align: center;
        }
        .thumbnail { 
          max-width: 200px; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin: 15px 0;
        }
        .back-link { 
          display: inline-block; 
          background: #667eea; 
          color: white; 
          padding: 12px 25px; 
          text-decoration: none; 
          border-radius: 25px; 
          margin-top: 20px;
          transition: background 0.3s ease;
        }
        .back-link:hover { background: #5a6fd8; }
        @media (max-width: 768px) {
          .clips-grid { grid-template-columns: 1fr; }
          .header h1 { font-size: 2em; }
          .stats-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 Clips Procesados</h1>
          <p>Job ID: <strong>${jobId}</strong></p>
        </div>
        
        <div class="content">
          <div class="stats">
            <h2>📊 Estadísticas</h2>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-number">${displayClips.length}</div>
                <div class="stat-label">Clips Generados</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${Object.keys(durationStats).length}</div>
                <div class="stat-label">Duración(es)</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${thumbnailFiles.length + (mainThumbnailFile ? 1 : 0)}</div>
                <div class="stat-label">Thumbnails</div>
              </div>
            </div>
            <div class="duration-breakdown" style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
              <h4 style="margin-bottom: 10px; color: #333;">📊 Distribución de Duraciones:</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${Object.entries(durationStats).map(([duration, count]) => 
                  `<span style="background: #667eea; color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.9em;">
                    ${count} clips de ${duration}s
                  </span>`
                ).join('')}
              </div>
            </div>
          </div>
          
          ${thumbnailHtml}
          
          <h2 style="margin-bottom: 20px; color: #333;">🎥 Clips de Video</h2>
          <div class="clips-grid">
            ${clipsHtml}
          </div>
          
                <div style="text-align: center; margin-top: 40px;">
                  <a href="/api/clips" class="back-link" style="margin-right: 20px;">← Ver Todos los Videos</a>
                  <a href="/" class="back-link">🏠 Inicio</a>
                </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
}));

// API JSON para obtener lista de clips de un job
router.get('/clips/:jobId/json', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  
  logger.info(`Generating clips JSON for job: ${jobId}`);
  
  // Verificar si el directorio del job existe
  const fs = require('fs');
  const path = require('path');
  const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
  const jobDir = path.join(outputDir, jobId);
  
  if (!fs.existsSync(jobDir)) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      jobId,
      message: 'El job no existe o aún no ha sido procesado'
    });
  }
  
  // Leer archivos del directorio del job
  const files = fs.readdirSync(jobDir);
  const clipFiles = files.filter(file => file.startsWith('clip_') && file.endsWith('.mp4'));
  const thumbnailFiles = files.filter(file => file.startsWith('thumb_') && file.endsWith('.jpg'));
  const mainThumbnailFile = files.find(file => file.startsWith('thumbnail') && !file.endsWith('.mp4') && !file.startsWith('thumb_'));
  
  // Ordenar clips por número
  clipFiles.sort((a, b) => {
    const numA = parseInt(a.match(/clip_(\d+)/)[1]);
    const numB = parseInt(b.match(/clip_(\d+)/)[1]);
    return numA - numB;
  });
  
  // LIMITAR a máximo 50 clips (por si hay archivos extra)
  const displayClips = clipFiles.slice(0, 50);
  
  // Generar URLs base
  const baseUrl = `https://story.creatorsflow.app/outputs/${jobId}`;
  
  // Crear lista de clips
  const clips = displayClips.map((filename, index) => {
    const clipPath = path.join(jobDir, filename);
    const stats = fs.statSync(clipPath);
    const clipNumber = index + 1;
    const thumbnailFilename = `thumb_${String(clipNumber).padStart(3, '0')}.jpg`;
    const hasThumbnail = thumbnailFiles.includes(thumbnailFilename);
    
    return {
      id: `clip_${clipNumber}`,
      index: clipNumber,
      filename,
      url: `${baseUrl}/${filename}`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      thumbnail: hasThumbnail ? {
        filename: thumbnailFilename,
        url: `${baseUrl}/${thumbnailFilename}`
      } : null
    };
  });
  
  // Crear thumbnail principal info si existe
  let mainThumbnail = null;
  if (mainThumbnailFile) {
    const thumbnailPath = path.join(jobDir, mainThumbnailFile);
    const stats = fs.statSync(thumbnailPath);
    
    mainThumbnail = {
      filename: mainThumbnailFile,
      url: `${baseUrl}/${mainThumbnailFile}`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      format: mainThumbnailFile.split('.').pop() || 'jpg'
    };
  }
  
  // Función para normalizar URLs - asegurar formato consistente para frontend
  const normalizeUrl = (url) => {
    if (!url) return url;
    
    // Asegurar que sea HTTPS
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    
    // Asegurar que tenga el dominio completo
    if (url.startsWith('/')) {
      url = `https://story.creatorsflow.app${url}`;
    }
    
    return url;
  };

  // Normalizar URLs para el frontend - formato consistente
  const normalizedClips = clips.map(clip => ({
    ...clip,
    url: normalizeUrl(clip.url),
    // URLs adicionales para diferentes casos de uso del frontend
    publicUrl: normalizeUrl(clip.url),
    downloadUrl: normalizeUrl(clip.url),
    streamUrl: normalizeUrl(clip.url),
    // Información de accesibilidad
    accessible: true,
    format: 'mp4',
    type: 'video'
  }));
  
  const normalizedMainThumbnail = mainThumbnail ? {
    ...mainThumbnail,
    url: normalizeUrl(mainThumbnail.url),
    publicUrl: normalizeUrl(mainThumbnail.url),
    downloadUrl: normalizeUrl(mainThumbnail.url),
    accessible: true,
    type: 'image'
  } : null;

  // Respuesta JSON
  res.json({
    success: true,
    jobId,
    totalClips: normalizedClips.length,
    totalFiles: files.length,
    totalThumbnails: thumbnailFiles.length + (normalizedMainThumbnail ? 1 : 0),
    mainThumbnail: normalizedMainThumbnail,
    clips: normalizedClips,
    baseUrl,
    viewerUrl: `https://story.creatorsflow.app/api/clips/${jobId}`,
    generatedAt: new Date().toISOString()
  });
}));

// Función helper para formatear bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Force download endpoint for clips
router.get('/download', asyncHandler(async (req, res) => {
  const fileRel = String(req.query.file || '');
  
  // Validate file path to prevent path traversal
  if (!fileRel || fileRel.includes('..') || fileRel.includes('//')) {
    return res.status(400).json({
      success: false,
      message: 'Ruta de archivo inválida'
    });
  }

  // Construct absolute path
  const OUTPUTS_DIR = '/srv/storyclip/outputs';
  const absPath = path.join(OUTPUTS_DIR, fileRel);
  
  // Ensure the path is within the outputs directory
  if (!absPath.startsWith(OUTPUTS_DIR)) {
    return res.status(400).json({
      success: false,
      message: 'Ruta de archivo no permitida'
    });
  }

  // Check if file exists
  if (!fs.existsSync(absPath)) {
    return res.status(404).json({
      success: false,
      message: 'Archivo no encontrado'
    });
  }

  // Get file stats
  const stats = fs.statSync(absPath);
  const filename = path.basename(absPath);

  // Set headers for forced download
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Cache-Control', 'no-cache');

  // Stream the file
  const fileStream = fs.createReadStream(absPath);
  fileStream.pipe(res);

  fileStream.on('error', (error) => {
    logger.error('Error streaming file:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error al leer el archivo'
      });
    }
  });

  logger.info(`Force download: ${filename} (${formatBytes(stats.size)})`);
}));

// ========= ALIAS PARA LOVABLE COMPATIBILITY =========

/**
 * NUEVO ENDPOINT /api/process-video con validación y gestión de jobs
 * Resuelve "Job not found" y validación previa
 */
router.post('/process-video', asyncHandler(async (req, res) => {
  logger.info(`[API] /api/process-video called with new job system`);
  
  const processBody = req.body;

  // ========= FIX ERROR 234: Validar y normalizar clips =========
  if (processBody.clips && Array.isArray(processBody.clips)) {
    processBody.clips = processBody.clips.map((clip, index) => {
      // Asegurar que effects existe
      if (!clip.effects) {
        clip.effects = {};
        logger.info(`[FILTER-FIX] Clip ${index}: Added missing effects object`);
      }
      
      // Normalizar el campo filter
      if (!clip.effects.filter) {
        clip.effects.filter = {
          type: 'none',
          intensity: 0,
          ffmpegCommand: '',
          ffmpegValues: {}
        };
        logger.info(`[FILTER-FIX] Clip ${index}: Added missing filter field`);
      } else {
        // Si existe filter pero le falta ffmpegCommand
        if (clip.effects.filter.ffmpegCommand === undefined || clip.effects.filter.ffmpegCommand === null) {
          clip.effects.filter.ffmpegCommand = '';
          logger.info(`[FILTER-FIX] Clip ${index}: Normalized empty ffmpegCommand`);
        }
        
        // Si ffmpegValues no existe, agregarlo
        if (!clip.effects.filter.ffmpegValues) {
          clip.effects.filter.ffmpegValues = {};
          logger.info(`[FILTER-FIX] Clip ${index}: Added missing ffmpegValues`);
        }
      }
      
      return clip;
    });
    logger.info(`[FILTER-FIX] Normalized ${processBody.clips.length} clips`);
  }
  // ========= END FIX ERROR 234 =========
  
  // Importar servicios
  const jobManager = require('../services/job-manager.service');
  const validationService = require('../services/validation.service');
  
  try {
    // 1. VALIDACIÓN PREVIA (evita crashes con código 234)
    logger.info(`[API] Starting validation for processBody`);
    const validation = await validationService.validateProcessBody(processBody);
    
    if (!validation.valid) {
      logger.error(`[API] Validation failed: ${validation.error}`);
      return res.status(422).json({
        success: false,
        error: validation.code || 'VALIDATION_ERROR',
        message: validation.error,
        details: {
          code: validation.code,
          error: validation.error
        }
      });
    }
    
    // 2. CREAR JOB PERSISTENTE
    const job = jobManager.createJob(processBody);
    
    logger.info(`[API] Created job ${job.id}, starting processing in background`);
    
    // 3. PROCESAR EN BACKGROUND
    setImmediate(async () => {
      try {
        // Marcar como procesando
        jobManager.startProcessing(job.id);
        
        // Importar servicios de procesamiento
        const processingService = require('../services/processing.service');
        const ffmpegHelper = require('../utils/ffmpeg');
        
        // Procesar con el nuevo sistema
        const startTime = Date.now();
        const result = await processingService.processVideoWithJob({
          jobId: job.id,
          processBody,
          videoInfo: validation.videoInfo
        });
        
        const processingTime = Date.now() - startTime;
        
        // Marcar como completado
        jobManager.completeJob(job.id, result.outputUrl, result.ffmpegCommand, processingTime);
        
        logger.info(`[API] Job ${job.id} completed successfully in ${processingTime}ms`);
        
      } catch (error) {
        logger.error(`[API] Job ${job.id} failed: ${error.message}`);
        jobManager.failJob(job.id, error.message);
      }
    });
    
    // 4. RESPUESTA INMEDIATA CON JOB ID
    res.status(202).json({
      success: true,
      jobId: job.id,
      status: 'PENDING',
      message: 'Job created and queued for processing',
      estimatedTime: '30-60 seconds'
    });
    
  } catch (error) {
    logger.error(`[API] Process video error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error during job creation'
    });
  }
}));

// Asegurar preflight para el alias
router.options('/process-video', (req, res) => {
  logger.debug(`[ALIAS] Preflight request for /api/process-video`);
  res.status(204).end();
});

module.exports = router;


// ALIAS: /api/stories/:id/status → /api/v1/jobs/:id/status
// Para compatibilidad con frontend de Lovable

