require('dotenv').config();

// Configurar umask para permisos correctos
process.umask(0o022);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs-extra');

// Importar servicios y utilidades
const logger = require('./utils/logger');
const queueService = require('./services/queue.service');
const downloadService = require('./services/download.service');
const processingService = require('./services/processing.service');
const cleanupService = require('./utils/cleanup');
const watchdogService = require('./services/watchdog.service');
const uploadsRepo = require('./services/uploads.repository');

// Importar middleware
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { corsStrict, corsErrorHandler } = require('./middleware/cors');

// Importar rutas
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhooks');
const unifiedRoutes = require('./routes/unified');
const debugRoutes = require('./routes/debug');
const healthRoutes = require('./routes/health');
const uploadRoutes = require('./routes/upload');
const robustRoutes = require('./routes/robust-routes');
const capabilitiesRoutes = require('./routes/capabilities');
const jobRoutes = require('./routes/jobs');
const renderRoutes = require('./routes/render');
const videoRoutes = require('./routes/videos');

// Importar WebSocket
const { router: websocketRoutes, server: wsServer } = require('./routes/websocket');

// Importar métricas
const { metricsHandler } = require('./src/metrics');

// Importar rutas dev (condicional)
const devMetricsRoutes = require('./routes/dev-metrics');

// Importar middleware de seguridad y rutas tenant
const { tenantRateLimit, tenantLogger, jsonSizeLimit } = require('./middleware/security');
const tenantRoutes = require('./routes/tenant');
const metricoolRoutes = require('./routes/metricool');
const uploadPreviewRoutes = require('./routes/upload-preview');

// Inicializar base de datos
const db = require('./database/db');

// Crear aplicación Express
const app = express();

// Configuración del puerto
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitar CSP para APIs
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
// Middleware CORS robusto
app.use(corsStrict);

// ========= ALIAS PARA LOVABLE COMPATIBILITY =========
// Alias para soportar frontend de Lovable que llama /api/process
app.post(['/api/process', '/api/process/'], (req, res, next) => {
  console.log('[Alias] /api/process → /api/process-video');
  req.url = '/api/process-video'; // Reescribimos la URL internamente
  next();
});

// Middleware de parsing - aumentar límites para archivos grandes (10GB)
app.use(express.json({ 
  limit: '10gb',
  parameterLimit: 50000
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10gb',
  parameterLimit: 50000
}));

// Middleware de seguridad (comentado temporalmente para debug)
// app.use(tenantLogger);
// app.use(jsonSizeLimit(5 * 1024 * 1024)); // 5MB límite
// app.use(tenantRateLimit);

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// CORS dinámico para /outputs
const ALLOWED_OUTPUT_ORIGINS = [
  /^https?:\/\/([a-z0-9-]+\.)*creatorsflow\.app$/i,
  /^https?:\/\/([a-z0-9-]+\.)*lovable\.app$/i,     // incluye preview--*.lovable.app
  /^https?:\/\/([a-z0-9-]+\.)*lovable\.dev$/i,
  /^https?:\/\/([a-z0-9-]+\.)*lovableproject\.com$/i,
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_OUTPUT_ORIGINS.some(re => re.test(origin));
}

// Servir archivos estáticos desde /outputs con CORS dinámico
app.use('/outputs', (req, res, next) => {
  const origin = req.headers.origin;
  
  // Solo establecer CORS si no está ya establecido por el middleware principal
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    // CORS dinámico
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin'); // importante para caches
    } else {
      // Permitir acceso público para archivos estáticos
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin');
  }
  
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  
  // Preflight requests
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  
  // Protección path traversal
  const p = require('path').normalize(req.path || '');
  if (p.includes('..')) {
    return res.status(400).json({ error: { code: 'INVALID_PATH', message: 'Invalid path' } });
  }
  
  next();
}, express.static(process.env.OUTPUT_DIR || '/srv/storyclip/outputs', {
  acceptRanges: true,
  fallthrough: true
}));

// Servir uploads públicos
app.use('/uploads', (req, res, next) => {
  // Solo establecer CORS si no está ya establecido por el middleware principal
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  next();
}, express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filepath) => {
    // Solo establecer Content-Type si no hay conflictos
    if (filepath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    }
  }
}));

