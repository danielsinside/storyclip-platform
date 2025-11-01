/**
 * Sistema centralizado de gestión de jobs
 * Mantiene el estado de todos los trabajos de procesamiento
 */

// Store en memoria para jobs (en producción usar Redis/DB)
const jobsStore = new Map();

/**
 * Genera un ID único para un job
 * Formato: upl_<timestamp>_<random>
 */
function createJobId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `upl_${timestamp}_${random}`;
}

/**
 * Inicializa un nuevo job en el store
 */
function initJob(jobId, metadata = {}) {
  const job = {
    id: jobId,
    status: 'pending',
    progress: 0,
    outputUrl: null,
    errorMessage: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: metadata,
    clips: [],
    totalClips: 0,
    message: 'Iniciando procesamiento...'
  };

  jobsStore.set(jobId, job);
  console.log(`[Jobs] Job initialized: ${jobId}`);
  return job;
}

/**
 * Actualiza un job existente
 */
function updateJob(jobId, updates) {
  const job = jobsStore.get(jobId);
  if (!job) {
    console.warn(`[Jobs] Attempted to update non-existent job: ${jobId}`);
    return null;
  }

  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: Date.now()
  };

  jobsStore.set(jobId, updatedJob);
  console.log(`[Jobs] Job updated: ${jobId}, status: ${updatedJob.status}, progress: ${updatedJob.progress}%`);
  return updatedJob;
}

/**
 * Obtiene un job por ID
 */
function getJob(jobId) {
  const job = jobsStore.get(jobId);
  if (!job) {
    console.log(`[Jobs] Job not found: ${jobId}`);
    return null;
  }
  return job;
}

/**
 * Lista todos los jobs (para debugging)
 */
function listJobs() {
  return Array.from(jobsStore.values());
}

/**
 * Limpia jobs antiguos (más de 1 hora)
 */
function cleanupOldJobs() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleaned = 0;

  for (const [jobId, job] of jobsStore.entries()) {
    if (job.updatedAt < oneHourAgo) {
      jobsStore.delete(jobId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Jobs] Cleaned ${cleaned} old jobs`);
  }
}

// Limpiar jobs antiguos cada 30 minutos
setInterval(cleanupOldJobs, 30 * 60 * 1000);

module.exports = {
  createJobId,
  initJob,
  updateJob,
  getJob,
  listJobs,
  cleanupOldJobs
};