const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

/**
 * Limpieza automática de archivos temporales
 * Elimina archivos huérfanos y antiguos de /tmp/uploads
 */
class CleanupService {
  constructor() {
    this.uploadDir = '/tmp/uploads';
    this.maxAge = 24 * 60 * 60 * 1000; // 24 horas
  }

  /**
   * Limpia archivos temporales antiguos de un directorio
   */
  async cleanupDirectory(directory, maxAgeHours = 24) {
    try {
      if (!await fs.pathExists(directory)) {
        logger.debug(`Directory ${directory} does not exist, skipping cleanup`);
        return { count: 0, size: 0 };
      }

      const files = await fs.readdir(directory);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let cleanedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(directory, file);

        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();

          // Eliminar archivos/directorios más antiguos que maxAge
          if (age > maxAge) {
            // IMPORTANTE: Solo eliminar si es archivo o directorio vacío/antiguo
            if (stats.isFile()) {
              await fs.unlink(filePath);
              cleanedCount++;
              totalSize += stats.size;
              logger.debug(`Cleaned file: ${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
            } else if (stats.isDirectory()) {
              // Solo eliminar directorios vacíos o antiguos
              const dirFiles = await fs.readdir(filePath);
              if (dirFiles.length === 0 || age > maxAge) {
                await fs.remove(filePath);
                cleanedCount++;
                logger.debug(`Cleaned directory: ${file}`);
              }
            }
          }
        } catch (error) {
          // Ignorar errores EISDIR (intentar unlink en directorio)
          if (error.code !== 'EISDIR') {
            logger.warn(`Error processing ${file}:`, error.message);
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned ${directory}: ${cleanedCount} items removed, ${(totalSize / 1024 / 1024).toFixed(2)}MB freed`);
      }

      return { count: cleanedCount, size: totalSize };

    } catch (error) {
      logger.error(`Error cleaning ${directory}:`, error.message);
      return { count: 0, size: 0 };
    }
  }

  /**
   * Limpia archivos temporales antiguos
   */
  async cleanupTempFiles() {
    try {
      const tempDirs = [
        '/tmp/uploads',
        '/srv/storyclip/tmp',
        '/srv/storyclip/tmp/uploads',
        '/srv/storyclip/work'
      ];

      let totalCleaned = 0;
      let totalSize = 0;

      for (const dir of tempDirs) {
        const result = await this.cleanupDirectory(dir, 24);
        totalCleaned += result.count;
        totalSize += result.size;
      }

      if (totalCleaned > 0) {
        logger.info(`Total cleanup: ${totalCleaned} items removed, ${(totalSize / 1024 / 1024).toFixed(2)}MB freed`);
      } else {
        logger.debug('No files to clean up');
      }

    } catch (error) {
      logger.error('Error during cleanup:', error.message);
    }
  }

  /**
   * Limpia outputs antiguos (jobs completados hace más de X días)
   */
  async cleanupOldOutputs(daysOld = 7) {
    try {
      const outputDir = process.env.OUTPUT_DIR || '/srv/storyclip/outputs';
      
      if (!await fs.pathExists(outputDir)) {
        logger.debug('Output directory does not exist, skipping cleanup');
        return;
      }

      const jobs = await fs.readdir(outputDir);
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let cleanedCount = 0;

      for (const jobId of jobs) {
        const jobPath = path.join(outputDir, jobId);
        
        try {
          const stats = await fs.stat(jobPath);
          
          if (!stats.isDirectory()) continue;
          
          const age = now - stats.mtime.getTime();
          
          if (age > maxAge) {
            await fs.remove(jobPath);
            cleanedCount++;
            logger.info(`Cleaned old job output: ${jobId}`);
          }
        } catch (error) {
          logger.warn(`Error processing job ${jobId}:`, error.message);
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Output cleanup completed: ${cleanedCount} job directories removed`);
      }

    } catch (error) {
      logger.error('Error during output cleanup:', error.message);
    }
  }

  /**
   * Inicia limpieza periódica
   */
  startPeriodicCleanup() {
    // Limpieza cada 6 horas
    const interval = 6 * 60 * 60 * 1000;
    
    setInterval(async () => {
      logger.info('Starting periodic cleanup...');
      await this.cleanupTempFiles();
      await this.cleanupOldOutputs();
    }, interval);

    logger.info('Periodic cleanup started (every 6 hours)');
  }
}

module.exports = new CleanupService();
