# Integración con Lovable - StoryClip Backend

**Fecha**: 2025-10-27
**Estado**: ✅ **CONFIGURADO Y FUNCIONANDO**

---

## 🎯 Resumen

El backend de StoryClip está configurado para funcionar con **múltiples frontends**:
1. ✅ **Frontend de Lovable** (desarrollo/producción)
2. ✅ **Frontend estático** en `https://story.creatorsflow.app`

---

## 🌐 Dominios de Lovable Permitidos

### Configurados en `.env`
```env
ALLOWED_ORIGINS=https://storyclip-studio.lovable.app,https://id-preview--92c9540b-7547-4104-876c-daca56a762f8.lovable.app,https://preview--storyclip-studio.lovable.app,https://preview--visual-story-pulse.lovable.app,https://visual-story-pulse.lovable.app
```

### Patrones Dinámicos en Middleware CORS
El backend también acepta **cualquier** subdominio de:
- `*.lovable.app`
- `*.lovable.dev`
- `*.lovableproject.com`
- `*.creatorsflow.app`

Esto significa que **automáticamente** funcionará con:
- Previews de Lovable: `https://preview--*.lovable.app`
- IDs dinámicos: `https://id-preview--*.lovable.app`
- Cualquier nuevo proyecto de Lovable

---

## 🔧 Configuración Técnica

### 1. Middleware CORS (`middleware/cors.js`)

**Estado**: ✅ HABILITADO

```javascript
// Verifica orígenes desde .env
const allowedOriginsList = process.env.ALLOWED_ORIGINS.split(',');

// Patrones de regex para dominios dinámicos
const allowedPatterns = [
  /^https?:\/\/([a-z0-9-]+\.)*lovable\.app$/i,
  /^https?:\/\/([a-z0-9-]+\.)*lovable\.dev$/i,
  /^https?:\/\/([a-z0-9-]+\.)*lovableproject\.com$/i,
];

// Configura headers CORS dinámicamente según el origen
res.setHeader('Access-Control-Allow-Origin', origin);
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
```

### 2. Nginx (`/etc/nginx/sites-available/story.creatorsflow.app`)

**Estado**: ✅ CORS DISABLED (Backend maneja CORS)

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    # ... headers de proxy ...

    # CORS Headers - DISABLED - Backend handles CORS for Lovable compatibility
    # Nginx no añade headers CORS para permitir múltiples orígenes
}
```

**¿Por qué?**
- Nginx NO puede manejar múltiples orígenes dinámicos fácilmente
- El backend de Node.js maneja CORS de forma dinámica según el origen
- Evita conflictos de "multiple Access-Control-Allow-Origin headers"

### 3. Alias de Endpoints (`app.js`)

**Estado**: ✅ CONFIGURADO

```javascript
// Alias para soportar frontend de Lovable que llama /api/process
app.post(['/api/process', '/api/process/'], (req, res, next) => {
  req.url = '/api/process-video'; // Reescribimos la URL internamente
  next();
});
```

**¿Por qué?**
- Lovable puede llamar a `/api/process`
- El backend lo redirige internamente a `/api/process-video`
- No requiere cambios en el frontend de Lovable

---

## 📡 Endpoints del API

### Base URL
```
https://story.creatorsflow.app/api/
```

### Endpoints Disponibles

#### 1. Upload de Video
```bash
POST /api/videos/upload
Content-Type: multipart/form-data

Campo: file (video)
```

**Respuesta**:
```json
{
  "success": true,
  "uploadId": "upl_1234567890_abc123",
  "filename": "upl_1234567890_abc123.mp4",
  "size": 123456789,
  "videoUrl": "https://story.creatorsflow.app/outputs/uploads/upl_1234567890_abc123.mp4",
  "message": "File uploaded successfully. Use uploadId to process."
}
```

#### 2. Procesamiento de Video
```bash
POST /api/process-video
# O alternativamente:
POST /api/process

