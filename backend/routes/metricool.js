const express = require('express');
const router = express.Router();
const { authenticateApiKey, requireScope } = require('../middleware/auth');
const MetricoolService = require('../services/metricool.service');
const batchesRepo = require('../services/publish-batches.repository');

// Initialize Metricool service with API key from environment
const metricoolApiKey = process.env.METRICOOL_USER_TOKEN;
if (!metricoolApiKey) {
  console.warn('⚠️  METRICOOL_USER_TOKEN not configured in .env');
}

// Store active batch operations (in-memory for SSE clients)
const activeBatches = new Map();

// Middleware para todas las rutas metricool
router.use(authenticateApiKey);

// GET /api/metricool/stream?batchId=... (SSE: text/event-stream)
router.get('/stream', (req, res) => {
  const { batchId } = req.query;

  if (!batchId) {
    return res.status(400).json({
      error: 'batchId required',
      code: 'MISSING_BATCH_ID'
    });
  }

  const batchState = activeBatches.get(batchId);
  if (!batchState) {
    return res.status(404).json({
      error: 'Batch not found',
      code: 'BATCH_NOT_FOUND'
    });
  }

  // Configurar SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Agregar cliente a la lista
  batchState.sseClients.push(res);

  // Enviar evento de conexión con estado actual
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    batchId: batchId,
    status: batchState.status,
    published: batchState.published,
    errors: batchState.errors,
    total: batchState.total,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Limpiar al cerrar conexión
  req.on('close', () => {
    const index = batchState.sseClients.indexOf(res);
    if (index > -1) {
      batchState.sseClients.splice(index, 1);
    }
  });
});

// GET /api/metricool/brands - Get available Metricool brands/profiles
router.get('/brands', async (req, res) => {
  if (!metricoolApiKey) {
    return res.status(500).json({
      error: 'Metricool API not configured',
      code: 'METRICOOL_NOT_CONFIGURED'
    });
  }

  try {
    const metricool = new MetricoolService(metricoolApiKey);
    const brands = await metricool.getAccounts();

    // Format brands for frontend
    const formattedBrands = Array.isArray(brands) ? brands : (brands.data || []);

    res.json({
      success: true,
      brands: formattedBrands.map(brand => ({
        id: brand.id,
        userId: brand.userId,
        label: brand.label,
        facebook: brand.facebook,
        facebookPageId: brand.facebookPageId,
        instagram: brand.instagram,
        tiktok: brand.tiktok,
        youtube: brand.youtube,
        picture: brand.picture,
        hasInstagram: !!brand.instagram,
        hasFacebook: !!brand.facebook,
        hasTikTok: !!brand.tiktok
      }))
    });

  } catch (error) {
    console.error('Error fetching Metricool brands:', error);
    res.status(500).json({
      error: 'Failed to fetch brands',
      message: error.message
    });
  }
});

// GET /api/metricool/status?batchId=...
router.get('/status', async (req, res) => {
  const { batchId } = req.query;

  if (!batchId) {
    return res.status(400).json({
      error: 'batchId required',
      code: 'MISSING_BATCH_ID'
    });
  }

  try {
    // Try to get from database first (persistent state)
    const batchSummary = await batchesRepo.getBatchSummary(batchId);

    if (batchSummary) {
      return res.json({
        batchId: batchSummary.batchId,
        tenant: req.tenant,
        status: batchSummary.status,
        progress: batchSummary.progress,
        createdAt: batchSummary.createdAt,
        startedAt: batchSummary.startedAt,
        completedAt: batchSummary.completedAt,
        posts: {
          total: batchSummary.total,
          published: batchSummary.published,
          failed: batchSummary.failed
        },
        clips: batchSummary.clips,
        error: batchSummary.error
      });
    }

    // Fallback to in-memory state (for backwards compatibility)
    const batchState = activeBatches.get(batchId);
    if (!batchState) {
      return res.status(404).json({
        error: 'Batch not found',
        code: 'BATCH_NOT_FOUND'
      });
    }

    const progress = batchState.total > 0
      ? Math.round(((batchState.published + batchState.errors) / batchState.total) * 100)
      : 0;

    res.json({
      batchId: batchId,
      tenant: req.tenant,
      status: batchState.status,
      progress: progress,
      createdAt: batchState.createdAt,
      completedAt: batchState.completedAt,
      updatedAt: new Date().toISOString(),
      posts: {
        total: batchState.total,
        published: batchState.published,
        failed: batchState.errors
      },
      currentStory: batchState.currentStory || '',
      currentStatus: batchState.currentStatus || 'idle',
      waitProgress: batchState.waitProgress || { elapsed: 0, total: 0 },
      error: batchState.error
    });
  } catch (error) {
    console.error('Error fetching batch status:', error);
    res.status(500).json({
      error: 'Failed to fetch batch status',
      message: error.message
    });
  }
});

