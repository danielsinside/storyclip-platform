const logger = require('../utils/logger');

/**
 * Middleware para proteger el endpoint de upload-direct
 * Solo permite acceso en entornos de desarrollo/testing
 */
function uploadDirectGuard(req, res, next) {
  const allowUploadDirect = process.env.ALLOW_UPLOAD_DIRECT_TEST === 'true';
  const requireAuth = process.env.REQUIRE_AUTH === 'true';
  
  // Verificar si upload-direct está habilitado
  if (!allowUploadDirect) {
    logger.warn(`Upload-direct blocked for ${req.ip} - disabled in production`);
    return res.status(403).json({ 
      error: 'upload-direct disabled in this environment',
      message: 'This endpoint is only available in development/testing environments'
    });
  }

  // Verificar autenticación si es requerida
  if (requireAuth && !req.user) {
    logger.warn(`Upload-direct blocked for ${req.ip} - authentication required`);
    return res.status(401).json({ 
      error: 'authentication required',
      message: 'This endpoint requires authentication'
    });
  }

  // Log de acceso permitido
  logger.info(`Upload-direct access granted for ${req.ip} - user: ${req.user?.id || 'anonymous'}`);
  
  next();
}

/**
 * Middleware para requerir autenticación
 */
function requireAuth(req, res, next) {
  const requireAuth = process.env.REQUIRE_AUTH === 'true';
  
  if (requireAuth && !req.user) {
    logger.warn(`Authenticated endpoint blocked for ${req.ip} - no auth token`);
    return res.status(401).json({ 
      error: 'authentication required',
      message: 'This endpoint requires a valid authentication token'
    });
  }
  
  next();
}

/**
 * Middleware para extraer información del request
 */
function extractRequestInfo(req, res, next) {
  // Extraer información del request para tracking
  req.requestInfo = {
    userId: req.user?.id || null,
    source: req.get('X-Test-Source') || req.get('X-Source') || 'user',
    flowId: req.get('X-Flow-Id') || null,
    idempotencyKey: req.get('Idempotency-Key') || req.get('X-Idempotency-Key'),
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  };

  // Validar idempotency key solo para endpoints de procesamiento
  const processingEndpoints = ['/v1/process', '/process-simple', '/videos/upload-direct'];
  const isProcessingEndpoint = processingEndpoints.some(endpoint => req.path.includes(endpoint));
  
  // No requerir idempotency key para upload-direct si está deshabilitado
  const isUploadDirect = req.path.includes('/videos/upload-direct');
  const allowUploadDirect = process.env.ALLOW_UPLOAD_DIRECT_TEST === 'true';
  
  // TEMP: Disabled idempotency check for upload-direct
  if (isProcessingEndpoint && !req.requestInfo.idempotencyKey && !isUploadDirect) {
    logger.warn(`Processing request without idempotency key from ${req.ip}`);
    return res.status(400).json({ 
      error: 'idempotency key required',
      message: 'Please provide an Idempotency-Key header to prevent duplicate processing'
    });
  }

  next();
}

/**
 * Middleware para logging de requests
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log del request
  logger.info(`Request: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    source: req.requestInfo?.source,
    flowId: req.requestInfo?.flowId,
    idempotencyKey: req.requestInfo?.idempotencyKey
  });

  // Interceptar la respuesta para logging
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    logger.info(`Response: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    originalSend.call(this, data);
  };

  next();
}

module.exports = {
  uploadDirectGuard,
  requireAuth,
  extractRequestInfo,
  requestLogger
};