Content-Type: application/json
```

**Body**:
```json
{
  "uploadId": "upl_1234567890_abc123",
  "mode": "manual",
  "clips": [
    { "start": 0, "end": 5 },
    { "start": 6, "end": 11 }
  ],
  "filters": {},
  "effects": {
    "filter": {
      "type": "none",
      "intensity": 50
    }
  },
  "overlays": {},
  "audio": {},
  "metadata": {}
}
```

**Respuesta**:
```json
{
  "success": true,
  "jobId": "job_1234567890_xyz789",
  "status": "running",
  "message": "Story processing started"
}
```

#### 3. Consultar Status del Job
```bash
GET /api/stories/:jobId/status
```

**Respuesta (en progreso)**:
```json
{
  "id": "job_1234567890_xyz789",
  "status": "running",
  "progress": 45,
  "message": "Processing clip 3/10...",
  "result": null
}
```

**Respuesta (completado)**:
```json
{
  "id": "job_1234567890_xyz789",
  "status": "done",
  "progress": 100,
  "message": "Job completed successfully - 10 clips generated",
  "result": {
    "artifacts": [
      {
        "id": "clip_001",
        "type": "video",
        "filename": "clip_001.mp4",
        "url": "https://story.creatorsflow.app/outputs/job_1234567890_xyz789/clip_001.mp4",
        "format": "mp4",
        "size": 1234567,
        "duration": 5
      }
    ]
  },
  "totalClips": 10
}
```

#### 4. Health Check
```bash
GET /api/health
```

**Respuesta**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T23:52:38.338Z",
  "uptime": 1565.65,
  "version": "1.0.0"
}
```

---

## ✅ Tests de Verificación

### Test 1: CORS desde Lovable
```bash
curl -I -X OPTIONS https://story.creatorsflow.app/api/health \
  -H "Origin: https://storyclip-studio.lovable.app" \
  -H "Access-Control-Request-Method: GET"
```

**Headers esperados**:
```
access-control-allow-origin: https://storyclip-studio.lovable.app
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-credentials: true
access-control-max-age: 86400
```

### Test 2: Health Check
```bash
curl https://story.creatorsflow.app/api/health \
  -H "Origin: https://storyclip-studio.lovable.app"
```

**Respuesta esperada**:
```json
{"status":"ok","uptime":1234.56,"version":"1.0.0"}
```

### Test 3: Upload desde Lovable (simulado)
```bash
curl -X POST https://story.creatorsflow.app/api/videos/upload \
  -H "Origin: https://storyclip-studio.lovable.app" \
  -F "file=@video.mp4"
```

---

## 🔐 Configuración del Frontend de Lovable

### Variables de Entorno Requeridas

En tu proyecto de Lovable, configura estas variables:

```env
VITE_STORYCLIP_BASE=https://story.creatorsflow.app
VITE_STORYCLIP_CDN=https://story.creatorsflow.app/outputs
VITE_STORYCLIP_API_KEY=sk_prod_21000fdf3489bf37c0c48391e20c00947b125c3fd7bbf6f0
VITE_STORYCLIP_POLL_MS=2500
VITE_STORYCLIP_PROCESS_TIMEOUT_MS=900000
```

### Código de Ejemplo (Frontend Lovable)

```typescript
// Configuración del cliente API
const STORYCLIP_BASE = import.meta.env.VITE_STORYCLIP_BASE;
const STORYCLIP_API_KEY = import.meta.env.VITE_STORYCLIP_API_KEY;

// Upload de video
async function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${STORYCLIP_BASE}/api/videos/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Api-Key': STORYCLIP_API_KEY
    }
  });

  return await response.json();
}

// Procesamiento
async function processVideo(uploadId: string, clips: Array<{start: number, end: number}>) {
  const response = await fetch(`${STORYCLIP_BASE}/api/process-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': STORYCLIP_API_KEY
    },
    body: JSON.stringify({
      uploadId,
      mode: 'manual',
      clips,
      effects: { filter: { type: 'none', intensity: 50 } }
    })
  });

  return await response.json();
}

