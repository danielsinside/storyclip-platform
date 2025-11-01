const express = require('express');
const router = express.Router();
const { m_svt_av1_available, m_queue_depth } = require('../src/metrics');
const { readDevMetrics, writeDevMetrics } = require('../src/devMetrics');

router.post('/dev/metrics', (req, res) => {
  const body = req.body || {};
  const cfg = readDevMetrics();
  const token = req.headers['x-dev-token'] || body.token;
  
  if (token !== cfg.token) {
    return res.status(403).json({ error: 'forbidden' });
  }

  if (typeof body.svt_av1_available === 'number') {
    m_svt_av1_available.set(body.svt_av1_available ? 1 : 0);
    cfg.svt_av1_available = body.svt_av1_available ? 1 : 0;
  }
  
  if (typeof body.queue_depth === 'number') {
    m_queue_depth.set(Math.max(0, body.queue_depth));
    cfg.queue_depth = body.queue_depth;
  }

  writeDevMetrics(cfg);
  res.json({ ok: true, cfg });
});

module.exports = router;
