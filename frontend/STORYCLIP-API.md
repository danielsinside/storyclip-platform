# Story Clip Backend - API Documentation 🎬

## 📋 General Information

**Base URL:** `http://localhost:3000` o `https://story.creatorsflow.app`  
**Authentication:** API Key via `x-api-key` header

## 🔑 API Keys por Tenant

### Tenants Disponibles

| Tenant | API Key | Scopes |
|--------|---------|--------|
| **stories** | `sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3` | render, presets, capabilities |
| **reels** | `sk_2d3857dc286a003cc5c8986030d33b57a117867020cb416c9257d2e20e71f228` | render, presets, capabilities |
| **videoanalyzer** | `sk_6c661489882f07a55fd3f2e9b4fad6f044aeb660abbd1bc3c02189ac26529d38` | analyze, presets, capabilities |
| **genai** | `sk_b74decf7ff977afd222232a09399bedc011266cc4d0b19ccf39b64e6cdb84f9e` | render, presets, capabilities |

**Ubicación del código:** `/srv/storyclip/middleware/auth.js`

---

## 📡 Endpoints Principales

### 1. Health Check

**GET** `/api/health`

Verifica el estado del servidor.

**Headers:**
```
x-api-key: [API_KEY]
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T06:54:09.988Z",
  "uptime": 644.872832433,
  "version": "1.0.0"
}
```

---

### 2. Render Video Job

**POST** `/api/render`

Crea un job de renderizado de video con un preset específico.

**Headers:**
```
Content-Type: application/json
x-api-key: [API_KEY]
```

**Body:**
```json
{
  "preset": "storyclip_social_916",
  "inputs": [
    {
      "src": "https://example.com/video.mp4",
      "type": "video"
    }
  ],
  "overlays": [
    {
      "src": "https://example.com/logo.png",
      "position": "top-right",
      "opacity": 0.8
    }
  ],
  "output": {
    "format": "mp4",
    "quality": "high"
  },
  "metadata": {
    "title": "My Video",
    "description": "Test video"
  }
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "jobId": "b0a3e54b-abdf-400d-808a-9be4781431f7",
  "status": "processing",
  "progress": 50,
  "createdAt": "2025-10-21T06:54:27.324Z"
}
```

**Response (Error - 400):**
```json
{
  "error": "Preset is required"
}
```

---

### 3. Get Job Status

**GET** `/api/render/:jobId`

Obtiene el estado de un job de renderizado.

**Headers:**
```
x-api-key: [API_KEY]
```

**Response:**
```json
{
  "jobId": "b0a3e54b-abdf-400d-808a-9be4781431f7",
  "preset": "storyclip_social_916",
  "status": "completed",
  "progress": 100,
  "outputs": [
    {
      "url": "https://story.creatorsflow.app/outputs/2025-10-21/b0a3e54b-abdf-400d-808a-9be4781431f7.mp4",
      "format": "mp4",
      "size": 1234567
    }
  ],
  "error": null,
  "createdAt": "2025-10-21T06:54:27.324Z",
  "updatedAt": "2025-10-21T06:55:30.120Z",
  "metadata": {
    "title": "My Video"
  }
}
```

**Status Values:**
- `queued`: Job en cola
- `processing`: Procesando
- `completed`: Completado exitosamente
- `failed`: Falló con error
- `cancelled`: Cancelado por el usuario

---

### 4. List All Jobs

**GET** `/api/render`

Lista todos los jobs de renderizado.