// Servir archivos de preview desde /preview con CORS dinámico
app.use('/preview', (req, res, next) => {
  const origin = req.headers.origin;
  
  // Solo establecer CORS si no está ya establecido por el middleware principal
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    // CORS dinámico
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin');
  }
  
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora cache
  
  // Preflight requests
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  
  // Protección path traversal
  const p = require('path').normalize(req.path || '');
  if (p.includes('..')) {
    return res.status(400).json({ error: { code: 'INVALID_PATH', message: 'Invalid path' } });
  }
  
  next();
}, express.static('/srv/storyclip/tmp/uploads', {
  acceptRanges: true,
  fallthrough: true,
  setHeaders: (res, filepath) => {
    // Solo establecer Content-Type si no hay conflictos
    if (filepath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    }
  }
}));

// Servir archivos de media estructurados por jobId - SISTEMA ESTABLE
app.use('/media', (req, res, next) => {
  // Protección path traversal
  const p = require('path').normalize(req.path || '');
  if (p.includes('..')) {
    return res.status(400).json({ error: { code: 'INVALID_PATH', message: 'Invalid path' } });
  }
  
  // Solo establecer CORS si no está ya establecido por el middleware principal
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  next();
}, express.static('/srv/storyclip/uploads', {
  fallthrough: false,
  immutable: false,
  cacheControl: true,
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filepath) => {
    // Configurar headers para soporte de Range requests (206 Partial Content)
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Configurar Content-Type específico para videos
    if (filepath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (filepath.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    } else if (filepath.endsWith('.mov')) {
      res.set('Content-Type', 'video/quicktime');
    }
    
    // Configurar headers de cache para videos
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
  }
}));

// Rutas upload-preview (ANTES de robustRoutes)
app.use('/api', uploadPreviewRoutes);

// Rutas robustas (sistema mejorado) - PRIMERA PRIORIDAD
app.use('/api', robustRoutes);

// Rutas API
app.use('/api', apiRoutes);
app.use('/api/v1', uploadRoutes);

// Rutas unificadas (nuevo sistema)
app.use('/api', unifiedRoutes);

// Rutas de debug (solo desarrollo)
app.use('/debug', debugRoutes);

// Rutas de health
app.use('/api', healthRoutes);

// Rutas de capacidades
app.use('/api', capabilitiesRoutes);

// Rutas de jobs (CRÍTICO: antes de render para evitar conflictos)
app.use('/api', jobRoutes);

// Rutas de videos (para el frontend)
app.use('/api/videos', videoRoutes);

// Rutas de render
app.use('/api', renderRoutes);

// Rutas de WebSocket
app.use('/api', websocketRoutes);

// Ruta de métricas
app.get('/api/metrics', metricsHandler);

// Rutas dev (solo en desarrollo o con flag)
if (process.env.ENABLE_DEV_METRICS === '1' || process.env.NODE_ENV !== 'production') {
  app.use('/api', devMetricsRoutes);
}

// Rutas tenant
app.use('/api', tenantRoutes);

// Rutas metricool
app.use('/api/metricool', metricoolRoutes);

// Rutas upload-preview (ya movida arriba)

// Rutas de webhooks
app.use('/webhooks', webhookRoutes);

// Servir documentación técnica
app.use('/docs', express.static(path.join(__dirname, 'public/docs'), {
  maxAge: '1h',
  etag: true,
  index: 'index.html'
}));

app.use('/documentation', express.static(path.join(__dirname, 'public/docs'), {
  maxAge: '1h',
  etag: true,
  index: 'index.html'
}));

// Servir frontend de Next.js
app.use('/tester', express.static(path.join(__dirname, 'frontend/.next/static'), {
  maxAge: '1y',
  etag: true
}));

// Servir archivos del frontend de Next.js
app.use('/tester', express.static(path.join(__dirname, 'frontend/out'), {
  maxAge: '1d',
  etag: true,
  fallthrough: true
}));

// Ruta para el frontend de Next.js
app.get('/tester/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/out/index.html'));
});

