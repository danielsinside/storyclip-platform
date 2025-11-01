# StoryClips - Mock Server

Servidor mock completo con soporte SSE (Server-Sent Events) para simular el backend de StoryClips.

## 🚀 Instalación y Uso

```bash
# Desde el directorio mock-server
npm install

# Iniciar servidor
npm run dev
```

El servidor estará en **http://localhost:4000**

## 📡 Endpoints REST API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/creators` | Lista de creadores |
| GET | `/api/integrations/metricool/brands` | Brands de Metricool/Facebook |
| POST | `/api/story/upload` | Subir video (retorna uploadId) |
| GET | `/api/story/preset/:presetId` | Obtener preset generado por IA |
| POST | `/api/story/apply-preset` | Aceptar preset IA y procesar |
| POST | `/api/story/manual/preview` | Preview con config manual |
| POST | `/api/story/manual/process` | Procesar con config manual |
| GET | `/api/storyclips/:jobId/list` | Lista de clips generados |
| POST | `/api/storyclips/publish` | Publicar clips |
| GET | `/api/jobs/:jobId` | Estado del job |

## 🔄 Streams SSE (Tiempo Real)

| Endpoint | Descripción | Eventos |
|----------|-------------|---------|
| `GET /realtime/upload/:uploadId` | Análisis IA del video | start, analyzing, preset_ready, complete |
| `GET /realtime/jobs/:jobId` | Generación de 50 clips | start, processing, complete, done |
| `GET /realtime/publish/:publishJobId` | Publicación de clips | start, publishing, clip_published, clip_failed, complete, done |

## 📂 Estructura de Mocks

```
mocks/
├── creators.json              # Creadores de prueba
├── metricool-brands.json      # Brands conectadas
├── upload-response.json       # {uploadId: "upl_001"}
├── preset.json                # Preset generado por IA
├── prepare-response.json      # {jobId: "job_process_001"}
├── clips-list.json            # 5 clips de ejemplo
├── publish-start.json         # {publishJobId: "pub_001"}
├── job-status.json            # Estado del procesamiento
├── publish-status.json        # Estado de publicación
├── sse-upload.ndjson          # Stream de análisis (8 eventos)
├── sse-job.ndjson             # Stream de generación (14 eventos)
└── sse-publish.ndjson         # Stream de publicación (20 eventos)
```

## 🌊 Flujo Completo de Uso

### 1️⃣ Upload + Análisis IA
```bash
# Frontend: Sube video
POST /api/story/upload
→ {uploadId: "upl_001"}

# Frontend: Conecta a SSE
GET /realtime/upload/upl_001
→ Eventos: analyzing... → preset_ready → complete
→ data.presetId = "preset_001"
```

### 2️⃣ Ver Preset IA
```bash
GET /api/story/preset/preset_001
→ {seed, delayMode, cuts, audio, metadata, explanation}
```

### 3️⃣ Aceptar Preset → Procesar
```bash
POST /api/story/apply-preset
→ {jobId: "job_process_001"}

# Conectar a SSE
GET /realtime/jobs/job_process_001
→ Eventos: processing clip 1/50... 50/50 → done
```

### 4️⃣ Obtener Clips
```bash
GET /api/storyclips/job_process_001/list
→ {items: [5 clips de ejemplo]}
```

### 5️⃣ Publicar
```bash
POST /api/storyclips/publish
→ {publishJobId: "pub_001"}

# Conectar a SSE
GET /realtime/publish/pub_001
→ Eventos: clip_published (0), (4), (9)... → complete
```

## 🎯 Ejemplo de Eventos SSE

### Upload Stream
```
data: {"type":"start","message":"Upload started"}
data: {"type":"analyzing","message":"Analyzing video content..."}
data: {"type":"analyzing","message":"Detecting scenes","progress":40}
data: {"type":"preset_ready","message":"AI preset ready","data":{"presetId":"preset_001"}}
data: {"type":"complete","message":"Analysis complete"}
```

### Processing Stream
```
data: {"type":"processing","message":"Processing clip 1/50","progress":2}
data: {"type":"processing","message":"Processing clip 10/50","progress":20}
data: {"type":"processing","message":"Processing clip 50/50","progress":100}
data: {"type":"done","message":"Ready to publish"}
```

### Publish Stream
```
data: {"type":"clip_published","message":"Clip 1 published","data":{"clipIndex":0}}
data: {"type":"clip_failed","message":"Clip 15 failed - will retry","data":{"clipIndex":14}}
data: {"type":"complete","message":"Publication complete - 49/50 published"}
```

## ⚙️ Configuración

- **Puerto**: 4000 (configurable con `PORT` env var)
- **CORS**: Habilitado para todos los orígenes
- **Intervalo SSE**: 800-1000ms entre eventos
- **Formato**: JSON para REST, newline-delimited JSON para SSE

## 🧪 Testing

```bash
# Test upload
curl -X POST http://localhost:4000/api/story/upload

# Test SSE (mantiene conexión abierta)
curl http://localhost:4000/realtime/upload/upl_001

# Test preset
curl http://localhost:4000/api/story/preset/preset_001
```

## 📝 Notas

- Todos los datos son mocks estáticos
- Los SSE simulan procesamiento real con delays
- El frontend debe conectarse a `http://localhost:4000`
- Asegúrate de que el puerto 4000 esté libre