// GET /api/metricool/batches/active - Get user's active batches
router.get('/batches/active', async (req, res) => {
  const userId = req.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json({
      error: 'userId required',
      code: 'MISSING_USER_ID'
    });
  }

  try {
    const activeBatches = await batchesRepo.getUserActiveBatches(userId);

    // Get summaries for each active batch
    const batchSummaries = await Promise.all(
      activeBatches.map(batch => batchesRepo.getBatchSummary(batch.batch_id))
    );

    res.json({
      success: true,
      batches: batchSummaries.filter(b => b !== null),
      count: batchSummaries.length
    });
  } catch (error) {
    console.error('Error fetching active batches:', error);
    res.status(500).json({
      error: 'Failed to fetch active batches',
      message: error.message
    });
  }
});

// GET /api/metricool/batch/:batchId - Get batch summary
router.get('/batch/:batchId', async (req, res) => {
  const { batchId } = req.params;

  try {
    const batchSummary = await batchesRepo.getBatchSummary(batchId);

    if (!batchSummary) {
      return res.status(404).json({
        error: 'Batch not found',
        code: 'BATCH_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      batch: batchSummary
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({
      error: 'Failed to fetch batch',
      message: error.message
    });
  }
});

// POST /api/metricool/publish/stories
router.post('/publish/stories', requireScope('render'), async (req, res) => {
  const { posts, schedule, settings, jobId } = req.body;

  if (!posts || !Array.isArray(posts)) {
    return res.status(400).json({
      error: 'posts array required',
      code: 'MISSING_POSTS'
    });
  }

  if (!metricoolApiKey) {
    return res.status(500).json({
      error: 'Metricool API not configured',
      code: 'METRICOOL_NOT_CONFIGURED'
    });
  }

  const accountId = settings?.accountId || settings?.metricoolAccountId;
  if (!accountId) {
    return res.status(400).json({
      error: 'Metricool account ID required in settings',
      code: 'MISSING_ACCOUNT_ID'
    });
  }

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const publishMode = schedule?.mode || 'now';
  const scheduledFor = schedule?.scheduledAt || null;

  try {
    // Create batch in database (persistent)
    await batchesRepo.createBatch({
      batchId,
      jobId: jobId || null,
      userId: req.userId || null,
      accountId,
      publishMode,
      totalClips: posts.length,
      scheduledFor
    });

    // Add all clips to database
    for (let i = 0; i < posts.length; i++) {
      await batchesRepo.addClip({
        batchId,
        clipIndex: i + 1,
        clipUrl: posts[i].url,
        clipTitle: posts[i].text || `Clip ${i + 1}`,
        scheduledAt: scheduledFor
      });
    }

    console.log(`✅ Created batch ${batchId} in database with ${posts.length} clips`);

    // Initialize in-memory state for SSE
    const batchState = {
      id: batchId,
      status: 'processing',
      total: posts.length,
      published: 0,
      errors: 0,
      details: [],
      createdAt: new Date().toISOString(),
      sseClients: [],
      currentStory: '',
      currentStatus: 'idle',
      waitProgress: { elapsed: 0, total: 0 }
    };

    activeBatches.set(batchId, batchState);

    // Send immediate response
    res.json({
      batchId: batchId,
      tenant: req.tenant,
      status: 'processing',
      posts: {
        total: posts.length,
        queued: posts.length
      },
      schedule: schedule || null,
      settings: settings || {},
      createdAt: batchState.createdAt
    });

    // Start publishing in background
    publishBatch(batchId, posts, settings, schedule).catch(error => {
      console.error(`❌ Batch ${batchId} failed:`, error);
      batchState.status = 'failed';
      batchState.error = error.message;

      // Update DB
      batchesRepo.setBatchError(batchId, error.message).catch(err => {
        console.error('Error updating batch error in DB:', err);
      });

      notifySSEClients(batchId, {
        type: 'error',
        error: error.message
      });
    });

  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({
      error: 'Failed to create batch',
      message: error.message
    });
  }
});

// Background function to publish stories with confirmation
async function publishBatch(batchId, posts, settings, schedule) {
  const batchState = activeBatches.get(batchId);
  if (!batchState) return;

  const publishMode = schedule?.mode || 'now';
  const scheduledAt = schedule?.scheduledAt ? new Date(schedule.scheduledAt) : null;

  console.log(`📤 Starting batch ${batchId} with ${posts.length} stories (mode: ${publishMode})`);
  if (scheduledAt) {
    console.log(`📅 Scheduled for: ${scheduledAt.toISOString()}`);
  }

  const metricool = new MetricoolService(metricoolApiKey);
  const accountId = settings?.accountId || settings?.metricoolAccountId;

  if (!accountId) {
    throw new Error('Metricool account ID not provided in settings');
  }

  try {
    const publishSpeed = settings?.publishSpeed || 'safe';
    console.log(`📊 Publish speed: ${publishSpeed}`);

    const results = await metricool.publishStoriesBatch({
      accountId,
      publishSpeed,
      publishMode,
      scheduledAt,
      stories: posts.map(post => ({
        id: post.id,
        url: post.url,
        text: post.text || '',
      })),
      onProgress: async (progress) => {
        // Update in-memory batch state
        batchState.published = progress.published;
        batchState.errors = progress.errors;
        batchState.currentStory = progress.currentStory;
        batchState.currentStatus = progress.status;
        batchState.waitProgress = progress.waitProgress || { elapsed: 0, total: 0 };

        batchState.details.push({
          storyId: progress.currentStory,
          status: progress.status,
          error: progress.error
        });

        // Update database (persistent state)
        try {
          const clipIndex = progress.current;

          if (progress.status === 'uploading') {
            await batchesRepo.updateClipStatus(batchId, clipIndex, 'uploading');
          } else if (progress.status === 'waiting_confirmation') {
            await batchesRepo.setClipUploaded(batchId, clipIndex, progress.metricoolPostId);
          } else if (progress.status === 'published') {
            await batchesRepo.setClipPublished(batchId, clipIndex, progress.facebookPostId);
          } else if (progress.status === 'failed') {
            await batchesRepo.setClipFailed(batchId, clipIndex, progress.error);
          }

          // Update batch progress
          await batchesRepo.updateBatchProgress(batchId, {
            publishedClips: progress.published,
            failedClips: progress.errors,
            currentClipIndex: clipIndex
          });

        } catch (dbError) {
          console.error('Error updating database:', dbError);
        }

        // Notify SSE clients
        notifySSEClients(batchId, {
          type: 'progress',
          current: progress.current,
          total: progress.total,
          published: progress.published,
          errors: progress.errors,
          currentStory: progress.currentStory,
          status: progress.status
        });
      }
    });

    // Update final state in memory
    batchState.status = 'completed';
    batchState.published = results.published;
    batchState.errors = results.errors;
    batchState.completedAt = new Date().toISOString();

    // Update final state in database
    await batchesRepo.updateBatchStatus(batchId, 'completed');

    console.log(`✅ Batch ${batchId} completed: ${results.published}/${results.total} published`);

    // Notify completion
    notifySSEClients(batchId, {
      type: 'completed',
      published: results.published,
      errors: results.errors,
      total: results.total
    });

  } catch (error) {
    batchState.status = 'failed';
    batchState.error = error.message;

    // Update database
    await batchesRepo.setBatchError(batchId, error.message);

    throw error;
  }
}

// Helper to notify all SSE clients for a batch
function notifySSEClients(batchId, data) {
  const batchState = activeBatches.get(batchId);
  if (!batchState) return;

  const message = JSON.stringify({
    ...data,
    batchId,
    timestamp: new Date().toISOString()
  });

  batchState.sseClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Error sending SSE:', error);
    }
  });
}