// Servir frontend Lovable (React + Vite)
app.use('/publish', express.static('/srv/story-creatorsflow-app/frontend-lovable/dist', {
  etag: false,
  setHeaders: (res) => {
    // Deshabilitar cache completamente para ver cambios inmediatamente
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Ruta catch-all para React Router en frontend Lovable
app.get('/publish/*', (req, res) => {
  res.sendFile('/srv/story-creatorsflow-app/frontend-lovable/dist/index.html');
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'StoryClip Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      config: '/api/config',
      stories: '/api/stories',
      webhooks: '/webhooks/vps',
      outputs: '/outputs',
      frontend: '/tester'
    }
  });
});

// Middleware de manejo de errores
app.use(notFoundHandler);
app.use(corsErrorHandler); // CORS headers en errores
app.use(errorHandler);

// Función de inicialización
async function initialize() {
  try {
    logger.info('Initializing StoryClip Backend...');

    // Inicializar base de datos
    await db.init();
    logger.info('Database initialized successfully');

    // Asegurar que los directorios existen
    await fs.ensureDir(process.env.OUTPUT_DIR || '/srv/storyclip/outputs');
    await fs.ensureDir(process.env.TEMP_DIR || '/srv/storyclip/tmp');

    // Limpiar archivos temporales antiguos al iniciar
    await downloadService.cleanupOldFiles(1); // 1 hora
    await processingService.cleanupOldOutputs(1); // 1 día
    
    // Inicializar limpieza automática
    cleanupService.startPeriodicCleanup();
    
    // Inicializar watchdog para jobs colgados
    watchdogService.start();
    
    // Inicializar capacidades de FFmpeg (cargar en cache al inicio)
    const { getCapabilities } = require('./services/ffmpeg-capabilities');
    const caps = getCapabilities();
    logger.info(`FFmpeg capabilities loaded: ${caps.filters.length} filters, ${caps.encoders.length} encoders`);
    
    // Inicializar repositorio de uploads
    logger.info('Uploads repository initialized');

    logger.success('StoryClip Backend initialized successfully');
    logger.info(`Server will start on port ${PORT}`);
    logger.info(`Output directory: ${process.env.OUTPUT_DIR || '/srv/storyclip/outputs'}`);
    logger.info(`Temp directory: ${process.env.TEMP_DIR || '/srv/storyclip/tmp'}`);
    logger.info(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);

  } catch (error) {
    logger.error('Failed to initialize StoryClip Backend:', error.message);
    process.exit(1);
  }
}

// Función de limpieza al cerrar
async function cleanup() {
  try {
    logger.info('Shutting down StoryClip Backend...');
    
    // Detener watchdog (si tiene método stop)
    if (watchdogService.stop) {
      watchdogService.stop();
    }
    
    // Detener repositorio de uploads (limpieza final)
    if (uploadsRepo.cleanup) {
      const cleaned = uploadsRepo.cleanup(0);
      logger.info(`Cleaned up ${cleaned} uploads during shutdown`);
    }
    
    // Cerrar conexiones de cola
    await queueService.close();
    
    // Cerrar conexión de base de datos - COMENTADO TEMPORALMENTE
    // await db.close();
    
    logger.success('StoryClip Backend shut down successfully');
  } catch (error) {
    logger.error('Error during shutdown:', error.message);
  }
}

// Manejar señales de cierre
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGUSR2', cleanup); // Para nodemon

// Manejar errores no capturados - NO cerrar el servidor
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  logger.error('Stack:', error.stack);
  // NO cerrar el servidor para errores de FFmpeg
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // NO cerrar el servidor para errores de procesamiento
  // process.exit(1);
});

// Inicializar y iniciar servidor
initialize().then(() => {
  const server = app.listen(PORT, HOST, () => {
    logger.success(`🚀 StoryClip Backend running on ${HOST}:${PORT}`);
    logger.info(`📁 Outputs served from: ${process.env.OUTPUT_DIR || '/srv/storyclip/outputs'}`);
    logger.info(`🔗 API endpoints available at: http://${HOST}:${PORT}/api`);
    logger.info(`🔔 Webhooks available at: http://${HOST}:${PORT}/webhooks`);
    logger.info(`📊 Health check: http://${HOST}:${PORT}/api/health/unified`);
  });

  // Configurar timeout del servidor
  server.timeout = 1800000; // 30 minutos para archivos grandes
  server.keepAliveTimeout = 1800000; // 30 minutos
  server.headersTimeout = 1800000; // 30 minutos

}).catch((error) => {
  logger.error('Failed to start server:', error.message);
  process.exit(1);
});

module.exports = app;