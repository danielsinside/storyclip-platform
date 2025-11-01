const express = require('express');
const router = express.Router();
const { authenticateApiKey, requireScope } = require('../middleware/auth');
const { metricsHandler } = require('../src/metrics');

// Middleware para todas las rutas tenant
router.use(authenticateApiKey);

// GET /api/t/:tenant/capabilities
router.get('/t/:tenant/capabilities', (req, res) => {
  const { tenant } = req.params;
  
  if (tenant !== req.tenant) {
    return res.status(403).json({
      error: 'Tenant mismatch',
      code: 'TENANT_MISMATCH'
    });
  }

  // Lógica de capabilities (reutilizar del endpoint existente)
  const capabilities = {
    engine: 'ffmpeg',
    version: '8.0',
    codecs: {
      x264: true,
      x265: true,
      av1_svt: true,
      av1_aom: true
    },
    filters: {
      drawtext: true,
      scale: true,
      crop: true
    },
    tenant: tenant,
    scopes: req.scopes
  };

  res.json(capabilities);
});

// GET /api/t/:tenant/presets
router.get('/t/:tenant/presets', (req, res) => {
  const { tenant } = req.params;
  
  if (tenant !== req.tenant) {
    return res.status(403).json({
      error: 'Tenant mismatch',
      code: 'TENANT_MISMATCH'
    });
  }

  // Presets específicos por tenant
  const presets = {
    stories: [
      { id: 'storyclip_social_916', name: 'Stories 9:16', description: 'Optimizado para Stories' },
      { id: 'storyclip_social_11', name: 'Stories 1:1', description: 'Cuadrado para Stories' }
    ],
    reels: [
      { id: 'storyclip_social_916', name: 'Reels 9:16', description: 'Optimizado para Reels' },
      { id: 'storyclip_social_11', name: 'Reels 1:1', description: 'Cuadrado para Reels' }
    ],
    videoanalyzer: [
      { id: 'analyzer_quality', name: 'Quality Analysis', description: 'Análisis de calidad' },
      { id: 'analyzer_metrics', name: 'Metrics Analysis', description: 'Análisis de métricas' }
    ],
    genai: [
      { id: 'genai_creative', name: 'Creative Generation', description: 'Generación creativa' },
      { id: 'genai_optimized', name: 'Optimized Generation', description: 'Generación optimizada' }
    ]
  };

  res.json({
    tenant: tenant,
    presets: presets[tenant] || []
  });
});

// POST /api/t/:tenant/render
router.post('/t/:tenant/render', requireScope('render'), (req, res) => {
  const { tenant } = req.params;
  
  if (tenant !== req.tenant) {
    return res.status(403).json({
      error: 'Tenant mismatch',
      code: 'TENANT_MISMATCH'
    });
  }

  // Lógica de render (reutilizar del endpoint existente)
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    jobId: jobId,
    tenant: tenant,
    status: 'queued',
    createdAt: new Date().toISOString()
  });
});

// GET /api/t/:tenant/jobs/:id
router.get('/t/:tenant/jobs/:id', (req, res) => {
  const { tenant, id } = req.params;
  
  if (tenant !== req.tenant) {
    return res.status(403).json({
      error: 'Tenant mismatch',
      code: 'TENANT_MISMATCH'
    });
  }

  // Lógica de job status (reutilizar del endpoint existente)
  res.json({
    jobId: id,
    tenant: tenant,
    status: 'completed',
    progress: 100,
    result: {
      url: `https://api.creatorsflow.app/outputs/${id}/output.mp4`
    }
  });
});

// POST /api/t/videoanalyzer/analyze
router.post('/t/videoanalyzer/analyze', requireScope('analyze'), (req, res) => {
  const { tenant } = req.params;
  
  if (tenant !== 'videoanalyzer') {
    return res.status(403).json({
      error: 'Invalid tenant for analyze endpoint',
      code: 'INVALID_TENANT'
    });
  }

  // Lógica de análisis de video
  const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    analysisId: analysisId,
    tenant: tenant,
    status: 'processing',
    createdAt: new Date().toISOString()
  });
});

module.exports = router;