// GET /api/metricool/{pause|resume|cancel|retry-failed}?batchId=...
router.get('/pause', (req, res) => {
  const { batchId } = req.query;
  
  if (!batchId) {
    return res.status(400).json({
      error: 'batchId required',
      code: 'MISSING_BATCH_ID'
    });
  }

  res.json({
    batchId: batchId,
    tenant: req.tenant,
    action: 'pause',
    status: 'paused',
    timestamp: new Date().toISOString()
  });
});

router.get('/resume', (req, res) => {
  const { batchId } = req.query;
  
  if (!batchId) {
    return res.status(400).json({
      error: 'batchId required',
      code: 'MISSING_BATCH_ID'
    });
  }

  res.json({
    batchId: batchId,
    tenant: req.tenant,
    action: 'resume',
    status: 'resumed',
    timestamp: new Date().toISOString()
  });
});

router.get('/cancel', (req, res) => {
  const { batchId } = req.query;
  
  if (!batchId) {
    return res.status(400).json({
      error: 'batchId required',
      code: 'MISSING_BATCH_ID'
    });
  }

  res.json({
    batchId: batchId,
    tenant: req.tenant,
    action: 'cancel',
    status: 'cancelled',
    timestamp: new Date().toISOString()
  });
});

router.get('/retry-failed', (req, res) => {
  const { batchId } = req.query;
  
  if (!batchId) {
    return res.status(400).json({
      error: 'batchId required',
      code: 'MISSING_BATCH_ID'
    });
  }

  res.json({
    batchId: batchId,
    tenant: req.tenant,
    action: 'retry-failed',
    status: 'retrying',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;











