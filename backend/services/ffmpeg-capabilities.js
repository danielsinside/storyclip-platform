/**
 * Servicio de capacidades de FFmpeg
 * Detecta y cachea las capacidades disponibles del FFmpeg instalado
 */

const { spawnSync } = require('child_process');
const logger = require('../utils/logger');

let cache = null;
let lastRefresh = 0;
const TTL_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Parsear filtros desde la salida de ffmpeg -filters
 */
function parseFilters() {
  try {
    const result = spawnSync('/usr/bin/ffmpeg', ['-filters'], { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    const output = result.stdout || '';
    const filters = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Las líneas de filtros tienen formato: " TSC filtername      V->V       Description"
      const match = line.match(/^\s*[T.][S.][C.]\s+(\w+)\s+/);
      if (match) {
        filters.push(match[1]);
      }
    }
    
    return filters;
  } catch (error) {
    logger.error('Error parsing filters list:', error.message);
    return [];
  }
}

/**
 * Parsear encoders desde la salida de ffmpeg -encoders
 */
function parseEncoders() {
  try {
    const result = spawnSync('/usr/bin/ffmpeg', ['-encoders'], { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    const output = result.stdout || '';
    const encoders = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*[VAL.]{6}\s+(\w+)\s+/);
      if (match) {
        encoders.push(match[1]);
      }
    }
    
    return encoders;
  } catch (error) {
    logger.error('Error parsing encoders list:', error.message);
    return [];
  }
}

/**
 * Parsear decoders desde la salida de ffmpeg -decoders
 */
function parseDecoders() {
  try {
    const result = spawnSync('/usr/bin/ffmpeg', ['-decoders'], { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    const output = result.stdout || '';
    const decoders = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*[VAL.]{6}\s+(\w+)\s+/);
      if (match) {
        decoders.push(match[1]);
      }
    }
    
    return decoders;
  } catch (error) {
    logger.error('Error parsing decoders list:', error.message);
    return [];
  }
}

/**
 * Parsear hwaccels desde la salida de ffmpeg -hwaccels
 */
function parseHwAccels() {
  try {
    const result = spawnSync('/usr/bin/ffmpeg', ['-hwaccels'], { 
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });
    
    const output = result.stdout || '';
    return output.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('Hardware acceleration methods:'));
  } catch (error) {
    logger.error('Error parsing hwaccels list:', error.message);
    return [];
  }
}

/**
 * Obtener capacidades de FFmpeg (con cache)
 */
function getCapabilities(forceRefresh = false) {
  const now = Date.now();
  
  // Retornar cache si está válido
  if (cache && !forceRefresh && (now - lastRefresh) < TTL_MS) {
    return cache;
  }
  
  logger.info('Refreshing FFmpeg capabilities...');
  
  try {
    const filters = parseFilters();
    const encoders = parseEncoders();
    const decoders = parseDecoders();
    const hwaccels = parseHwAccels();
    
    cache = {
      filters,
      encoders,
      decoders,
      hwaccels,
      refreshedAt: new Date().toISOString(),
      version: getFFmpegVersion()
    };
    
    lastRefresh = now;
    
    logger.info(`FFmpeg capabilities cached: ${filters.length} filters, ${encoders.length} encoders, ${decoders.length} decoders, ${hwaccels.length} hwaccels`);
    
    return cache;
  } catch (error) {
    logger.error('Error getting FFmpeg capabilities:', error);
    
    // Si falla, retornar cache anterior o un objeto vacío
    return cache || {
      filters: [],
      encoders: [],
      decoders: [],
      hwaccels: [],
      refreshedAt: new Date().toISOString(),
      version: 'unknown',
      error: error.message
    };
  }
}

/**
 * Obtener versión de FFmpeg
 */
function getFFmpegVersion() {
  try {
    const result = spawnSync('/usr/bin/ffmpeg', ['-version'], { 
      encoding: 'utf8'
    });
    
    const output = result.stdout || '';
    const match = output.match(/ffmpeg version ([^\s]+)/);
    return match ? match[1] : 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Verificar si un filtro está disponible
 */
function hasFilter(filterName) {
  const caps = getCapabilities();
  return caps.filters.includes(filterName);
}

/**
 * Verificar si múltiples filtros están disponibles
 */
function hasFilters(filterNames) {
  const caps = getCapabilities();
  const missing = filterNames.filter(name => !caps.filters.includes(name));
  return {
    available: missing.length === 0,
    missing
  };
}

module.exports = {
  getCapabilities,
  hasFilter,
  hasFilters,
  parseFilters,
  parseEncoders,
  parseDecoders,
  parseHwAccels
};
