/**
 * Endpoint de capacidades del sistema
 * Expone información sobre FFmpeg y efectos disponibles
 */

const express = require('express');
const router = express.Router();
const { getCapabilities } = require('../services/ffmpeg-capabilities');
const { effects } = require('../services/effectsRegistry');
const logger = require('../utils/logger');

/**
 * GET /api/capabilities
 * Retorna las capacidades de FFmpeg y efectos disponibles
 */
router.get('/api/capabilities', (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const caps = getCapabilities(forceRefresh);
    
    // Lista de efectos disponibles
    const availableEffects = Object.keys(effects).map(key => ({
      name: key,
      description: effects[key].description,
      requiresFilters: effects[key].requiresFilters,
      available: effects[key].requiresFilters.every(f => caps.filters.includes(f))
    }));
    
    res.json({
      ok: true,
      engine: 'ffmpeg',
      version: caps.version,
      refreshedAt: caps.refreshedAt,
      capabilities: {
        filters: caps.filters,
        encoders: caps.encoders,
        decoders: caps.decoders,
        hwaccels: caps.hwaccels
      },
      effects: availableEffects,
      stats: {
        totalFilters: caps.filters.length,
        totalEncoders: caps.encoders.length,
        totalDecoders: caps.decoders.length,
        totalHwAccels: caps.hwaccels.length,
        availableEffects: availableEffects.filter(e => e.available).length,
        unavailableEffects: availableEffects.filter(e => !e.available).length
      }
    });
  } catch (error) {
    logger.error('Error getting capabilities:', error);
    res.status(500).json({
      ok: false,
      error: 'CAPABILITIES_ERROR',
      message: error.message
    });
  }
});

module.exports = router;







