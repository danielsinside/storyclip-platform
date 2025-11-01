/**
 * Servicio de validación previa a FFmpeg
 * Evita crashes con códigos raros (234, etc.)
 */

const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');

class ValidationService {
  constructor() {
    this.timeout = 10000; // 10 segundos timeout
  }

  /**
   * Validar URL de video
   */
  async validateVideoUrl(videoUrl) {
    try {
      logger.info(`[VALIDATION] Checking video URL: ${videoUrl}`);
      
      const response = await axios.head(videoUrl, {
        timeout: this.timeout,
        validateStatus: (status) => status < 400
      });

      if (response.status !== 200) {
        throw new Error(`Video URL returned status ${response.status}`);
      }

      // Verificar que sea un tipo de video válido
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('video/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      logger.info(`[VALIDATION] ✅ Video URL is accessible`);
      return true;
    } catch (error) {
      logger.error(`[VALIDATION] ❌ Video URL validation failed: ${error.message}`);
      throw new Error(`INPUT_UNAVAILABLE: Video URL is not accessible - ${error.message}`);
    }
  }

  /**
   * Obtener información del video con ffprobe
   */
  async getVideoInfo(videoUrl) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err, metadata) => {
        if (err) {
          logger.error(`[VALIDATION] ❌ FFprobe failed: ${err.message}`);
          reject(new Error(`INVALID_VIDEO: Cannot analyze video - ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('INVALID_VIDEO: No video stream found'));
          return;
        }

        const duration = parseFloat(metadata.format.duration);
        const width = videoStream.width;
        const height = videoStream.height;

        logger.info(`[VALIDATION] ✅ Video info: ${duration}s, ${width}x${height}`);
        
        resolve({
          duration,
          width,
          height,
          format: metadata.format.format_name,
          streams: metadata.streams.length
        });
      });
    });
  }

  /**
   * Validar rangos de clips
   */
  validateClipRanges(clips, videoDuration) {
    logger.info(`[VALIDATION] Validating ${clips.length} clips against ${videoDuration}s video`);

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const start = parseFloat(clip.start);
      const end = parseFloat(clip.end);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`BAD_RANGE: Clip ${i + 1} has invalid start/end values`);
      }

      if (start < 0) {
        throw new Error(`BAD_RANGE: Clip ${i + 1} start time cannot be negative`);
      }

      if (end <= start) {
        throw new Error(`BAD_RANGE: Clip ${i + 1} end time must be greater than start time`);
      }

      if (end > videoDuration) {
        throw new Error(`BAD_RANGE: Clip ${i + 1} end time (${end}s) exceeds video duration (${videoDuration}s)`);
      }

      logger.info(`[VALIDATION] ✅ Clip ${i + 1}: ${start}s - ${end}s`);
    }

    logger.info(`[VALIDATION] ✅ All clip ranges are valid`);
  }

  /**
   * Validar assets de overlay/subtítulos
   */
  async validateAssets(overlays = [], subtitles = []) {
    logger.info(`[VALIDATION] Validating ${overlays.length} overlays and ${subtitles.length} subtitles`);

    // Validar overlays
    for (let i = 0; i < overlays.length; i++) {
      const overlay = overlays[i];
      if (overlay.type === 'image' && overlay.src) {
        try {
          await fs.access(overlay.src);
          logger.info(`[VALIDATION] ✅ Overlay ${i + 1} file exists: ${overlay.src}`);
        } catch (error) {
          throw new Error(`ASSET_NOT_FOUND: Overlay ${i + 1} file not found: ${overlay.src}`);
        }
      }
    }

    // Validar subtítulos
    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];
      if (subtitle.file) {
        try {
          await fs.access(subtitle.file);
          logger.info(`[VALIDATION] ✅ Subtitle ${i + 1} file exists: ${subtitle.file}`);
        } catch (error) {
          throw new Error(`ASSET_NOT_FOUND: Subtitle ${i + 1} file not found: ${subtitle.file}`);
        }
      }
    }

    logger.info(`[VALIDATION] ✅ All assets are valid`);
  }

  /**
   * Validación completa del processBody
   */
  async validateProcessBody(processBody) {
    logger.info(`[VALIDATION] Starting complete validation of processBody`);

    try {
      // 1. Validar video URL
      if (processBody.videoUrl) {
        await this.validateVideoUrl(processBody.videoUrl);
      }

      // 2. Obtener información del video
      let videoInfo = null;
      if (processBody.videoUrl) {
        videoInfo = await this.getVideoInfo(processBody.videoUrl);
      }

      // 3. Validar clips si existen
      if (processBody.clips && processBody.clips.length > 0 && videoInfo) {
        this.validateClipRanges(processBody.clips, videoInfo.duration);
      }

      // 4. Validar assets
      if (processBody.overlays || processBody.subtitles) {
        await this.validateAssets(processBody.overlays, processBody.subtitles);
      }

      logger.info(`[VALIDATION] ✅ Complete validation passed`);
      return {
        valid: true,
        videoInfo,
        message: 'All validations passed'
      };

    } catch (error) {
      logger.error(`[VALIDATION] ❌ Validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message,
        code: error.message.split(':')[0] || 'VALIDATION_ERROR'
      };
    }
  }
}

module.exports = new ValidationService();
