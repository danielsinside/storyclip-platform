-- Esquema de base de datos unificado para StoryClip
-- Compatible con SQLite y PostgreSQL

-- Tabla principal de jobs
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,                    -- UUID como string
  user_id TEXT,                               -- ID del usuario (opcional)
  path TEXT NOT NULL,                         -- edge | api | simple | realtime | upload-direct
  source TEXT DEFAULT 'user',                 -- user | cursor | test | script
  idempotency_key TEXT UNIQUE,                -- Clave de idempotencia
  flow_id TEXT,                               -- ID del flujo (opcional)
  status TEXT DEFAULT 'queued',               -- queued | running | done | error
  progress INTEGER DEFAULT 0,                 -- Progreso 0-100
  input_json TEXT,                            -- JSON como string
  output_urls TEXT,                           -- JSON como string
  error_msg TEXT,                             -- Mensaje de error
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME
);

-- Tabla de requests de procesamiento (opcional, para tracking adicional)
CREATE TABLE IF NOT EXISTS processing_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE,
  job_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs (job_id)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_path ON jobs(path);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency_key ON jobs(idempotency_key);

-- Vista para estadísticas
CREATE VIEW IF NOT EXISTS job_stats AS
SELECT
  path,
  source,
  status,
  COUNT(*) as count,
  AVG(progress) as avg_progress,
  MIN(created_at) as first_job,
  MAX(created_at) as last_job
FROM jobs
GROUP BY path, source, status;

-- Tabla de batches de publicación (para Metricool/Facebook Stories)
CREATE TABLE IF NOT EXISTS publish_batches (
  batch_id TEXT PRIMARY KEY,                      -- ID del batch
  job_id TEXT,                                    -- ID del job original (opcional)
  user_id TEXT,                                   -- ID del usuario
  account_id TEXT NOT NULL,                       -- ID de cuenta de Metricool
  publish_mode TEXT NOT NULL,                     -- 'now', 'scheduled', 'bestTime'
  status TEXT NOT NULL DEFAULT 'processing',      -- 'processing', 'completed', 'failed', 'paused'
  total_clips INTEGER NOT NULL,                   -- Total de clips a publicar
  published_clips INTEGER DEFAULT 0,              -- Clips publicados exitosamente
  failed_clips INTEGER DEFAULT 0,                 -- Clips que fallaron
  current_clip_index INTEGER DEFAULT 0,           -- Índice del clip actual
  scheduled_for DATETIME,                         -- Fecha programada (si aplica)
  error_msg TEXT,                                 -- Mensaje de error general
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (job_id) REFERENCES jobs (job_id)
);

-- Tabla de clips individuales en un batch
CREATE TABLE IF NOT EXISTS publish_batch_clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,                         -- ID del batch padre
  clip_index INTEGER NOT NULL,                    -- Índice del clip (orden en la historia)
  clip_url TEXT NOT NULL,                         -- URL del clip
  clip_title TEXT,                                -- Título del clip
  metricool_post_id TEXT,                         -- ID del post en Metricool
  facebook_post_id TEXT,                          -- ID del post en Facebook/Instagram
  status TEXT NOT NULL DEFAULT 'pending',         -- 'pending', 'uploading', 'waiting_confirmation', 'published', 'failed'
  error_msg TEXT,                                 -- Mensaje de error si falló
  attempts INTEGER DEFAULT 0,                     -- Número de intentos
  scheduled_at DATETIME,                          -- Fecha programada para este clip
  uploaded_at DATETIME,                           -- Fecha de subida a Metricool
  published_at DATETIME,                          -- Fecha de confirmación en Facebook
  FOREIGN KEY (batch_id) REFERENCES publish_batches (batch_id) ON DELETE CASCADE
);

-- Índices para batches de publicación
CREATE INDEX IF NOT EXISTS idx_publish_batches_status ON publish_batches(status);
CREATE INDEX IF NOT EXISTS idx_publish_batches_user_id ON publish_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_publish_batches_job_id ON publish_batches(job_id);
CREATE INDEX IF NOT EXISTS idx_publish_batches_created_at ON publish_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_publish_batch_clips_batch_id ON publish_batch_clips(batch_id);
CREATE INDEX IF NOT EXISTS idx_publish_batch_clips_status ON publish_batch_clips(status);
CREATE INDEX IF NOT EXISTS idx_publish_batch_clips_index ON publish_batch_clips(batch_id, clip_index);
