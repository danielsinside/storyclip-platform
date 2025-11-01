/**
 * Watchdog para detectar y marcar como failed los jobs atascados
 */

const logger = require('../utils/logger');
const db = require('../database/db');

const STALL_MS = 2 * 60 * 1000; // 2 minutos (reducido de 5)

/**
 * Busca jobs en processing que llevan mucho tiempo sin actualizarse
 */
async function watchdogStalledJobs() {
  try {
    const now = Date.now();
    const threshold = new Date(now - STALL_MS).toISOString();

    // Buscar jobs atascados en cualquier progreso >= 50%
    const stalledJobs = await db.query(`
      SELECT job_id, created_at, started_at, progress, status
      FROM jobs
      WHERE status IN ('running', 'processing', 'queued')
        AND (
          (progress >= 50 AND started_at < ?)
          OR (progress >= 90 AND created_at < ?)
          OR (status = 'queued' AND created_at < ?)
        )
    `, [threshold, threshold, new Date(now - 10 * 60 * 1000).toISOString()]); // Jobs queued por más de 10 min

    if (stalledJobs.length > 0) {
      logger.warn(`Found ${stalledJobs.length} stalled jobs`);

      for (const job of stalledJobs) {
        const errorMsg = job.progress >= 90
          ? 'Stalled at 90%+ - finalize step likely failed'
          : job.progress >= 50
          ? `Stalled at ${job.progress}% - processing likely failed`
          : 'Stalled in queue - never started processing';

        await db.run(`
          UPDATE jobs
          SET status = 'error',
              error_msg = ?,
              finished_at = ?
          WHERE job_id = ?
        `, [errorMsg, new Date().toISOString(), job.job_id]);

        logger.error(`Stalled job marked as failed: ${job.job_id} (was at ${job.progress}%)`);

        // Cleanup: Limpiar archivos temporales del job fallido
        const workDir = `/srv/storyclip/work/${job.job_id}`;
        const fs = require('fs-extra');
        await fs.remove(workDir).catch(err => {
          logger.warn(`Could not cleanup work dir for ${job.job_id}:`, err.message);
        });
      }
    }
  } catch (error) {
    logger.error('Watchdog error:', error);
  }
}

/**
 * Iniciar el watchdog (ejecutar cada 60 segundos)
 */
function startWatchdog() {
  logger.info('Starting watchdog service...');
  
  // Ejecutar inmediatamente
  watchdogStalledJobs().catch(err => {
    logger.error('Initial watchdog run failed:', err);
  });

  // Ejecutar cada 60 segundos
  const interval = setInterval(() => {
    watchdogStalledJobs().catch(err => {
      logger.error('Watchdog interval run failed:', err);
    });
  }, 60_000);

  logger.success('Watchdog service started');
  
  return interval;
}

/**
 * Alias para startWatchdog (para compatibilidad)
 */
function start() {
  return startWatchdog();
}

module.exports = {
  watchdogStalledJobs,
  startWatchdog,
  start
};
