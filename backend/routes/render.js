const express = require('express');
const renderService = require('../services/render.service');
const logger = require('../utils/logger');

const router = express.Router();

// Crear job de render
router.post('/render', async (req, res) => {
  try {
    const {
      preset,
      inputs,
      overlays,
      output,
      metadata
    } = req.body;

    // Validaciones básicas
    if (!preset) {
      return res.status(400).json({
        error: 'Preset is required'
      });
    }

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return res.status(400).json({
        error: 'At least one input is required'
      });
    }

    // Crear job
    const job = await renderService.createRenderJob({
      preset,
      inputs,
      overlays,
      output,
      metadata
    });

    logger.info(`Render job created: ${job.id} with preset: ${preset}`);

    res.status(201).json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt
    });

  } catch (error) {
    logger.error('Error creating render job:', error);
    res.status(500).json({
      error: 'Failed to create render job',
      message: error.message
    });
  }
});

// Obtener estado de job
router.get('/render/:id', (req, res) => {
  try {
    const { id } = req.params;
    const job = renderService.getJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json({
      jobId: id,
      preset: job.preset,
      status: job.status,
      progress: job.progress,
      outputs: job.outputs,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      metadata: job.metadata,
      // HOTFIX: Incluir información de filtros aplicados
      filters: {
        applied: job.filtersApplied || {},
        normalized: job.normalizedEffects || {},
        vfCommand: job.vfCommand || null
      },
      overlays: job.overlays || [],
      effects: job.effects || {}
    });

  } catch (error) {
    logger.error('Error getting render job:', error);
    res.status(500).json({
      error: 'Failed to get render job',
      message: error.message
    });
  }
});

// Listar todos los jobs
router.get('/render', (req, res) => {
  try {
    const jobs = renderService.getAllJobs();
    
    res.json({
      jobs: jobs.map(job => ({
        jobId: job.id,
        preset: job.preset,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
    });

  } catch (error) {
    logger.error('Error listing render jobs:', error);
    res.status(500).json({
      error: 'Failed to list render jobs',
      message: error.message
    });
  }
});

// Cancelar job
router.delete('/render/:id', (req, res) => {
  try {
    const { id } = req.params;
    const job = renderService.getJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({
        error: 'Cannot cancel completed or failed job'
      });
    }

    // Marcar como cancelado
    renderService.updateJobStatus(id, 'cancelled', job.progress, 'Job cancelled by user');

    res.json({
      success: true,
      message: 'Job cancelled'
    });

  } catch (error) {
    logger.error('Error cancelling render job:', error);
    res.status(500).json({
      error: 'Failed to cancel render job',
      message: error.message
    });
  }
});

// Benchmark endpoints
router.post('/benchmark', async (req, res) => {
  try {
    const { codec, duration = 60, inputUrl } = req.body;

    if (!inputUrl) {
      return res.status(400).json({
        error: 'Input URL is required for benchmark'
      });
    }

    const benchmarkId = `benchmark_${Date.now()}`;
    const workDir = `/tmp/benchmark_${benchmarkId}`;
    await require('fs-extra').ensureDir(workDir);

    let ffmpegArgs;
    const outputPath = `${workDir}/output.${codec === 'av1' ? 'mkv' : 'mp4'}`;

    switch (codec) {
      case 'h264':
        ffmpegArgs = [
          '-hide_banner', '-y', '-i', inputUrl, '-t', duration.toString(),
          '-vf', 'scale=1920:-2,format=yuv420p',
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
          '-c:a', 'aac', '-b:a', '160k', outputPath
        ];
        break;
      
      case 'hevc':
        ffmpegArgs = [
          '-hide_banner', '-y', '-i', inputUrl, '-t', duration.toString(),
          '-vf', 'format=yuv420p10le',
          '-c:v', 'libx265', '-preset', 'slow', '-crf', '21',
          '-c:a', 'aac', '-b:a', '160k', outputPath
        ];
        break;
      
      case 'av1':
        ffmpegArgs = [
          '-hide_banner', '-y', '-i', inputUrl, '-t', duration.toString(),
          '-vf', 'scale=1920:-2,format=yuv420p',
          '-c:v', 'libaom-av1', '-crf', '30', '-b:v', '0', '-cpu-used', '6', '-row-mt', '1', '-tiles', '2x2',
          '-c:a', 'aac', '-b:a', '160k', outputPath
        ];
        break;
      
      default:
        return res.status(400).json({
          error: 'Unsupported codec. Use: h264, hevc, or av1'
        });
    }

    const startTime = Date.now();
    
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: 'pipe' });

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    await new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed: ${stderr}`));
        }
      });
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    const stats = await require('fs-extra').stat(outputPath);
    const fileSize = stats.size;

    // Limpiar archivos temporales
    await require('fs-extra').remove(workDir);

    res.json({
      success: true,
      benchmark: {
        codec,
        duration: processingTime / 1000, // segundos
        fileSize,
        speed: processingTime / 1000 / parseInt(duration), // x realtime
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Benchmark failed:', error);
    res.status(500).json({
      error: 'Benchmark failed',
      message: error.message
    });
  }
});

module.exports = router;
