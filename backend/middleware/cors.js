const logger = require('../utils/logger');

/**
 * CORS HABILITADO - Backend maneja CORS para Lovable + story.creatorsflow.app
 * Soporta múltiples orígenes desde ALLOWED_ORIGINS en .env
 */
function corsStrict(req, res, next) {
  const origin = req.headers.origin;

  // Lista de orígenes permitidos desde .env
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOriginsList = allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);

  // Patrones de regex para dominios dinámicos
  const allowedPatterns = [
    /^https?:\/\/([a-z0-9-]+\.)*creatorsflow\.app$/i,
    /^https?:\/\/([a-z0-9-]+\.)*lovable\.app$/i,
    /^https?:\/\/([a-z0-9-]+\.)*lovable\.dev$/i,
    /^https?:\/\/([a-z0-9-]+\.)*lovableproject\.com$/i,
  ];

  // Verificar si el origen está permitido
  let isAllowed = false;

  if (origin) {
    // Verificar lista exacta
    isAllowed = allowedOriginsList.includes(origin);

    // Si no está en la lista exacta, verificar patrones
    if (!isAllowed) {
      isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    }
  }

  // Configurar headers CORS si el origen está permitido
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    logger.debug(`CORS allowed for origin: ${origin}`);
  } else if (origin) {
    logger.warn(`CORS blocked for origin: ${origin}`);
  }

  // Headers CORS adicionales
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, X-Api-Key, x-api-key');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
}

/**
 * Middleware CORS para errores - deshabilitado
 * Nginx maneja todos los headers CORS
 */
function corsErrorHandler(err, req, res, next) {
  // CORS manejado por Nginx - solo pasar el error
  next(err);
}

/**
 * Middleware para manejar preflight OPTIONS - deshabilitado
 * Nginx maneja preflight automáticamente
 */
function handlePreflight(req, res, next) {
  // Preflight manejado por Nginx
  next();
}

module.exports = {
  corsStrict,
  corsErrorHandler,
  handlePreflight
};
