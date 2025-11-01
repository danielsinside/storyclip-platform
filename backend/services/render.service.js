const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { buildFFmpegArgs, runFFmpeg } = require('../utils/ffmpeg-builder');

class RenderService {
  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
    this.tempDir = process.env.TEMP_DIR || '/srv/storyclip/tmp';
    this.jobs = new Map();
    this.presets = this.loadPresets();
  }

  loadPresets() {
    try {
      const presetsPath = path.join(__dirname, '../presets/ffmpeg_presets.json');
      if (fs.existsSync(presetsPath)) {
        return JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
      }
    } catch (error) {
      logger.error('Error loading presets:', error);
    }
    
    // Fallback presets
    return [
      {
        id: "storyclip_fast",
        name: "H.264 Rápido",
        cmd: "-vf \"format=yuv420p\" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k"
      }
    ];
  }

  async createRenderJob(params) {
    const {
      preset,
      inputs = [],
      overlays = [],
      output = {},
      metadata = {}
    } = params;

    const jobId = uuidv4();
    const presetConfig = this.presets.find(p => p.id === preset);
    
    if (!presetConfig) {
      throw new Error(`Preset '${preset}' not found`);
    }

    if (!inputs || inputs.length === 0) {
      throw new Error('At least one input is required');
    }

    // Crear directorios
    const workDir = path.join(this.tempDir, 'render', jobId);
    const outputDir = path.join(this.outputDir, 'render', jobId);
    await fs.ensureDir(workDir);
    await fs.ensureDir(outputDir);

    // Configurar job
    const job = {
      id: jobId,
      preset,
      inputs,
      overlays: Array.isArray(overlays) ? overlays : [],
      output: {
        container: 'mp4',
        maxDurationSec: 60,
        ...output
      },
      metadata,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      workDir,
      outputDir,
      outputs: [],
      // HOTFIX: Guardar efectos y filtros
      effects: params.effects || {},
      filters: params.filters || {}
    };

    this.jobs.set(jobId, job);

    // Procesar en background
    this.processRenderJob(jobId).catch(error => {
      logger.error(`Render job ${jobId} failed:`, error);
      this.updateJobStatus(jobId, 'failed', 0, error.message);
    });

    return job;
  }

  async processRenderJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      this.updateJobStatus(jobId, 'processing', 10);

      // Descargar input principal
      const inputPath = path.join(job.workDir, 'input_0.mp4');
      const input = job.inputs[0];
      
      if (input.src || input.url) {
        await this.downloadInput(input.src || input.url, inputPath);
      } else if (input.path) {
        await fs.copy(input.path, inputPath);
      } else {
        throw new Error('Input must have src, url, or path');
      }

      this.updateJobStatus(jobId, 'processing', 30);

      // Descargar overlays si existen
      const overlayPaths = [];
      const overlayConfigs = [];
      
      for (let i = 0; i < job.overlays.length; i++) {
        const overlay = job.overlays[i];
        const overlayPath = path.join(job.workDir, `overlay_${i}${path.extname(overlay.src || overlay.url || '.png')}`);
        
        if (overlay.src || overlay.url) {
          await this.downloadInput(overlay.src || overlay.url, overlayPath);
          overlayPaths.push(overlayPath);
          overlayConfigs.push({
            position: overlay.position || 'top-right',
            opacity: overlay.opacity !== undefined ? overlay.opacity : 1.0
          });
        }
      }

      this.updateJobStatus(jobId, 'processing', 50);

      // Construir comando FFmpeg con el nuevo builder
      const presetConfig = this.presets.find(p => p.id === job.preset);
      const outputPath = path.join(job.outputDir, `output.${job.output.container}`);
      
      const threads = Number(process.env.FFMPEG_THREADS || 2);
      
      const ffmpegArgs = buildFFmpegArgs({
        inputPath,
        overlayPaths,
        overlayConfigs,
        presetCmd: presetConfig.cmd,
        outputPath,
        threads
      });

      // Log para debug
      logger.info(`FFmpeg command for job ${jobId}: ffmpeg ${ffmpegArgs.join(' ')}`);

      // Ejecutar FFmpeg con progress tracking
      await runFFmpeg(ffmpegArgs, logger, (progressData) => {
        // Parsear progress data
        const timeMatch = progressData.match(/out_time_ms=(\d+)/);
        if (timeMatch) {
          const timeMs = parseInt(timeMatch[1]);
          const timeSec = timeMs / 1000000; // microseconds to seconds
          // Asumiendo duración máxima de 60s, calcular progreso
          const maxDuration = job.output.maxDurationSec || 60;
          const progress = Math.min(90, 50 + Math.floor((timeSec / maxDuration) * 40));
          this.updateJobStatus(jobId, 'processing', progress);
        }
      });

      this.updateJobStatus(jobId, 'processing', 90);

      // Verificar output
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        job.outputs.push({
          url: `/outputs/render/${jobId}/output.${job.output.container}`,
          path: outputPath,
          size: stats.size,
          duration: await this.getVideoDuration(outputPath)
        });

        // HOTFIX: Guardar información de filtros aplicados
        job.filtersApplied = {
          preset: job.preset,
          overlays: job.overlays,
          effects: job.effects || {},
          vfCommand: ffmpegArgs.join(' ')
        };
        job.normalizedEffects = job.normalizedEffects || {};
        job.vfCommand = ffmpegArgs.join(' ');

        this.updateJobStatus(jobId, 'completed', 100);
      } else {
        throw new Error('Output file not created');
      }

    } catch (error) {
      logger.error(`Render job ${jobId} failed:`, error);
      this.updateJobStatus(jobId, 'failed', 0, error.message);
    }
  }

  async downloadInput(url, outputPath) {
    const axios = require('axios');
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 60000
    });

    const writer = require('fs').createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  async getVideoDuration(filePath) {
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        filePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(output.trim());
          resolve(isNaN(duration) ? 0 : duration);
        } else {
          resolve(0);
        }
      });

      ffprobe.on('error', () => resolve(0));
    });
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  updateJobStatus(jobId, status, progress, error = null) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      if (error) job.error = error;
      job.updatedAt = new Date().toISOString();
    }
  }
}

module.exports = new RenderService();