// Polling de status
async function pollJobStatus(jobId: string) {
  const response = await fetch(`${STORYCLIP_BASE}/api/stories/${jobId}/status`, {
    headers: {
      'X-Api-Key': STORYCLIP_API_KEY
    }
  });

  return await response.json();
}
```

---

## 🛠️ Comandos Útiles

### Ver logs del backend
```bash
pm2 logs storyclip --lines 100
```

### Verificar CORS en tiempo real
```bash
pm2 logs storyclip | grep "CORS"
```

### Reiniciar backend
```bash
pm2 restart storyclip
```

### Ver orígenes permitidos
```bash
cat /srv/storyclip/.env | grep ALLOWED_ORIGINS
```

### Agregar nuevo dominio de Lovable
```bash
# Editar .env
nano /srv/storyclip/.env

# Agregar nuevo dominio a ALLOWED_ORIGINS (separado por coma)
ALLOWED_ORIGINS=...,https://nuevo-proyecto.lovable.app

# Reiniciar backend
pm2 restart storyclip
```

---

## 🐛 Troubleshooting

### Problema: CORS error en el navegador

**Síntoma**:
```
Access to fetch at 'https://story.creatorsflow.app/api/...' from origin 'https://mi-app.lovable.app'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Solución**:
1. Verificar que el dominio esté en `.env`:
   ```bash
   cat /srv/storyclip/.env | grep ALLOWED_ORIGINS
   ```

2. Si no está, agregarlo:
   ```bash
   nano /srv/storyclip/.env
   # Agregar el dominio a ALLOWED_ORIGINS
   ```

3. Reiniciar backend:
   ```bash
   pm2 restart storyclip
   ```

4. Verificar logs:
   ```bash
   pm2 logs storyclip | grep "CORS"
   ```

### Problema: Dominio permitido pero aún falla CORS

**Posible causa**: Nginx está añadiendo headers CORS en conflicto

**Verificar**:
```bash
cat /etc/nginx/sites-available/story.creatorsflow.app | grep -A 5 "CORS"
```

**Debe decir**:
```nginx
# CORS Headers - DISABLED - Backend handles CORS for Lovable compatibility
```

**Si no**, actualizar Nginx para que NO añada headers CORS.

### Problema: Endpoint /api/process no existe

**Causa**: El backend redirige `/api/process` → `/api/process-video`

**Verificar**:
```bash
grep "/api/process" /srv/storyclip/app.js
```

**Debe mostrar**:
```javascript
app.post(['/api/process', '/api/process/'], (req, res, next) => {
  req.url = '/api/process-video';
  next();
});
```

---

## 📊 Estado Actual

| Componente | Estado | Detalles |
|------------|--------|----------|
| **Backend CORS** | ✅ ENABLED | Maneja múltiples orígenes dinámicamente |
| **Nginx CORS** | ✅ DISABLED | No interfiere con backend |
| **Dominios Lovable** | ✅ ALLOWED | Todos los patrones `*.lovable.app` permitidos |
| **Alias /api/process** | ✅ CONFIGURED | Redirige a `/api/process-video` |
| **FFmpeg** | ✅ FIXED | Error 234 resuelto |
| **PM2** | ✅ ONLINE | PID 645993 |

---

## ✨ Conclusión

**El backend está 100% configurado para funcionar con Lovable**:

1. ✅ CORS habilitado para todos los dominios de Lovable
2. ✅ Endpoints compatibles (`/api/process` y `/api/process-video`)
3. ✅ Nginx configurado para NO interferir con CORS
4. ✅ Patrones dinámicos para soportar previews y nuevos proyectos
5. ✅ Error 234 de FFmpeg completamente resuelto

**Tu frontend de Lovable puede conectarse directamente al backend sin problemas.**

---

## 🎯 URLs de Referencia

- **Backend API**: `https://story.creatorsflow.app/api/`
- **Health Check**: `https://story.creatorsflow.app/api/health`
- **Outputs/CDN**: `https://story.creatorsflow.app/outputs/`
- **Frontend Estático**: `https://story.creatorsflow.app/`
- **Tu Frontend Lovable**: Configura `VITE_STORYCLIP_BASE=https://story.creatorsflow.app`