**Headers:**
```
x-api-key: [API_KEY]
```

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "b0a3e54b-abdf-400d-808a-9be4781431f7",
      "preset": "storyclip_social_916",
      "status": "completed",
      "progress": 100,
      "createdAt": "2025-10-21T06:54:27.324Z",
      "updatedAt": "2025-10-21T06:55:30.120Z"
    }
  ]
}
```

---

### 5. Cancel Job

**DELETE** `/api/render/:jobId`

Cancela un job de renderizado en progreso.

**Headers:**
```
x-api-key: [API_KEY]
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Job cancelled"
}
```

**Response (Error - 400):**
```json
{
  "error": "Cannot cancel completed or failed job"
}
```

---

## 🎨 Presets Disponibles

### Ubicación
**Archivo:** `/srv/storyclip/presets/ffmpeg_presets.json`

### Lista de Presets

| ID | Nombre | Descripción | Velocidad | Calidad |
|----|--------|-------------|-----------|---------|
| `storyclip_fast` | H.264 Rápido | Para previews y export general | Fast | Good |
| `storyclip_quality` | HEVC Alta Calidad | 50-60% menos tamaño que H.264 | Slow | Excellent |
| `storyclip_social_916` | Stories/Reels 9:16 | Formato vertical con loudness | Fast | Good |
| `storyclip_av1` | AV1 Moderno | Equilibrado con SVT-AV1 | Medium | Excellent |
| `storyclip_av1_fast` | AV1 Rápido | Velocidad prioritaria | Fast | Good |
| `storyclip_stabilized` | Estabilizado | Con estabilización automática | Medium | Good |
| `storyclip_vmaf_quality` | Calidad VMAF | Con análisis de calidad | Medium | Excellent |

### Detalle del Preset Social 9:16

```json
{
  "id": "storyclip_social_916",
  "name": "Stories/Reels 9:16",
  "description": "Stories/Reels 9:16 con keyframes y loudness",
  "cmd": "-vf \"scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p\" -c:v libx264 -preset veryfast -crf 21 -g 48 -keyint_min 48 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k -af \"loudnorm=I=-14:TP=-1.5:LRA=11\"",
  "suitable_for": ["stories", "reels", "social_vertical"],
  "quality": "good",
  "speed": "fast"
}
```

---

## 🚀 Sistema Robusto de Procesamiento

### Upload de Video

**POST** `/api/videos/upload`

Sube un video para procesamiento.

**Headers:**
```
Content-Type: multipart/form-data
x-api-key: [API_KEY]
```

**Body (Form Data):**
- `file`: Video file (hasta 10GB)
- `uploadId` (opcional): ID personalizado para el upload

**Response:**
```json
{
  "success": true,
  "uploadId": "upl_1729493067234_abc123",
  "filename": "upl_1729493067234_abc123.mp4",
  "size": 1234567,
  "videoUrl": "https://story.creatorsflow.app/outputs/uploads/upl_1729493067234_abc123.mp4",
  "message": "File uploaded successfully. Use uploadId to process."
}
```

---

### Process Video

**POST** `/api/process-video`

Procesa un video previamente subido.

**Headers:**
```
Content-Type: application/json
x-api-key: [API_KEY]
```

**Body:**
```json
{
  "uploadId": "upl_1729493067234_abc123",
  "mode": "auto",
  "clipDuration": 5,
  "maxClips": 50,
  "filters": {
    "brightness": 1.1,
    "contrast": 1.2,
    "saturation": 1.1
  },
  "audio": {
    "volume": 1.0,
    "fadeIn": 0.5,
    "fadeOut": 0.5
  },
  "metadata": {
    "title": "My Processed Video"
  }
}
```

**Modo Manual con Clips:**
```json
{
  "uploadId": "upl_1729493067234_abc123",
  "mode": "manual",
  "clips": [
    {"start": 0, "end": 5},
    {"start": 10, "end": 15},
    {"start": 20, "end": 25}
  ],
  "filters": {}
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_1729493067890_xyz789",
  "status": "processing",
  "message": "Processing started"
}
```

---

### Get Job Status (Sistema Robusto)

**GET** `/api/v1/jobs/:jobId/status`

Obtiene el estado de un job con monitoreo en tiempo real.

**Headers:**
```
x-api-key: [API_KEY]
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_1729493067890_xyz789",
  "status": "completed",
  "progress": 100,
  "message": "Processing completed successfully",
  "startTime": "2025-10-21T06:54:27.324Z",
  "lastUpdate": "2025-10-21T06:55:30.120Z",
  "duration": 63000,
  "websocketUrl": "ws://localhost:3000/ws?jobId=job_1729493067890_xyz789"
}
```

---

## 🧪 Testing con cURL

### Ejemplo Completo

```bash
#!/bin/bash

API_KEY="sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3"
BASE_URL="http://localhost:3000"

# 1. Health Check
curl -X GET "$BASE_URL/api/health" \
  -H "x-api-key: $API_KEY"

# 2. Crear Job de Render
JOB_RESPONSE=$(curl -X POST "$BASE_URL/api/render" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "preset": "storyclip_social_916",
    "inputs": [
      {
        "src": "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
        "type": "video"
      }
    ]
  }')

# Extraer jobId
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.jobId')

# 3. Verificar Status
sleep 5
curl -X GET "$BASE_URL/api/render/$JOB_ID" \
  -H "x-api-key: $API_KEY"
```

---

## ⚠️ Errores Comunes

### 401 Unauthorized
```json
{
  "error": "API key required",
  "code": "MISSING_API_KEY"
}
```
**Solución:** Agregar header `x-api-key` con una API key válida.

### 401 Invalid API Key
```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```
**Solución:** Usar una de las API keys válidas del sistema.

### 400 Preset Required
```json
{
  "error": "Preset is required"
}
```
**Solución:** Incluir un `preset` válido en el body del request.

### 404 Job Not Found
```json
{
  "error": "Job not found"
}
```
**Solución:** Verificar que el `jobId` sea correcto y que el job exista.

---

## 📁 Estructura de Directorios

```
/srv/storyclip/
├── middleware/
│   └── auth.js              # Autenticación con API keys hardcodeadas
├── routes/
│   ├── render.js            # Endpoints de renderizado
│   ├── robust-routes.js     # Sistema robusto de upload/process
│   ├── api.js               # Rutas API generales
│   └── health.js            # Health checks
├── presets/
│   └── ffmpeg_presets.json  # Presets de FFmpeg
├── services/
│   ├── render.service.js    # Servicio de renderizado
│   └── robust-processing.service.js  # Procesamiento robusto
├── outputs/                 # Videos procesados
└── tmp/                     # Archivos temporales
```

---

## 🔧 Configuración del Servidor

**Archivo:** `/srv/storyclip/.env`

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CDN_BASE=https://story.creatorsflow.app/outputs
UPLOAD_TMP_DIR=/srv/storyclip/tmp/uploads
PROCESS_WORK_DIR=/srv/storyclip/work
OUTPUT_ROOT=/srv/storyclip/outputs
```

**Proceso PM2:**
```bash
pm2 list
# storyclip | online | port 3000

pm2 logs storyclip
# Ver logs en tiempo real

pm2 restart storyclip
# Reiniciar el servicio
```

---

## 📞 Soporte

Para modificar las API keys o agregar nuevos tenants, edita el archivo:
`/srv/storyclip/middleware/auth.js`

**Nota:** Las API keys están hardcodeadas en el código y no se leen desde variables de entorno.