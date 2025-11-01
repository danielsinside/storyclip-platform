const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../middleware/error');

class DownloadService {
  constructor() {
    this.tempDir = process.env.TEMP_DIR || '/srv/storyclip/tmp';
    this.maxFileSize = 10 * 1024 * 1024 * 1024; // 10GB
    this.timeout = 30000; // 30 segundos
  }

  // Descargar video desde URL
  async downloadVideo(url, options = {}) {
    const {
      filename = null,
      validateUrl = true
    } = options;

    try {
      if (validateUrl && !this.isValidUrl(url)) {
        throw new ValidationError('Invalid URL provided');
      }

      // Asegurar que el directorio temporal existe
      await fs.ensureDir(this.tempDir);

      // Generar nombre de archivo único
      const fileExtension = this.getFileExtension(url) || 'mp4';
      const finalFilename = filename || `${uuidv4()}.${fileExtension}`;
      const filePath = path.join(this.tempDir, finalFilename);

      logger.info(`Downloading video from: ${url}`);
      logger.info(`Saving to: ${filePath}`);

      // Configurar axios para descarga
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: this.timeout,
        headers: {
          'User-Agent': 'StoryClip-Backend/1.0'
        },
        maxContentLength: this.maxFileSize,
        maxRedirects: 5
      });

      // Validar content-type
      const contentType = response.headers['content-type'];
      if (!this.isValidVideoContentType(contentType)) {
        throw new ValidationError(`Invalid content type: ${contentType}`);
      }

      // Validar tamaño del archivo
      const contentLength = parseInt(response.headers['content-length']);
      if (contentLength && contentLength > this.maxFileSize) {
        throw new ValidationError(`File too large: ${contentLength} bytes`);
      }

      // Crear stream de escritura
      const writer = fs.createWriteStream(filePath);
      
      // Pipe del stream de respuesta al archivo
      response.data.pipe(writer);

      // Retornar promesa que se resuelve cuando la descarga termina
      return new Promise((resolve, reject) => {
        let downloadedBytes = 0;

        response.data.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          
          // Verificar tamaño durante la descarga
          if (downloadedBytes > this.maxFileSize) {
            writer.close();
            fs.unlink(filePath).catch(() => {});
            reject(new ValidationError('File too large during download'));
          }
        });

        writer.on('finish', async () => {
          try {
            // Verificar que el archivo se descargó correctamente
            const stats = await fs.stat(filePath);
            if (stats.size === 0) {
              throw new Error('Downloaded file is empty');
            }

            logger.success(`Video downloaded successfully: ${filePath} (${stats.size} bytes)`);
            resolve({
              filePath,
              filename: finalFilename,
              size: stats.size,
              contentType,
              originalUrl: url
            });
          } catch (error) {
            logger.error('Error verifying downloaded file:', error.message);
            reject(error);
          }
        });

        writer.on('error', (error) => {
          logger.error('Error writing file:', error.message);
          fs.unlink(filePath).catch(() => {});
          reject(error);
        });

        response.data.on('error', (error) => {
          logger.error('Error downloading file:', error.message);
          writer.close();
          fs.unlink(filePath).catch(() => {});
          reject(error);
        });
      });

    } catch (error) {
      logger.error('Download error:', error.message);
      
      if (error.code === 'ENOTFOUND') {
        throw new ValidationError('URL not found or unreachable');
      } else if (error.code === 'ECONNABORTED') {
        throw new ValidationError('Download timeout');
      } else if (error.response) {
        throw new ValidationError(`HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      
      throw error;
    }
  }

  // Descargar desde múltiples URLs (fallback)
  async downloadWithFallback(urls, options = {}) {
    const errors = [];

    for (const url of urls) {
      try {
        logger.info(`Trying to download from: ${url}`);
        const result = await this.downloadVideo(url, options);
        logger.success(`Successfully downloaded from: ${url}`);
        return result;
      } catch (error) {
        logger.warn(`Failed to download from ${url}:`, error.message);
        errors.push({ url, error: error.message });
      }
    }

    throw new Error(`All download attempts failed. Errors: ${JSON.stringify(errors)}`);
  }

  // Limpiar archivo temporal
  async cleanupFile(filePath) {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.unlink(filePath);
        logger.info(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      logger.error('Error cleaning up file:', error.message);
    }
  }

  // Limpiar archivos temporales antiguos
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // convertir a milisegundos
      
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      logger.info(`Cleaned up ${cleanedCount} old temporary files`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up old files:', error.message);
      return 0;
    }
  }

  // Validar URL
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
      return false;
    }
  }

  // Obtener extensión de archivo desde URL
  getFileExtension(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = path.extname(pathname).toLowerCase();
      return extension ? extension.substring(1) : null;
    } catch (_) {
      return null;
    }
  }

  // Validar content-type de video
  isValidVideoContentType(contentType) {
    const validTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv',
      'video/quicktime',
      'application/octet-stream' // algunos servidores no especifican el tipo
    ];

    return validTypes.some(type => contentType.includes(type));
  }

  // Obtener información del archivo
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new NotFoundError(`File not found: ${filePath}`);
    }
  }

  // Verificar espacio disponible
  async checkDiskSpace() {
    try {
      const stats = await fs.stat(this.tempDir);
      // Esta es una implementación básica, en producción usaría una librería como 'diskusage'
      return {
        available: true, // simplificado
        path: this.tempDir
      };
    } catch (error) {
      logger.error('Error checking disk space:', error.message);
      return { available: false, error: error.message };
    }
  }
}

module.exports = new DownloadService();

