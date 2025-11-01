const client = require("prom-client");

// Namespace recomendado: storyclip_*
const Registry = client.Registry;
const register = new Registry();
client.collectDefaultMetrics({ register, prefix: "storyclip_" });

// Métricas de jobs
const m_jobs_created = new client.Counter({
  name: "storyclip_jobs_created_total",
  help: "Jobs de render creados",
  labelNames: ["preset"],
});

const m_jobs_completed = new client.Counter({
  name: "storyclip_jobs_completed_total",
  help: "Jobs de render completados",
  labelNames: ["preset"],
});

const m_jobs_failed = new client.Counter({
  name: "storyclip_jobs_failed_total",
  help: "Jobs de render fallidos",
  labelNames: ["preset", "reason"],
});

const m_job_duration = new client.Histogram({
  name: "storyclip_job_duration_seconds",
  help: "Duración (s) por job",
  labelNames: ["preset"],
  buckets: [3, 5, 10, 20, 40, 60, 120, 300]
});

const m_queue_depth = new client.Gauge({
  name: "storyclip_queue_depth",
  help: "Jobs en cola",
});

// Métricas de sistema
const m_ffmpeg_available = new client.Gauge({
  name: "storyclip_ffmpeg_available",
  help: "1 si ffmpeg responde",
});

const m_svt_av1_available = new client.Gauge({
  name: "storyclip_svt_av1_available",
  help: "1 si libsvtav1 está disponible",
});

const m_active_jobs = new client.Gauge({
  name: "storyclip_active_jobs",
  help: "Jobs activos actualmente",
});

const m_throughput_per_minute = new client.Gauge({
  name: "storyclip_throughput_per_minute",
  help: "Videos procesados por minuto",
});

// Registrar métricas
register.registerMetric(m_jobs_created);
register.registerMetric(m_jobs_completed);
register.registerMetric(m_jobs_failed);
register.registerMetric(m_job_duration);
register.registerMetric(m_queue_depth);
register.registerMetric(m_ffmpeg_available);
register.registerMetric(m_svt_av1_available);
register.registerMetric(m_active_jobs);
register.registerMetric(m_throughput_per_minute);

// Handler para endpoint /api/metrics
async function metricsHandler(req, res) {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (e) {
    res.status(500).send(e.message);
  }
}

// Función para actualizar métricas de sistema
async function updateSystemMetrics() {
  try {
    // Verificar FFmpeg
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    await execAsync('ffmpeg -version');
    m_ffmpeg_available.set(1);
    
    // Verificar SVT-AV1
    const { stdout } = await execAsync('ffmpeg -hide_banner -codecs 2>/dev/null | grep -i svtav1 || true');
    m_svt_av1_available.set(stdout.includes('libsvtav1') ? 1 : 0);
    
  } catch (error) {
    m_ffmpeg_available.set(0);
    m_svt_av1_available.set(0);
  }
}

// Inicializar métricas del sistema
updateSystemMetrics();
setInterval(updateSystemMetrics, 60000); // Cada minuto

module.exports = {
  register,
  metricsHandler,
  m_jobs_created,
  m_jobs_completed,
  m_jobs_failed,
  m_job_duration,
  m_queue_depth,
  m_ffmpeg_available,
  m_svt_av1_available,
  m_active_jobs,
  m_throughput_per_minute,
  updateSystemMetrics
};











