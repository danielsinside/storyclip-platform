const crypto = require('crypto');

// API Keys por tenant
const API_KEYS = {
  'stories': 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3',
  'reels': 'sk_2d3857dc286a003cc5c8986030d33b57a117867020cb416c9257d2e20e71f228',
  'videoanalyzer': 'sk_6c661489882f07a55fd3f2e9b4fad6f044aeb660abbd1bc3c02189ac26529d38',
  'genai': 'sk_b74decf7ff977afd222232a09399bedc011266cc4d0b19ccf39b64e6cdb84f9e'
};

// Scopes por tenant
const TENANT_SCOPES = {
  'stories': ['render', 'presets', 'capabilities'],
  'reels': ['render', 'presets', 'capabilities'],
  'videoanalyzer': ['analyze', 'presets', 'capabilities'],
  'genai': ['render', 'presets', 'capabilities']
};

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }

  // Buscar tenant por API key
  const tenant = Object.keys(API_KEYS).find(t => API_KEYS[t] === apiKey);
  
  if (!tenant) {
    return res.status(401).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }

  // Añadir tenant y scopes al request
  req.tenant = tenant;
  req.scopes = TENANT_SCOPES[tenant];
  
  next();
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.scopes || !req.scopes.includes(scope)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_SCOPE',
        required: scope,
        available: req.scopes
      });
    }
    next();
  };
}

// Middleware opcional de autenticación
function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey) {
    // Si hay API key, validarla
    const tenant = Object.keys(API_KEYS).find(t => API_KEYS[t] === apiKey);
    if (tenant) {
      req.tenant = tenant;
      req.scopes = TENANT_SCOPES[tenant];
    }
  }
  
  // Continuar sin autenticación obligatoria
  next();
}

// Alias para authenticateToken (compatibilidad)
const authenticateToken = authenticateApiKey;

// Middleware para webhooks (sin autenticación por ahora)
function authenticateWebhook(req, res, next) {
  // Por ahora, permitir todos los webhooks
  // En producción, validar firma o token
  next();
}

module.exports = {
  authenticateApiKey,
  authenticateToken,
  authenticateWebhook,
  requireScope,
  optionalAuth,
  API_KEYS,
  TENANT_SCOPES
};
