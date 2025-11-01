/**
 * Utilidades para sanitizar y validar filtros de video
 */

/**
 * Función para sanitizar y validar filtros
 */
function sanitizeFilters(filters) {
  if (!filters || typeof filters !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  // Brightness: -1.0 a 1.0 (0 = sin cambio)
  if (filters.brightness !== undefined) {
    sanitized.brightness = Math.max(-1, Math.min(1, parseFloat(filters.brightness) || 0));
  }
  
  // Contrast: 0.0 a 3.0 (1 = sin cambio)
  if (filters.contrast !== undefined) {
    sanitized.contrast = Math.max(0, Math.min(3, parseFloat(filters.contrast) || 1));
  }
  
  // Saturation: 0.0 a 3.0 (1 = sin cambio)
  if (filters.saturation !== undefined) {
    sanitized.saturation = Math.max(0, Math.min(3, parseFloat(filters.saturation) || 1));
  }
  
  // Hue: -180 a 180 (0 = sin cambio)
  if (filters.hue !== undefined) {
    sanitized.hue = Math.max(-180, Math.min(180, parseFloat(filters.hue) || 0));
  }
  
  // Blur: 0 a 20 (0 = sin blur)
  if (filters.blur !== undefined) {
    sanitized.blur = Math.max(0, Math.min(20, parseFloat(filters.blur) || 0));
  }
  
  // Sharpen: 0 a 5 (0 = sin sharpen)
  if (filters.sharpen !== undefined) {
    sanitized.sharpen = Math.max(0, Math.min(5, parseFloat(filters.sharpen) || 0));
  }
  
  // Vignette: 0 a 1 (0 = sin vignette)
  if (filters.vignette !== undefined) {
    sanitized.vignette = Math.max(0, Math.min(1, parseFloat(filters.vignette) || 0));
  }
  
  // Speed: 0.25 a 4.0 (1 = velocidad normal)
  if (filters.speed !== undefined) {
    sanitized.speed = Math.max(0.25, Math.min(4, parseFloat(filters.speed) || 1));
  }
  
  // Zoom: 1.0 a 2.0 (1 = sin zoom)
  if (filters.zoom !== undefined) {
    sanitized.zoom = Math.max(1, Math.min(2, parseFloat(filters.zoom) || 1));
  }
  
  // Rotate: 0, 90, 180, 270
  if (filters.rotate !== undefined) {
    const validRotations = [0, 90, 180, 270];
    sanitized.rotate = validRotations.includes(parseInt(filters.rotate)) ? parseInt(filters.rotate) : 0;
  }
  
  // Flip: "horizontal", "vertical", "both", "none"
  if (filters.flip !== undefined) {
    const validFlips = ["horizontal", "vertical", "both", "none"];
    sanitized.flip = validFlips.includes(filters.flip) ? filters.flip : "none";
  }
  
  // Color Temperature: -100 a 100 (0 = sin cambio)
  if (filters.temperature !== undefined) {
    sanitized.temperature = Math.max(-100, Math.min(100, parseFloat(filters.temperature) || 0));
  }
  
  // Exposure: -2.0 a 2.0 (0 = sin cambio)
  if (filters.exposure !== undefined) {
    sanitized.exposure = Math.max(-2, Math.min(2, parseFloat(filters.exposure) || 0));
  }
  
  return sanitized;
}

module.exports = {
  sanitizeFilters
};
