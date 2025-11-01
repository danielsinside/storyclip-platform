const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Health check unificado
 */
router.get('/health/unified', (req, res) => {
  try {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    res.json({
      ok: true,
      service: 'StoryClip Backend',
      version: '1.0.0',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      allowedOrigins,
      cors: {
        enabled: true,
        origins: allowedOrigins.length,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Idempotency-Key', 'X-Flow-Id', 'X-Test-Source', 'X-Source', 'Authorization']
      },
      system: {
        unified_processing: true,
        realtime_enabled: process.env.REALTIME_ENABLED === 'true',
        upload_direct_enabled: process.env.ALLOW_UPLOAD_DIRECT_TEST === 'true',
        auth_required: process.env.REQUIRE_AUTH === 'true'
      }
    });
  } catch (error) {
    logger.error('Health check error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Echo endpoint para debug de CORS
 */
router.options('/echo', (req, res) => {
  res.status(204).end();
});

router.get('/echo', (req, res) => {
  res.json({
    origin: req.headers.origin || null,
    received: true,
    timestamp: new Date().toISOString(),
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    }
  });
});

/**
 * Health check simple
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * Health check detallado del sistema
 */
router.get('/health/detailed', async (req, res) => {
  try {
    const fs = require('fs-extra');
    const path = require('path');
    
    // Verificar directorios
    const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
    const tempDir = process.env.TEMP_DIR || '/srv/storyclip/tmp';
    
    const outputDirExists = await fs.pathExists(outputDir);
    const tempDirExists = await fs.pathExists(tempDir);
    
    // Verificar base de datos
    const db = require('../database/db');
    let dbStatus = 'unknown';
    try {
      await db.get('SELECT 1');
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
    }
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      directories: {
        output: { path: outputDir, exists: outputDirExists },
        temp: { path: tempDir, exists: tempDirExists }
      },
      database: {
        status: dbStatus,
        path: process.env.DATABASE_PATH || '/srv/storyclip/database/storyclip.db'
      },
      environment: {
        node_env: process.env.NODE_ENV,
        port: process.env.PORT,
        host: process.env.HOST
      }
    });
  } catch (error) {
    logger.error('Detailed health check error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
