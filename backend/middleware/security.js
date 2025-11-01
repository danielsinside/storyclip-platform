const rateLimit = require('express-rate-limit');

// Rate limiting por tenant
const createTenantRateLimit = (windowMs = 60000, max = 60) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    keyGenerator: (req) => {
      return req.tenant || req.ip;
    },
    message: {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Rate limit por tenant (60 req/min)
const tenantRateLimit = createTenantRateLimit(60000, 60);

// Middleware de logging con tenant
function tenantLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      tenant: req.tenant || 'unknown',
      ip: req.ip,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent')
    };
    
    console.log(JSON.stringify(logData));
  });
  
  next();
}

// Middleware de límite de tamaño JSON
function jsonSizeLimit(maxSize = 5 * 1024 * 1024) { // 5MB por defecto
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload too large',
        code: 'PAYLOAD_TOO_LARGE',
        maxSize: maxSize,
        received: contentLength
      });
    }
    
    next();
  };
}

module.exports = {
  tenantRateLimit,
  tenantLogger,
  jsonSizeLimit
};
