# DOCUMENTACIÓN TÉCNICA COMPLETA - STORYCLIP

> **Guía técnica exhaustiva para desarrolladores**
>
> Versión: 1.0.0
> Última actualización: Octubre 2025
> Ubicación: `/srv/storyclip`

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura General](#arquitectura-general)
4. [Backend - Documentación](#backend-documentación)
   - [Endpoints de la API](#endpoints-de-la-api)
   - [Servicios](#servicios)
   - [Base de Datos](#base-de-datos)
   - [Sistema de Colas](#sistema-de-colas)
   - [WebSocket](#websocket)
5. [Frontend - Documentación](#frontend-documentación)
   - [Estructura de Páginas](#estructura-de-páginas)
   - [Componentes](#componentes)
   - [Hooks Personalizados](#hooks-personalizados)
   - [API Client](#api-client)
6. [Flujos de Datos Completos](#flujos-de-datos-completos)
7. [Guía de Desarrollo](#guía-de-desarrollo)
8. [Despliegue y Configuración](#despliegue-y-configuración)
9. [Troubleshooting](#troubleshooting)
10. [Glosario](#glosario)

---

## 🎯 RESUMEN EJECUTIVO

**StoryClip** es una plataforma de procesamiento de video que permite convertir videos largos en clips cortos optimizados para redes sociales (Instagram Stories, Facebook Stories, Reels). La aplicación ofrece:

### Características Principales
- ✅ Procesamiento de video con FFmpeg (hasta 10GB)
- ✅ Generación automática/manual de clips
- ✅ Aplicación de filtros, efectos y overlays
- ✅ Publicación automatizada a redes sociales (Metricool)
- ✅ Progreso en tiempo real (WebSocket + SSE)
- ✅ Sistema de colas para procesamiento asíncrono
- ✅ Interfaz web intuitiva con sugerencias IA

### Tecnología Core
- **Backend**: Node.js + Express + FFmpeg + Redis
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Base de datos**: SQLite (local) + Redis (cache/queue)
- **Procesamiento**: FFmpeg 7.0.2 estático
- **Integración**: Metricool API para publicación

---

## 🛠 STACK TECNOLÓGICO

### Backend (`/srv/storyclip`)

| Componente | Tecnología | Versión | Propósito |
|------------|-----------|---------|-----------|
| **Runtime** | Node.js | 22.20.0 | Ejecución de JavaScript en servidor |
| **Framework** | Express.js | 4.18.2 | API REST |
| **Procesamiento** | FFmpeg | 7.0.2 | Procesamiento de video |
| **Base de Datos** | SQLite3 | 5.1.6 | Persistencia de jobs y batches |
| **Cache/Queue** | Redis | 4.7.1 | Cola de trabajos y cache |
| **Queue Manager** | Bull | 4.11.3 | Gestión de colas con Redis |
| **WebSocket** | ws | 8.18.3 | Comunicación en tiempo real |
| **Logging** | Winston | 3.10.0 | Sistema de logs |
| **Métricas** | Prom-client | 15.0.0 | Métricas para Prometheus |
| **Seguridad** | Helmet | 7.0.0 | Headers de seguridad HTTP |
| **CORS** | cors | 2.8.5 | Cross-Origin Resource Sharing |
| **Upload** | Multer | 1.4.5-lts.1 | Manejo de uploads multipart |
| **HTTP Client** | Axios | 1.5.0 | Requests HTTP |
| **Process Manager** | PM2 | - | Gestión de procesos en producción |

### Frontend (`/srv/storyclip/frontend`)

| Componente | Tecnología | Versión | Propósito |
|------------|-----------|---------|-----------|
| **Framework** | Next.js | 15.5.5 | Framework React con SSR/SSG |
| **UI Library** | React | 19.1.0 | Librería de interfaces |
| **Language** | TypeScript | 5 | Tipado estático |
| **Styling** | Tailwind CSS | 4 | Framework de utilidades CSS |
| **Animations** | Framer Motion | 12.23.24 | Animaciones fluidas |
| **Icons** | Lucide React | 0.545.0 | Iconos SVG optimizados |
| **HTTP Client** | Axios | 1.12.2 | Cliente HTTP |
| **Build Tool** | Turbopack | - | Bundler ultra-rápido |

### Infraestructura

| Componente | Tecnología | Propósito |
|------------|-----------|-----------|
| **Sistema Operativo** | Linux | Servidor Ubuntu/Debian |
| **Servidor Web** | Nginx | Proxy inverso (producción) |
| **Process Manager** | PM2 | Gestión de procesos Node.js |
| **Container** | Docker | Containerización (opcional) |
| **CDN** | CloudFlare | Entrega de contenido estático |

---

## 🏗 ARQUITECTURA GENERAL

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE / BROWSER                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Frontend (Next.js 15 + React 19)                       │    │
│  │  https://story.creatorsflow.app/tester/                │    │
│  │                                                           │    │
│  │  - Upload de videos                                      │    │
│  │  - Configuración de clips                                │    │
│  │  - Aplicación de efectos                                 │    │
│  │  - Preview en tiempo real                                │    │
│  │  - Descarga de resultados                                │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                         │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          │ HTTPS / WebSocket
                          │
┌─────────────────────────┼─────────────────────────────────────────┐
│                         ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  API Gateway (Express.js)                                │    │
│  │  Puerto 3000                                              │    │
│  │                                                            │    │
│  │  Rutas:                                                   │    │
│  │  - /api/videos/upload       → Upload de archivos         │    │
│  │  - /api/process-video       → Iniciar procesamiento      │    │
│  │  - /api/jobs/:id/status     → Estado del job             │    │
│  │  - /api/metricool/*         → Publicación a RRSS         │    │
│  │  - /ws                      → WebSocket real-time        │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │                                          │
│         ┌───────────────┼───────────────┐                         │
│         │               │               │                         │
│         ▼               ▼               ▼                         │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────┐                │
│  │  Middleware │ │  Services  │ │  Controllers │                │
│  │             │ │            │ │              │                │
│  │  - Auth     │ │  - Process │ │  - Upload    │                │
│  │  - CORS     │ │  - Queue   │ │  - Video     │                │
│  │  - Rate     │ │  - Download│ │  - Metricool │                │
│  │    Limit    │ │  - Metricool│ │              │                │
│  │  - Error    │ │  - Effects │ │              │                │
│  └─────────────┘ └─────┬──────┘ └──────────────┘                │
│                        │                                          │
│         ┌──────────────┼──────────────┐                          │
│         │              │              │                          │
│         ▼              ▼              ▼                          │
│  ┌─────────────┐ ┌────────────┐ ┌─────────────┐                │
│  │   SQLite    │ │   Redis    │ │   FFmpeg    │                │
│  │             │ │            │ │             │                │
│  │  - Jobs     │ │  - Queues  │ │  - Process  │                │
│  │  - Batches  │ │  - Cache   │ │    video    │                │
│  │  - Clips    │ │  - Session │ │  - Extract  │                │
│  │             │ │            │ │    clips    │                │
│  └─────────────┘ └────────────┘ └─────────────┘                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  File System                                              │   │
│  │                                                            │   │
│  │  /srv/storyclip/                                          │   │
│  │  ├── uploads/          → Videos originales                │   │
│  │  ├── work/             → Procesamiento temporal           │   │
│  │  ├── outputs/uploads/  → Clips finales                    │   │
│  │  └── tmp/              → Archivos temporales              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS API
                          │
┌─────────────────────────┼─────────────────────────────────────────┐
│                         ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Servicios Externos                                       │    │
│  │                                                            │    │
│  │  - Metricool API    → Publicación en RRSS                │    │
│  │  - Facebook API     → Stories/Reels (vía Metricool)      │    │
│  │  - Instagram API    → Stories/Reels (vía Metricool)      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Flujo de Procesamiento Simplificado

```
1. Upload
   Usuario → Frontend → Backend → /uploads/

2. Process
   Backend → Redis Queue → Worker → FFmpeg → /outputs/

3. Notify
   Worker → WebSocket → Frontend (progreso en tiempo real)

4. Download
   Frontend → Backend → Clips (ZIP o individual)

5. Publish (opcional)
   Frontend → Metricool API → Facebook/Instagram
```

---

## 🔌 BACKEND - DOCUMENTACIÓN

### ENDPOINTS DE LA API

#### 1. Upload de Videos

##### `POST /api/videos/upload`
**Descripción**: Sube un video para su posterior procesamiento

**Headers**:
```
Content-Type: multipart/form-data
X-Api-Key: sk_cd07c4b5... (opcional si REQUIRE_AUTH=false)
```

**Body (FormData)**:
```javascript
{
  video: File  // Archivo de video (mp4, webm, mov, avi)
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "uploadId": "upl_1634567890123",
  "videoUrl": "https://story.creatorsflow.app/outputs/uploads/upl_1634567890123.mp4",
  "filename": "video.mp4",
  "size": 10485760
}
```

**Response Error (400/500)**:
```json
{
  "error": "Invalid file type",
  "details": "Only video files are allowed"
}
```

**Ejemplo con cURL**:
```bash
curl -X POST https://story.creatorsflow.app/api/videos/upload \
  -H "X-Api-Key: sk_cd07c4b5..." \
  -F "video=@/path/to/video.mp4"
```

**Ejemplo con JavaScript**:
```javascript
const formData = new FormData();
formData.append('video', fileInput.files[0]);

const response = await fetch('/api/videos/upload', {
  method: 'POST',
  body: formData
});

const { uploadId, videoUrl } = await response.json();
```

---

#### 2. Procesar Video

##### `POST /api/process-video`
**Descripción**: Inicia el procesamiento de un video para generar clips

**Headers**:
```
Content-Type: application/json
X-Api-Key: sk_cd07c4b5...
```

**Body**:
```json
{
  "uploadId": "upl_1634567890123",
  "mode": "auto",
  "clipDuration": 5,
  "maxClips": 50,
  "filters": {
    "type": "vintage",
    "intensity": 0.7
  },
  "effects": {
    "mirrorHorizontal": false,
    "mirrorVertical": false
  },
  "overlays": {
    "style": "pill-cta",
    "position": "bottom",
    "opacity": 80
  },
  "audio": {
    "enabled": true,
    "volume": 100
  },
  "metadata": {
    "title": "My Video",
    "description": "Video description"
  }
}
```

**Parámetros**:
- `uploadId` (string, required): ID del video subido
- `mode` (string, required): "auto" o "manual"
- `clipDuration` (number): Duración de cada clip en segundos (1-60)
- `maxClips` (number): Cantidad máxima de clips (1-100)
- `clips` (array, opcional): Para modo manual
  ```json
  [
    { "start": 0, "end": 5 },
    { "start": 10, "end": 15 }
  ]
  ```

**Response Success (200)**:
```json
{
  "success": true,
  "jobId": "job_1634567890456",
  "status": "pending",
  "message": "Job created successfully"
}
```

**Ejemplo completo**:
```javascript
const response = await fetch('/api/process-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'sk_cd07c4b5...'
  },
  body: JSON.stringify({
    uploadId: 'upl_1634567890123',
    mode: 'auto',
    clipDuration: 5,
    maxClips: 50,
    filters: { type: 'vintage', intensity: 0.7 }
  })
});

const { jobId } = await response.json();
```

---

#### 3. Estado del Job

##### `GET /api/jobs/:jobId/status`
**Descripción**: Obtiene el estado actual de un job de procesamiento

**Headers**:
```
X-Api-Key: sk_cd07c4b5...
```

**Response Success (200)**:
```json
{
  "jobId": "job_1634567890456",
  "status": "processing",
  "progress": 45,
  "message": "Processing clip 5/10",
  "result": null
}
```

**Estados posibles**:
- `pending`: Job creado, esperando procesamiento
- `running` / `processing`: Procesando clips
- `done` / `completed`: Completado exitosamente
- `error` / `failed`: Error en procesamiento

**Response cuando está completado**:
```json
{
  "jobId": "job_1634567890456",
  "status": "done",
  "progress": 100,
  "message": "Processing completed",
  "result": {
    "artifacts": [
      {
        "id": "clip_001",
        "url": "https://story.creatorsflow.app/outputs/uploads/job_1634567890456/clip_001.mp4",
        "startTime": 0,
        "duration": 5,
        "size": 1048576
      }
    ],
    "metadata": {
      "totalClips": 10,
      "totalDuration": 50,
      "processingTime": 45
    }
  }
}
```

**Polling recomendado**:
```javascript
const checkStatus = async (jobId) => {
  const response = await fetch(`/api/jobs/${jobId}/status`);
  const job = await response.json();

  if (job.status === 'done') {
    console.log('Clips:', job.result.artifacts);
  } else if (job.status === 'error') {
    console.error('Error:', job.message);
  } else {
    console.log(`Progress: ${job.progress}%`);
    setTimeout(() => checkStatus(jobId), 2000);
  }
};
```

---

#### 4. Descarga de Clips

##### `GET /api/downloadZip?jobId=:jobId`
**Descripción**: Descarga un ZIP con todos los clips generados

**Headers**:
```
X-Api-Key: sk_cd07c4b5...
```

**Response**: Archivo ZIP (application/zip)

**Ejemplo con JavaScript**:
```javascript
const response = await fetch(`/api/downloadZip?jobId=${jobId}`, {
  headers: { 'X-Api-Key': 'sk_cd07c4b5...' }
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `clips-${jobId}.zip`;
a.click();
```

---

#### 5. Publicación a Redes Sociales (Metricool)

##### `POST /api/metricool/publish/stories`
**Descripción**: Publica un batch de clips a Facebook/Instagram Stories

**Headers**:
```
Content-Type: application/json
X-Api-Key: sk_cd07c4b5...
```

**Body**:
```json
{
  "posts": [
    {
      "id": "1",
      "url": "https://story.creatorsflow.app/outputs/uploads/job_123/clip_001.mp4",
      "text": "Check this out!"
    },
    {
      "id": "2",
      "url": "https://story.creatorsflow.app/outputs/uploads/job_123/clip_002.mp4",
      "text": ""
    }
  ],
  "settings": {
    "accountId": "123456",
    "publishSpeed": "safe"
  },
  "schedule": {
    "mode": "now"
  }
}
```

**Parámetros**:
- `posts` (array): Lista de clips a publicar
- `settings.accountId` (string): ID de la cuenta de Metricool
- `settings.publishSpeed` (string): "safe" (120s), "fast" (90s), "ultra" (60s)
- `schedule.mode` (string): "now" o "scheduled"
- `schedule.scheduledAt` (string, opcional): ISO timestamp para modo scheduled

**Response Success (200)**:
```json
{
  "batchId": "batch_1634567890789",
  "status": "processing",
  "totalPosts": 10
}
```

---

##### `GET /api/metricool/stream?batchId=:batchId`
**Descripción**: Server-Sent Events (SSE) para progreso en tiempo real

**Headers**:
```
Accept: text/event-stream
X-Api-Key: sk_cd07c4b5...
```

**Response**: Stream de eventos

**Eventos emitidos**:
```
event: progress
data: {"type":"progress","published":1,"total":10,"currentStory":"Story 1","status":"published"}

event: progress
data: {"type":"progress","published":2,"total":10,"currentStory":"Story 2","status":"uploading"}

event: completed
data: {"type":"completed","published":10,"total":10,"errors":0}
```

**Ejemplo con JavaScript**:
```javascript
const eventSource = new EventSource(
  `/api/metricool/stream?batchId=${batchId}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'progress') {
    console.log(`Published: ${data.published}/${data.total}`);
  } else if (data.type === 'completed') {
    console.log('All clips published!');
    eventSource.close();
  }
};
```

---

##### `GET /api/metricool/brands`
**Descripción**: Obtiene las cuentas disponibles de Metricool

**Headers**:
```
X-Api-Key: sk_cd07c4b5...
```

**Response Success (200)**:
```json
{
  "brands": [
    {
      "id": "123456",
      "name": "Mi Página de Facebook",
      "type": "facebook",
      "avatar": "https://..."
    }
  ]
}
```

---

#### 6. WebSocket Real-Time

##### `WS ws://story.creatorsflow.app/ws?jobId=:jobId`
**Descripción**: Conexión WebSocket para actualizaciones en tiempo real

**Eventos del servidor → cliente**:

**Status Update**:
```json
{
  "type": "status",
  "data": {
    "jobId": "job_123",
    "status": "processing",
    "progress": 45,
    "message": "Processing clip 5/10"
  }
}
```

**Completed**:
```json
{
  "type": "completed",
  "data": {
    "jobId": "job_123",
    "status": "done",
    "progress": 100,
    "outputs": [...]
  }
}
```

**Error**:
```json
{
  "type": "error",
  "data": {
    "message": "FFmpeg processing failed",
    "code": "FFMPEG_ERROR"
  }
}
```

**Ejemplo con JavaScript**:
```javascript
const ws = new WebSocket(`ws://story.creatorsflow.app/ws?jobId=${jobId}`);

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);

  if (type === 'status') {
    updateProgress(data.progress);
  } else if (type === 'completed') {
    showResults(data.outputs);
  } else if (type === 'error') {
    showError(data.message);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Connection closed');
};
```

---

### SERVICIOS

#### 1. Processing Service

**Ubicación**: `/srv/storyclip/services/processing.service.js`

**Funciones principales**:

```javascript
// Procesar video desde archivo local
async function processStoryFromFile(filePath, options, progressCallback) {
  // 1. Validar archivo
  // 2. Analizar con ffprobe
  // 3. Generar clips con FFmpeg
  // 4. Aplicar filtros/efectos
  // 5. Guardar en outputs/
  // 6. Retornar URLs públicas
}

// Obtener información del video
async function getVideoInfo(videoUrl) {
  // Usa ffprobe para extraer metadata
  return {
    duration: 120,
    width: 1920,
    height: 1080,
    fps: 30,
    codec: 'h264'
  };
}
```

**Métricas de Prometheus**:
- `jobs_created_total`: Contador de jobs creados
- `jobs_completed_total`: Contador de jobs completados
- `jobs_failed_total`: Contador de jobs fallidos
- `job_duration_seconds`: Histogram de duración de procesamiento

---

#### 2. Queue Service

**Ubicación**: `/srv/storyclip/services/queue.service.js`

**Bull Queues configurados**:
- `story-queue`: Procesamiento de stories
- `reel-queue`: Procesamiento de reels
- `image-queue`: Extracción de imágenes

**Configuración**:
```javascript
{
  redis: {
    host: 'localhost',
    port: 6379
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
}
```

**Uso**:
```javascript
const queueService = require('./services/queue.service');

// Agregar job
await queueService.addStoryJob(jobId, videoUrl, options);

// Obtener estado
const status = await queueService.getJobStatus(jobId, 'story');

// Estadísticas
const stats = await queueService.getQueueStats();
// { waiting: 5, active: 2, completed: 100, failed: 3 }
```

---

#### 3. Metricool Service

**Ubicación**: `/srv/storyclip/services/metricool.service.js`

**API Base**: `https://app.metricool.com/api`

**Funciones principales**:

```javascript
// Obtener cuentas
async function getAccounts(userId) {
  // GET /admin/simpleProfiles?userId={userId}
}

// Normalizar URL de media (REQUERIDO)
async function normalizeMedia(mediaUrl) {
  // GET /actions/normalize/image/url?url={url}
  // Retorna URL normalizada que acepta Metricool
}

// Crear story
async function createStory({ accountId, mediaUrl, text, scheduledAt }) {
  // POST /v2/scheduler/posts?userId={userId}&blogId={accountId}
  // Retorna postId
}

// Esperar confirmación de publicación
async function waitForPublish(postId, maxWaitSeconds, onProgress) {
  // Polling escalado: 1.5s → 2s → 3s → 5s → 8s
  // Espera hasta status === 'PUBLISHED'
  // Retorna externalId (Facebook post ID)
}

// Publicar batch completo
async function publishStoriesBatch({
  accountId,
  stories,
  publishSpeed,
  publishMode,
  scheduledAt,
  onProgress
}) {
  // Publica múltiples stories con delay entre cada una
  // Emite progreso vía callback
}
```

**Ejemplo de uso**:
```javascript
const metricoolService = require('./services/metricool.service');

// 1. Normalizar URL
const normalizedUrl = await metricoolService.normalizeMedia(clipUrl);

// 2. Crear story
const postId = await metricoolService.createStory({
  accountId: '123456',
  mediaUrl: normalizedUrl,
  text: 'Check this out!',
  scheduledAt: null  // null = publicar inmediatamente
});

// 3. Esperar confirmación
const result = await metricoolService.waitForPublish(postId, 120, (progress) => {
  console.log(`Waiting: ${progress.elapsed}s / ${progress.total}s`);
});

console.log('Published! Facebook ID:', result.externalId);
```

---

### BASE DE DATOS

**Motor**: SQLite 3
**Ubicación**: `/srv/storyclip/database/storyclip.db`

#### Schema

##### Tabla: `jobs`
```sql
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  user_id TEXT,
  path TEXT NOT NULL,              -- 'api' | 'upload-direct' | 'edge'
  source TEXT DEFAULT 'user',       -- 'user' | 'cursor' | 'test'
  idempotency_key TEXT UNIQUE,
  flow_id TEXT,
  status TEXT DEFAULT 'queued',     -- 'queued' | 'running' | 'done' | 'error'
  progress INTEGER DEFAULT 0,       -- 0-100
  input_json TEXT,                  -- JSON serializado
  output_urls TEXT,                 -- JSON serializado
  error_msg TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME
);
```

##### Tabla: `publish_batches`
```sql
CREATE TABLE IF NOT EXISTS publish_batches (
  batch_id TEXT PRIMARY KEY,
  job_id TEXT,
  user_id TEXT,
  account_id TEXT NOT NULL,
  publish_mode TEXT NOT NULL,       -- 'now' | 'scheduled' | 'bestTime'
  status TEXT NOT NULL DEFAULT 'processing',
  total_clips INTEGER NOT NULL,
  published_clips INTEGER DEFAULT 0,
  failed_clips INTEGER DEFAULT 0,
  current_clip_index INTEGER DEFAULT 0,
  scheduled_for DATETIME,
  error_msg TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (job_id) REFERENCES jobs (job_id)
);
```

##### Tabla: `publish_batch_clips`
```sql
CREATE TABLE IF NOT EXISTS publish_batch_clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  clip_index INTEGER NOT NULL,
  clip_url TEXT NOT NULL,
  clip_title TEXT,
  metricool_post_id TEXT,
  facebook_post_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_msg TEXT,
  attempts INTEGER DEFAULT 0,
  scheduled_at DATETIME,
  uploaded_at DATETIME,
  published_at DATETIME,
  FOREIGN KEY (batch_id) REFERENCES publish_batches (batch_id) ON DELETE CASCADE
);
```

#### Database Class

**Ubicación**: `/srv/storyclip/database/db.js`

**Métodos**:
```javascript
const db = require('./database/db');

// Inicializar
await db.init();

// Query (SELECT)
const jobs = await db.query('SELECT * FROM jobs WHERE user_id = ?', [userId]);

// Get (un solo registro)
const job = await db.get('SELECT * FROM jobs WHERE job_id = ?', [jobId]);

// Run (INSERT/UPDATE/DELETE)
await db.run('UPDATE jobs SET status = ? WHERE job_id = ?', ['done', jobId]);

// Transacción
await db.transaction(async () => {
  await db.run('INSERT INTO jobs ...');
  await db.run('INSERT INTO publish_batches ...');
});

// Cerrar
await db.close();
```

**Características**:
- Modo WAL para mejor concurrencia
- Reconexión automática
- Reintentos en errores SQLITE_BUSY
- Transacciones ACID

---

### SISTEMA DE COLAS

**Motor**: Bull + Redis

#### Arquitectura de Colas

```
Redis (localhost:6379)
    │
    ├── story-queue (concurrency: 3)
    │   ├── Worker 1 → processStoryFromFile()
    │   ├── Worker 2 → processStoryFromFile()
    │   └── Worker 3 → processStoryFromFile()
    │
    ├── reel-queue (concurrency: 3)
    │   └── Workers → processReel()
    │
    └── image-queue (concurrency: 3)
        └── Workers → processImage()
```

#### Job Options

```javascript
{
  jobId: 'custom-job-id',
  removeOnComplete: 10,     // Mantener solo 10 completados
  removeOnFail: 5,          // Mantener solo 5 fallidos
  attempts: 3,              // Reintentar hasta 3 veces
  backoff: {
    type: 'exponential',
    delay: 2000             // 2s, 4s, 8s...
  }
}
```

#### Events

```javascript
queue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`);
});

queue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

queue.on('progress', (job, progress) => {
  logger.info(`Job ${job.id} progress: ${progress}%`);
});

queue.on('active', (job) => {
  logger.info(`Job ${job.id} started`);
});

queue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});
```

---

### WEBSOCKET

**Librería**: ws v8.18.3
**Endpoint**: `ws://story.creatorsflow.app/ws?jobId=:jobId`

#### Conexión

```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, req) => {
  const jobId = getJobIdFromRequest(req);

  // Registrar conexión
  connections.set(jobId, ws);

  // Enviar estado inicial
  ws.send(JSON.stringify({
    type: 'status',
    data: { jobId, status: 'connected' }
  }));
});
```

#### Eventos Emitidos

**Status Update**:
```javascript
ws.send(JSON.stringify({
  type: 'status',
  data: {
    jobId: 'job_123',
    status: 'processing',
    progress: 45,
    message: 'Processing clip 5/10'
  }
}));
```

**Completed**:
```javascript
ws.send(JSON.stringify({
  type: 'completed',
  data: {
    jobId: 'job_123',
    status: 'done',
    progress: 100,
    outputs: [...]
  }
}));

ws.close(1000, 'Job completed');
```

**Error**:
```javascript
ws.send(JSON.stringify({
  type: 'error',
  data: {
    message: 'FFmpeg processing failed',
    code: 'FFMPEG_ERROR'
  }
}));
```

#### Integración con Job Monitoring

```javascript
const jobMonitoringService = require('./services/job-monitoring.service');

jobMonitoringService.on('jobUpdated', (jobData) => {
  const ws = connections.get(jobData.jobId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'status',
      data: jobData
    }));
  }
});

jobMonitoringService.on('jobCompleted', (jobData) => {
  const ws = connections.get(jobData.jobId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'completed',
      data: jobData
    }));
    ws.close(1000, 'Job completed');
  }
});
```

---

## 🎨 FRONTEND - DOCUMENTACIÓN

### ESTRUCTURA DE PÁGINAS

**Framework**: Next.js 15 con App Router

**Ubicación**: `/srv/storyclip/frontend/src/app/`

```
src/app/
├── layout.tsx          # Root layout (fuentes, metadata)
├── page.tsx           # Página principal (SPA)
├── globals.css        # Estilos globales
└── favicon.ico        # Icono
```

#### Página Principal

**Archivo**: `page.tsx`

**Características**:
- SPA (Single Page Application)
- Layout de dos columnas
- Sistema de notificaciones Toast
- Modal de sugerencias IA (Framer Motion)
- Polling automático de estado
- Sección de publicación a Facebook/Instagram

**Secciones**:
1. **VideoConfigSection**: Upload y configuración de video
2. **DistributionConfigSection**: Configuración de clips
3. **FiltersAndEffectsSection**: Filtros visuales y overlays
4. **ExportConfigSection**: Calidad y formato
5. **BatchProcessingSection**: Procesamiento múltiple
6. **DistributionPreview**: Preview de distribución
7. **ResultsSection**: Resultados y descarga
8. **Publishing**: Publicación a redes sociales

---

### COMPONENTES

#### 1. VideoConfigSection

**Propósito**: Configurar el video fuente (URL o archivo local)

**Props**:
```typescript
interface VideoConfigSectionProps {
  onVideoConfigChange: (config: VideoConfig | null) => void;
  onVideoDurationChange: (duration: number | null) => void;
}
```

**Features**:
- Toggle entre URL y File
- Upload con FormData
- Progress bar para uploads
- Preview con `<video>` element
- URLs de prueba rápidas
- Modal de sugerencias IA (automático)

**Estado interno**:
```typescript
const [inputMode, setInputMode] = useState<'url' | 'file'>('url');
const [videoUrl, setVideoUrl] = useState('');
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
const [currentVideoDuration, setCurrentVideoDuration] = useState<number | null>(null);
```

---

#### 2. DistributionConfigSection

**Propósito**: Configurar la distribución de clips

**Props**:
```typescript
interface DistributionConfigSectionProps {
  onDistributionChange: (distribution: ClipDistribution) => void;
  videoDuration: number | null;
}
```

**Presets de duración**: 3s, 5s, 7s, 10s, 15s, 30s, 60s
**Presets de cantidad**: 10, 20, 30, 50 clips

**Modos de distribución**:
- **Automático**: Distribuye todo el video inteligentemente
- **Óptimo**: Ajusta duración para maximizar cobertura
- **Fijo**: Usa duración fija (puede cortar video)

**Random Offset**: Variación aleatoria de hasta 1s

---

#### 3. FiltersAndEffectsSection

**Propósito**: Aplicar filtros visuales y efectos

**Tabs**:
1. **Filtros**: 10 filtros disponibles (Radiant, Blur2, Fade, Twilight, Noir, etc.)
2. **Flip**: Volteo horizontal/vertical
3. **Overlay**: 5 overlays animados (none, pill-cta, impact-hook, subtitle, fade-label)

**Configuración de overlay**:
- Posición: top, center, bottom
- Opacidad: 10-100%

---

#### 4. ExportConfigSection

**Propósito**: Configurar calidad y formato de exportación

**Presets disponibles**:
- **stories-optimized**: MP4, 1080p, 30fps, H.264
- **reels-optimized**: MP4, 1080p, ultra quality
- **web-optimized**: WebM, 720p, VP9
- **archive-quality**: MP4, 4K, 60fps, H.265

**Configuración manual**:
- Formato: MP4, WebM, MOV
- Resolución: 720p, 1080p, 4K
- Calidad: low, medium, high, ultra
- FPS: 24, 30, 60
- Compresión: 10-100%
- Codec: H.264, H.265, VP9

---

#### 5. ResultsSection

**Propósito**: Mostrar resultados del procesamiento

**Información mostrada**:
- Estado del job (pending, processing, completed, failed)
- Progreso en %
- Job ID
- Barra de progreso animada

**Clips generados**:
- Lista completa con metadata
- Nombre de archivo
- Start time y duración
- Filtros aplicados
- Toggle para mostrar/ocultar metadata

**Acciones**:
- Descargar ZIP con todos los clips
- Reprocesar video
- Limpiar logs

---

#### 6. AISuggestionsModal

**Propósito**: Sugerencias inteligentes con animaciones

**Tecnología**: Framer Motion

**Proceso**:
1. Análisis (2.5s con animación)
2. Muestra 4 sugerencias
3. Usuario selecciona
4. Aplica configuración automáticamente

**Categorías**:
- **Trending** 🔥: Viral Short-Form (95% confidence)
- **Creative** 🎨: Estilo Cinematográfico (88%)
- **Engagement** 💬: Máximo Engagement (92%)
- **Optimal** ⚡: Rendimiento Óptimo (85%)

**Animaciones**:
- Fade in/out del modal
- Rotación del icono de análisis
- Pulse effect
- Barra de progreso animada
- Hover effects en tarjetas

---

#### 7. Toast

**Propósito**: Sistema de notificaciones

**Tipos**:
- success (verde)
- error (rojo)
- warning (amarillo)
- info (azul)

**Features**:
- Auto-close con timer (default 5s)
- Barra de progreso visual
- Animaciones suaves
- Stack múltiple
- Posición fija (top-right)

**Hook useToast**:
```typescript
const { toasts, showSuccess, showError, showInfo, showWarning } = useToast();

showSuccess('Video procesado', 'Los clips están listos');
showError('Error al procesar', 'Intenta de nuevo');
```

---

### HOOKS PERSONALIZADOS

#### 1. useVideoProcessor

**Ubicación**: `/srv/storyclip/frontend/src/hooks/useVideoProcessor.ts`

**Propósito**: Gestionar el ciclo de vida del procesamiento de video

**Estado**:
```typescript
{
  currentJob: ProcessingJob | null
  isProcessing: boolean
  progress: number (0-100)
  error: string | null
}
```

**Acciones**:
```typescript
const {
  currentJob,
  isProcessing,
  progress,
  error,
  startProcessing,
  checkStatus,
  downloadZip,
  clearError,
  reset,
  startPolling,
  stopPolling
} = useVideoProcessor();
```

**Polling automático**:
```typescript
// Inicia polling cada 2 segundos
startPolling(jobId, 2000);

// Se detiene automáticamente cuando completa o falla
```

**Uso completo**:
```typescript
// 1. Iniciar procesamiento
await startProcessing({
  uploadId: 'upl_123',
  distribution: { ... },
  filters: [ ... ]
});

// 2. El hook inicia polling automático

// 3. Estado se actualiza automáticamente
console.log(progress); // 45%

// 4. Cuando completa
if (currentJob?.status === 'completed') {
  console.log('Clips:', currentJob.result.artifacts);
}
```

---

#### 2. useDistributionPreview

**Ubicación**: `/srv/storyclip/frontend/src/hooks/useDistributionPreview.ts`

**Propósito**: Generar preview en tiempo real de la distribución

**Return**:
```typescript
{
  preview: {
    totalClips: number
    totalDuration: number
    coverage: number (%)
    clips: Array<{ start, end, duration }>
  },
  validation: {
    valid: boolean
    errors: string[]
  },
  isLoading: boolean
}
```

**Uso**:
```typescript
const { preview, validation, isLoading } = useDistributionPreview(
  videoConfig,
  distribution
);

if (validation.valid) {
  console.log(`Se generarán ${preview.totalClips} clips`);
  console.log(`Cobertura: ${preview.coverage}%`);
} else {
  console.error('Errores:', validation.errors);
}
```

**Optimización**:
- `useMemo` para evitar recálculos innecesarios
- Solo recalcula cuando cambian dependencias
- Simulación de loading de 300ms para UX

---

### API CLIENT

**Ubicación**: `/srv/storyclip/frontend/src/lib/api/client.ts`

**Configuración base**:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});
```

#### Funciones principales

##### uploadVideo(file: File)
```typescript
export async function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append('video', file);

  const response = await apiClient.post('/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return {
    success: true,
    uploadId: response.data.uploadId,
    videoUrl: response.data.videoUrl,
    filename: response.data.filename,
    size: response.data.size
  };
}
```

##### processVideo(request: ProcessVideoRequest)
```typescript
export async function processVideo(request: ProcessVideoRequest) {
  // Convierte la configuración del frontend al formato del backend
  const payload = {
    uploadId: request.uploadId,
    mode: request.distribution.mode === 'automatic' ? 'auto' : 'manual',
    clipDuration: request.distribution.clipDuration,
    maxClips: request.distribution.maxClips,
    filters: request.filters,
    effects: {
      mirrorHorizontal: request.flip?.horizontal || false,
      mirrorVertical: request.flip?.vertical || false
    },
    overlays: request.overlay,
    // ... más configuración
  };

  const response = await apiClient.post('/process-video', payload);
  return response.data;
}
```

##### getJobStatus(jobId: string)
```typescript
export async function getJobStatus(jobId: string): Promise<ProcessingJob> {
  const response = await apiClient.get(`/jobs/${jobId}/status`);

  // Mapea estados del backend al frontend
  const status = response.data.status === 'done' ? 'completed' :
                 response.data.status === 'error' ? 'failed' :
                 response.data.status;

  return {
    id: jobId,
    status,
    progress: response.data.progress,
    clips: response.data.result?.artifacts || [],
    error: response.data.errorMessage
  };
}
```

##### downloadClipsZip(jobId: string)
```typescript
export async function downloadClipsZip(jobId: string) {
  const response = await apiClient.get(`/downloadZip?jobId=${jobId}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/zip' });
  const downloadUrl = window.URL.createObjectURL(blob);

  // Crear enlace temporal y descargar
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `clips-${jobId}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Limpiar URL
  window.URL.revokeObjectURL(downloadUrl);

  return { success: true, downloadUrl };
}
```

---

## 🔄 FLUJOS DE DATOS COMPLETOS

### Flujo 1: Upload → Process → Download

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
└─────────────────────────────────────────────────────────────────┘
   │
   │ 1. Usuario selecciona archivo
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ VideoConfigSection                                               │
│ - handleFileUpload()                                             │
│ - FormData.append('video', file)                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ POST /api/videos/upload
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (Express)                                                │
│ - Multer middleware                                              │
│ - Guarda en /srv/storyclip/outputs/uploads/                    │
│ - uploadsRepo.set(uploadId, { path, size })                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Response: { uploadId, videoUrl }
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│ - Recibe uploadId                                                │
│ - Detecta duración con <video> element                          │
│ - Muestra AISuggestionsModal (automático)                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ 2. Usuario configura distribución, filtros, etc.
                     │ 3. Usuario hace clic "Procesar Video"
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ useVideoProcessor                                                │
│ - startProcessing(request)                                       │
│ - Construye payload con toda la configuración                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ POST /api/process-video
                     │ { uploadId, mode, clipDuration, maxClips, filters, ... }
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (Express)                                                │
│ /api/process-video (robust-routes.js)                          │
│                                                                   │
│ 1. robust-processing.startProcess()                             │
│    - Crea jobId único                                            │
│    - Copia video a /srv/storyclip/work/jobId/                  │
│    - Inserta en DB: jobs (status: running, progress: 10%)       │
│                                                                   │
│ 2. Responde inmediatamente: { jobId, status: 'pending' }        │
│                                                                   │
│ 3. setImmediate() → runPipeline() asíncrono                     │
│    a. updateJobProgress(jobId, 30, 'Analyzing video...')        │
│    b. ffmpegHelper.createStoryClips()                           │
│       - Lee video con ffprobe                                    │
│       - Genera clips según configuración                         │
│       - Aplica filtros/efectos/overlays                          │
│       - Output: /srv/storyclip/work/jobId/clip_001.mp4, ...    │
│    c. updateJobProgress(jobId, 90, 'Exporting clips...')        │
│    d. Mueve clips a /srv/storyclip/outputs/uploads/jobId/       │
│    e. Genera artifacts con URLs públicas                         │
│    f. Actualiza DB (status: done, progress: 100%)               │
│    g. jobMonitoringService.emit('jobCompleted', {...})          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Mientras tanto...
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│ useVideoProcessor                                                │
│ - startPolling(jobId, 2000)                                      │
│                                                                   │
│ Loop cada 2 segundos:                                            │
│   GET /api/jobs/:jobId/status                                   │
│   - Recibe: { status, progress, message }                       │
│   - Actualiza estado: setProgress(progress)                     │
│   - ResultsSection muestra barra de progreso                    │
│                                                                   │
│ Cuando status === 'done':                                        │
│   - stopPolling()                                                │
│   - Muestra Toast: "Video procesado exitosamente"              │
│   - ResultsSection muestra lista de clips                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ 4. Usuario hace clic "Descargar Carpeta de Clips"
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ useVideoProcessor                                                │
│ - downloadZip(jobId)                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ GET /api/downloadZip?jobId=...
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (Express)                                                │
│ - Crea ZIP con todos los clips                                  │
│ - Response: Blob (application/zip)                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Blob data
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│ - Crea Blob URL: window.URL.createObjectURL(blob)              │
│ - Crea <a> temporal con download="clips.zip"                   │
│ - Simula click → Descarga inicia                               │
│ - Limpia Blob URL                                                │
│ - Toast: "Descarga iniciada"                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flujo 2: Publicación a Metricool

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│ - Clips ya procesados                                            │
│ - Usuario hace clic "Publicar automáticamente"                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ POST /api/metricool/publish/stories
                     │ {
                     │   posts: [{ id, url, text }, ...],
                     │   settings: { accountId, publishSpeed: 'safe' },
                     │   schedule: { mode: 'now' }
                     │ }
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (Express)                                                │
│ /api/metricool/publish/stories (metricool.js)                  │
│                                                                   │
│ 1. Genera batchId único                                          │
│ 2. Inserta en DB: publish_batches (status: processing)          │
│ 3. Inserta en DB: publish_batch_clips (status: pending)         │
│ 4. Responde inmediatamente: { batchId, status: 'processing' }   │
│                                                                   │
│ 5. setImmediate() → publishBatch() asíncrono                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Mientras tanto...
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│ - EventSource('/api/metricool/stream?batchId=...')             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ SSE connection
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (Express)                                                │
│ /api/metricool/stream (metricool.js)                           │
│                                                                   │
│ Bucle para cada clip:                                            │
│   1. normalizeMedia(clipUrl)                                     │
│      → Metricool valida y procesa el video                      │
│      → Retorna normalizedUrl                                     │
│                                                                   │
│   2. createStory({ mediaUrl: normalizedUrl, ... })              │
│      → POST a Metricool API                                      │
│      → Retorna postId                                            │
│                                                                   │
│   3. waitForPublish(postId)                                      │
│      → Polling escalado: 1.5s → 2s → 3s → 5s → 8s              │
│      → Espera hasta status === 'PUBLISHED'                      │
│      → Retorna externalId (Facebook post ID)                    │
│                                                                   │
│   4. Emite evento SSE:                                           │
│      data: {                                                     │
│        "type": "progress",                                       │
│        "published": 1,                                           │
│        "total": 10,                                              │
│        "currentStory": "Story 1",                               │
│        "status": "published"                                     │
│      }                                                           │
│                                                                   │
│   5. Actualiza DB: publish_batch_clips (status: published)      │
│                                                                   │
│   6. Delay 5 segundos antes del siguiente                        │
│                                                                   │
│ Cuando termina todos:                                            │
│   - Emite evento: data: { "type": "completed", ... }            │
│   - Actualiza DB: publish_batches (status: completed)           │
│   - Cierra SSE connection                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ SSE events
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│ EventSource.onmessage = (event) => {                            │
│   const data = JSON.parse(event.data);                          │
│                                                                   │
│   if (data.type === 'progress') {                               │
│     updateProgress(data.published / data.total * 100);          │
│     showToast(`Publicado: ${data.published}/${data.total}`);   │
│   }                                                              │
│                                                                   │
│   if (data.type === 'completed') {                              │
│     showSuccess('Todos los clips publicados!');                 │
│     eventSource.close();                                         │
│   }                                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flujo 3: WebSocket Real-Time Updates

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│ - Usuario inicia procesamiento                                   │
│ - Recibe jobId                                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ WebSocket connection
                     │ ws://story.creatorsflow.app/ws?jobId=...
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (WebSocket Server)                                       │
│ - Acepta conexión                                                │
│ - Registra en Map: connections.set(jobId, ws)                   │
│ - Envía estado inicial:                                          │
│   { type: 'status', data: { jobId, status: 'connected' } }      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Backend procesa video...
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (Processing)                                             │
│ runPipeline() ejecuta:                                           │
│                                                                   │
│ 1. updateJobProgress(jobId, 30, 'Analyzing video...')           │
│    ↓                                                             │
│    jobManager.updateProgress(jobId, 30, ...)                    │
│    ↓                                                             │
│    jobMonitoringService.emit('jobUpdated', {                    │
│      jobId, status: 'processing', progress: 30, message: '...'  │
│    })                                                            │
│                                                                   │
│ 2. ffmpegHelper.createStoryClips()                              │
│    - Procesa clips (emite progreso cada 10%)                    │
│    ↓                                                             │
│    updateJobProgress(jobId, 50, 'Processing clip 5/10')         │
│    ↓                                                             │
│    jobMonitoringService.emit('jobUpdated', { ... })             │
│                                                                   │
│ 3. Completa                                                      │
│    ↓                                                             │
│    jobMonitoringService.emit('jobCompleted', {                  │
│      jobId, status: 'done', progress: 100, outputs: [...]       │
│    })                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Events
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ BACKEND (WebSocket Server)                                       │
│                                                                   │
│ jobMonitoringService.on('jobUpdated', (jobData) => {            │
│   const ws = connections.get(jobData.jobId);                    │
│   if (ws && ws.readyState === WebSocket.OPEN) {                 │
│     ws.send(JSON.stringify({                                     │
│       type: 'status',                                            │
│       data: jobData                                              │
│     }));                                                         │
│   }                                                              │
│ });                                                              │
│                                                                   │
│ jobMonitoringService.on('jobCompleted', (jobData) => {          │
│   const ws = connections.get(jobData.jobId);                    │
│   if (ws && ws.readyState === WebSocket.OPEN) {                 │
│     ws.send(JSON.stringify({                                     │
│       type: 'completed',                                         │
│       data: jobData                                              │
│     }));                                                         │
│     ws.close(1000, 'Job completed');                            │
│   }                                                              │
│ });                                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ WebSocket messages
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ CLIENTE (Frontend)                                               │
│                                                                   │
│ ws.onmessage = (event) => {                                      │
│   const { type, data } = JSON.parse(event.data);                │
│                                                                   │
│   if (type === 'status') {                                       │
│     setProgress(data.progress);                                  │
│     setMessage(data.message);                                    │
│     // Actualiza UI en tiempo real                              │
│   }                                                              │
│                                                                   │
│   if (type === 'completed') {                                    │
│     setClips(data.outputs);                                      │
│     showSuccess('Video procesado exitosamente!');               │
│   }                                                              │
│                                                                   │
│   if (type === 'error') {                                        │
│     showError(data.message);                                     │
│   }                                                              │
│ };                                                               │
│                                                                   │
│ ws.onclose = () => {                                             │
│   console.log('WebSocket closed');                              │
│ };                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 GUÍA DE DESARROLLO

### Setup del Proyecto

#### Prerrequisitos

```bash
# Sistema operativo
Ubuntu 20.04+ / Debian 11+

# Software
- Node.js 20+
- npm 9+
- Redis 7+
- FFmpeg 7+
- PM2 (opcional, para producción)
```

#### Instalación

**1. Clonar repositorio**:
```bash
cd /srv/storyclip
```

**2. Backend**:
```bash
cd /srv/storyclip

# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env
nano .env

# Crear base de datos
node -e "require('./database/db').init()"

# Iniciar en desarrollo
npm run dev

# O con PM2 (producción)
pm2 start ecosystem.config.js
```

**3. Frontend**:
```bash
cd /srv/storyclip/frontend

# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env.local
nano .env.local

# Iniciar en desarrollo
npm run dev

# Build para producción
npm run build

# Servir build
npm start
```

**4. Redis**:
```bash
# Instalar Redis
sudo apt install redis-server

# Iniciar Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar
redis-cli ping
# Debe responder: PONG
```

**5. FFmpeg**:
```bash
# Instalar FFmpeg estático
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
sudo cp ffmpeg-7.0.2-amd64-static/ffmpeg /usr/local/bin/
sudo cp ffmpeg-7.0.2-amd64-static/ffprobe /usr/local/bin/

# Verificar
ffmpeg -version
```

---

### Variables de Entorno

#### Backend (.env)

```bash
# Configuración del servidor
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Redis
REDIS_URL=redis://localhost:6379

# Directorios
UPLOAD_TMP_DIR=/srv/storyclip/tmp/uploads
PROCESS_WORK_DIR=/srv/storyclip/work
OUTPUT_ROOT=/srv/storyclip/outputs
OUTPUT_DIR=/srv/storyclip/outputs
CDN_BASE=https://story.creatorsflow.app/outputs
TEMP_DIR=/srv/storyclip/tmp

# FFmpeg
FFMPEG_THREADS=8
MAX_CONCURRENT_JOBS=10

# CORS
ALLOWED_ORIGINS=http://localhost:3001,https://story.creatorsflow.app

# Auth
JWT_SECRET=your-jwt-secret-here
API_KEY=sk_prod_your_key_here
STORYCLIP_API_KEY=sk_prod_your_key_here

# Base de datos
DATABASE_PATH=/srv/storyclip/database/storyclip.db

# Metricool
METRICOOL_USER_TOKEN=your_metricool_token_here

# Sistema Unificado
ALLOW_UPLOAD_DIRECT_TEST=true
REQUIRE_AUTH=false
REALTIME_ENABLED=true
```

#### Frontend (.env.local)

```bash
# StoryClip API
NEXT_PUBLIC_API_URL=https://story.creatorsflow.app/api
NEXT_PUBLIC_CDN_URL=https://story.creatorsflow.app/outputs
NEXT_PUBLIC_API_KEY=sk_prod_your_key_here
NEXT_PUBLIC_POLL_INTERVAL=2500
NEXT_PUBLIC_TIMEOUT=900000

# Supabase (opcional, actualmente desactivado)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_USE_SUPABASE=false
```

---

### Estructura de Carpetas

```
/srv/storyclip/
├── app.js                    # Punto de entrada del backend
├── ecosystem.config.js       # Configuración PM2
├── package.json              # Dependencias backend
├── .env                      # Variables de entorno
│
├── routes/                   # Rutas de la API
│   ├── api.js               # Rutas principales
│   ├── robust-routes.js     # Rutas optimizadas
│   ├── metricool.js         # Integración Metricool
│   ├── websocket.js         # WebSocket
│   └── ...
│
├── services/                 # Lógica de negocio
│   ├── processing.service.js
│   ├── queue.service.js
│   ├── metricool.service.js
│   ├── download.service.js
│   └── ...
│
├── middleware/               # Middleware Express
│   ├── auth.js
│   ├── cors.js
│   ├── error.js
│   └── security.js
│
├── database/                 # Base de datos
│   ├── db.js                # Database class
│   ├── schema.sql           # Schema SQL
│   └── storyclip.db         # SQLite database
│
├── utils/                    # Utilidades
│   ├── logger.js
│   ├── cleanup.js
│   └── ...
│
├── frontend/                 # Frontend Next.js
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/      # Componentes React
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Librerías
│   │   │   └── api/         # API client
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilidades frontend
│   ├── public/              # Archivos estáticos
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── uploads/                  # Videos originales
├── work/                     # Procesamiento temporal
├── outputs/                  # Clips finales
│   └── uploads/             # Organizados por jobId
└── tmp/                      # Archivos temporales
```

---

### Testing

#### Backend

**Testing manual con cURL**:
```bash
# 1. Health check
curl http://localhost:3000/api/health

# 2. Upload video
curl -X POST http://localhost:3000/api/videos/upload \
  -F "video=@test.mp4"

# 3. Process video
curl -X POST http://localhost:3000/api/process-video \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "upl_123",
    "mode": "auto",
    "clipDuration": 5,
    "maxClips": 10
  }'

# 4. Check status
curl http://localhost:3000/api/jobs/job_123/status
```

**Testing con scripts incluidos**:
```bash
# Test completo
node test-complete-flow.js

# Test de upload
node test-upload.js

# Test de procesamiento
node test-processing.js

# Test de Metricool
node test-metricool-integration.js
```

#### Frontend

**Testing manual**:
1. Abrir `http://localhost:3001/tester/`
2. Subir un video de prueba
3. Configurar distribución
4. Procesar y verificar resultados

**URLs de prueba incluidas**:
- Big Buck Bunny (9 min, 720p)
- Sintel (52s, 720p)
- Test Video (10s, 1MB)

---

### Debugging

#### Backend

**Logs con Winston**:
```javascript
const logger = require('./utils/logger');

logger.info('Job started', { jobId });
logger.error('Processing failed', { error });
logger.debug('FFmpeg command', { command });
```

**Logs de PM2**:
```bash
# Ver logs en tiempo real
pm2 logs storyclip

# Ver solo errores
pm2 logs storyclip --err

# Ver últimas 100 líneas
pm2 logs storyclip --lines 100
```

**Redis CLI**:
```bash
redis-cli

# Ver todas las keys
KEYS *

# Ver contenido de una queue
LRANGE bull:story-queue:wait 0 -1

# Ver jobs activos
SMEMBERS bull:story-queue:active
```

**SQLite CLI**:
```bash
sqlite3 /srv/storyclip/database/storyclip.db

# Ver todos los jobs
SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;

# Ver jobs en progreso
SELECT * FROM jobs WHERE status = 'running';

# Ver batches de publicación
SELECT * FROM publish_batches WHERE status = 'processing';
```

#### Frontend

**React DevTools**:
- Instalar extensión de navegador
- Inspeccionar componentes
- Ver estado y props

**Network Tab**:
- Ver requests a API
- Verificar payloads
- Revisar respuestas

**Console logs**:
```javascript
console.log('State:', state);
console.log('API response:', response);
```

---

## 🚀 DESPLIEGUE Y CONFIGURACIÓN

### Producción con PM2

**1. Instalar PM2**:
```bash
npm install -g pm2
```

**2. Configurar ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'storyclip',
    script: 'app.js',
    cwd: '/srv/storyclip',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: '/var/log/pm2/storyclip-error.log',
    out_file: '/var/log/pm2/storyclip-out.log',
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
```

**3. Iniciar**:
```bash
cd /srv/storyclip
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**4. Gestión**:
```bash
# Ver estado
pm2 list

# Reiniciar
pm2 restart storyclip

# Detener
pm2 stop storyclip

# Ver logs
pm2 logs storyclip

# Monitoreo
pm2 monit
```

---

### Nginx como Proxy Inverso

**Configuración**: `/etc/nginx/sites-available/storyclip`

```nginx
server {
    listen 80;
    server_name story.creatorsflow.app;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name story.creatorsflow.app;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/story.creatorsflow.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/story.creatorsflow.app/privkey.pem;

    # API (backend)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts para procesamiento largo
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Outputs (clips generados)
    location /outputs/ {
        alias /srv/storyclip/outputs/;
        autoindex off;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=31536000";
    }

    # Frontend (Next.js)
    location /tester/ {
        alias /srv/storyclip/frontend/out/;
        try_files $uri $uri/ /tester/index.html;
    }

    # Max upload size
    client_max_body_size 10G;
}
```

**Activar configuración**:
```bash
sudo ln -s /etc/nginx/sites-available/storyclip /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d story.creatorsflow.app

# Renovación automática (cron ya configurado por certbot)
sudo certbot renew --dry-run
```

---

### Monitoreo

#### Prometheus + Grafana (opcional)

**1. Instalar Prometheus**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'storyclip'
    static_configs:
      - targets: ['localhost:3000']
```

**2. El backend ya expone métricas en `/metrics`**:
```
jobs_created_total
jobs_completed_total
jobs_failed_total
job_duration_seconds
```

**3. Configurar alertas**:
```yaml
# alerts.yml
groups:
  - name: storyclip
    rules:
      - alert: HighFailureRate
        expr: rate(jobs_failed_total[5m]) > 0.1
        annotations:
          summary: "High job failure rate"
```

---

## 🔧 TROUBLESHOOTING

### Problemas Comunes

#### 1. Job se queda en 95%

**Causa**: El sistema antiguo tenía este problema. El nuevo sistema (robust-processing) lo soluciona.

**Solución**:
- Asegurarse de usar `/api/process-video` (robust-routes)
- NO usar `/api/stories/:id/process` (legacy)
- Verificar logs: `pm2 logs storyclip`

---

#### 2. Upload falla con archivos grandes

**Causa**: Límite de tamaño en Nginx o Express

**Solución**:
```nginx
# Nginx
client_max_body_size 10G;
```

```javascript
// Express
app.use(express.json({ limit: '10gb' }));
app.use(express.urlencoded({ limit: '10gb', extended: true }));
```

---

#### 3. FFmpeg no encontrado

**Causa**: FFmpeg no está en el PATH

**Solución**:
```bash
# Verificar instalación
which ffmpeg
ffmpeg -version

# Si no está instalado
sudo apt install ffmpeg

# O instalar versión estática (recomendado)
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
sudo cp ffmpeg-*-static/ffmpeg /usr/local/bin/
sudo cp ffmpeg-*-static/ffprobe /usr/local/bin/
```

---

#### 4. Redis connection refused

**Causa**: Redis no está corriendo

**Solución**:
```bash
# Verificar Redis
sudo systemctl status redis-server

# Iniciar Redis
sudo systemctl start redis-server

# Verificar conexión
redis-cli ping
# Debe responder: PONG
```

---

#### 5. CORS errors en frontend

**Causa**: Origen no permitido en ALLOWED_ORIGINS

**Solución**:
```bash
# Backend .env
ALLOWED_ORIGINS=http://localhost:3001,https://story.creatorsflow.app

# Reiniciar backend
pm2 restart storyclip
```

---

#### 6. WebSocket no conecta

**Causa**: Nginx no está configurado para WebSocket

**Solución**:
```nginx
location /ws {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

#### 7. Clips no se descargan

**Causa**: Permisos de archivos incorrectos

**Solución**:
```bash
# Verificar permisos
ls -la /srv/storyclip/outputs/

# Corregir permisos
sudo chown -R www-data:www-data /srv/storyclip/outputs/
sudo chmod -R 755 /srv/storyclip/outputs/
```

---

#### 8. Metricool API error

**Causa**: Token inválido o expirado

**Solución**:
```bash
# Verificar token
curl -X GET "https://app.metricool.com/api/admin/simpleProfiles?userId=4172139" \
  -H "X-Mc-Auth: YOUR_TOKEN"

# Si falla, regenerar token en Metricool dashboard
```

---

### Logs y Debugging

**Ver logs del backend**:
```bash
# PM2 logs
pm2 logs storyclip

# Logs del sistema
tail -f /var/log/pm2/storyclip-error.log
tail -f /var/log/pm2/storyclip-out.log
```

**Ver jobs en la base de datos**:
```bash
sqlite3 /srv/storyclip/database/storyclip.db

SELECT job_id, status, progress, error_msg
FROM jobs
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 10;
```

**Ver estado de Redis**:
```bash
redis-cli

# Ver todas las keys
KEYS *

# Ver info del servidor
INFO

# Ver memoria usada
MEMORY STATS
```

**Monitorear procesos**:
```bash
# Uso de CPU y memoria
htop

# Procesos de Node.js
ps aux | grep node

# Procesos de FFmpeg
ps aux | grep ffmpeg
```

---

## 📚 GLOSARIO

### Términos Técnicos

- **Job**: Tarea de procesamiento de video. Tiene un ID único y estados (pending, running, done, error).
- **Clip**: Segmento de video extraído del video original. Puede tener filtros y efectos aplicados.
- **Story**: Clip corto optimizado para Instagram/Facebook Stories (típicamente 5-15 segundos).
- **Reel**: Clip más largo optimizado para Instagram/Facebook Reels (típicamente 15-60 segundos).
- **Upload ID**: Identificador único del video subido, antes de ser procesado.
- **Batch**: Conjunto de clips que se publican juntos a redes sociales.
- **Preset**: Configuración predefinida de filtros, efectos o exportación.
- **Overlay**: Capa visual superpuesta al video (texto, imágenes, animaciones).
- **Filter**: Efecto visual aplicado al video (vintage, cinematic, blur, etc.).
- **Idempotency Key**: Hash único que identifica una configuración específica para evitar reprocesamiento.

### Acrónimos

- **API**: Application Programming Interface
- **CORS**: Cross-Origin Resource Sharing
- **SSE**: Server-Sent Events
- **FFmpeg**: Fast Forward MPEG (herramienta de procesamiento multimedia)
- **PM2**: Process Manager 2
- **CDN**: Content Delivery Network
- **JWT**: JSON Web Token
- **CRUD**: Create, Read, Update, Delete
- **WAL**: Write-Ahead Logging (modo de SQLite)
- **SPA**: Single Page Application
- **SSR**: Server-Side Rendering
- **SSG**: Static Site Generation

---

## 📞 SOPORTE

### Recursos

- **Repositorio**: `/srv/storyclip/`
- **Logs Backend**: `/var/log/pm2/storyclip-*.log`
- **Base de Datos**: `/srv/storyclip/database/storyclip.db`
- **Documentación adicional**: `/srv/storyclip/docs/`

### Contacto

Para soporte técnico o consultas, contactar al equipo de desarrollo de StoryClip.

---

## 📝 CHANGELOG

### v1.0.0 (Octubre 2025)
- ✅ Sistema de procesamiento robusto (nunca se queda en 95%)
- ✅ Integración completa con Metricool
- ✅ WebSocket para progreso en tiempo real
- ✅ Frontend Next.js 15 con React 19
- ✅ Sistema de colas con Bull/Redis
- ✅ Base de datos SQLite para persistencia
- ✅ Sugerencias IA con animaciones
- ✅ Procesamiento por lotes
- ✅ Descarga de clips en ZIP

---

**Fin de la Documentación Técnica**

*Este documento proporciona una visión completa de la arquitectura, implementación y operación de StoryClip. Para actualizaciones o correcciones, editar este archivo en `/srv/storyclip/DOCUMENTACION_TECNICA_COMPLETA.md`.*
