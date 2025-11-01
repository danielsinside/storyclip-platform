const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Endpoint de debug para probar el mapeo de parámetros
 */
router.post('/test-mapping', (req, res) => {
  try {
    const { options, body } = req;
    
    // Simular el mapeo que hace el backend
    const processingOptions = {
      clipDuration: options?.slicing?.clip_duration_seconds || options?.clipDuration || 3,
      maxClips: options?.slicing?.clips_total || options?.maxClips || 50,
      quality: options?.quality || 'high',
      startTime: options?.slicing?.start_time || options?.startTime || 0
    };

    res.json({
      success: true,
      input: {
        options: options,
        body: body
      },
      mapped: processingOptions,
      message: 'Mapeo de parámetros verificado'
    });

  } catch (error) {
    logger.error('Error in debug mapping:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para simular el flujo completo
 */
router.post('/simulate-processing', (req, res) => {
  try {
    const { slicing, quality } = req.body;
    
    // Simular el mapeo
    const processingOptions = {
      clipDuration: slicing?.clip_duration_seconds || 3,
      maxClips: slicing?.clips_total || 50,
      quality: quality || 'high',
      startTime: slicing?.start_time || 0
    };

    // Simular configuración de clips
    const clipConfigs = Array(3).fill({ duration: processingOptions.clipDuration });
    
    res.json({
      success: true,
      frontend_input: req.body,
      backend_mapping: processingOptions,
      clip_configs: clipConfigs,
      message: 'Simulación de procesamiento completada'
    });

  } catch (error) {
    logger.error('Error in simulation:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
