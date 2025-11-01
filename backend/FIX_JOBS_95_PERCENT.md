# 🔧 Fix: Jobs atascados en 95% + Files temporales que se pierden

## ✅ Implementación Completada

### Fecha: 2025-10-17

## 🎯 Objetivo Alcanzado
1. ✅ El **archivo temporal NUNCA se pierde** entre upload y ffmpeg
2. ✅ El **paso final** mueve los clips a `/srv/storyclip/outputs/{jobId}` y marca `progress: 100`
3. ✅ Si algo falla, el job termina en `failed` (no se queda en 95%)

---

## 📁 Archivos Nuevos Creados

### 1. `/srv/storyclip/services/uploads.repository.js`
- Repositorio en memoria para trackear uploads temporales
- Mantiene el mapeo `uploadId → path absoluto del archivo`
- Métodos: `set()`, `get()`, `delete()`, `cleanup()`

### 2. `/srv/storyclip/services/watchdog.service.js`
- Watchdog que detecta jobs atascados en 95%
- Ejecuta cada 60 segundos
- Marca como `failed` los jobs que llevan más de 5 minutos en 95%

### 3. `/srv/storyclip/services/robust-processing.service.js`
- Servicio de procesamiento robusto
- Pipeline completo: upload → process → finalize
- Funciones:
  - `startProcess()`: Inicia procesamiento desde uploadId
  - `runPipeline()`: Ejecuta FFmpeg y mueve clips a outputs
  - `getJobStatus()`: Consulta estado del job en DB
  - `createJob()`: Crea registro en DB
  - `updateJobProgress()`: Actualiza progreso

### 4. `/srv/storyclip/routes/robust-routes.js`
- Rutas nuevas para upload y process
- Endpoints:
  - `POST /api/videos/upload?uploadId=xxx` - Upload estable
  - `POST /api/process-video` - Procesar desde uploadId
  - `GET /api/v1/jobs/:jobId/status` - Status del job

---

## 🔧 Variables de Entorno

Las siguientes variables ya están configuradas en `/srv/storyclip/.env`:

```env
# Rutas absolutas en el MISMO volumen (para usar rename sin copy)
UPLOAD_TMP_DIR=/srv/storyclip/tmp/uploads
PROCESS_WORK_DIR=/srv/storyclip/work
OUTPUT_ROOT=/srv/storyclip/outputs

# CDN base usado en result.artifacts.url
CDN_BASE=https://storyclip.creatorsflow.app/outputs
```

---

## 📂 Estructura de Directorios

```
/srv/storyclip/
├── tmp/
│   └── uploads/        ← Archivos subidos (persistentes)
├── work/
│   └── {jobId}/        ← Workspace temporal durante procesamiento
└── outputs/
    └── {jobId}/        ← Clips finales servidos por Nginx
        ├── clip_001.mp4
        ├── clip_002.mp4
        └── ...
```

Todos con permisos correctos:
- Directorio outputs: `755` (www-data:www-data)
- Clips: `644` (www-data:www-data)

---

## 🔄 Flujo de Procesamiento

### Paso 1: Upload
```bash
curl -F "file=@video.mp4" \
  "https://story.creatorsflow.app/api/videos/upload?uploadId=test_001"
```

Respuesta:
```json
{
  "success": true,
  "uploadId": "test_001",
  "temp_path": "/srv/storyclip/tmp/uploads/test_001.mp4",
  "filename": "test_001.mp4",
  "size": 123456789
}
```

### Paso 2: Process
```bash
curl -H "Content-Type: application/json" \
  -d '{"uploadId":"test_001","clipDuration":5,"maxClips":50}' \
  https://story.creatorsflow.app/api/process-video
```

Respuesta:
```json
{
  "success": true,
  "jobId": "job_1760693132895_ceyrx7ls",
  "status": "running",
  "message": "Story processing started"
}
```

### Paso 3: Poll Status
```bash
JOB_ID="job_1760693132895_ceyrx7ls"
watch -n 2 "curl -s https://story.creatorsflow.app/api/v1/jobs/$JOB_ID/status | jq"
```

Progreso:
- 10% - File prepared
- 30% - Analyzing video...
- 90% - Exporting clips...
- **100% - Job completed** ← Ya NO se queda en 95%

Respuesta final:
```json
{
  "id": "job_xxx",
  "status": "done",
  "progress": 100,
  "message": "Job completed - 100%",
  "result": {
    "artifacts": [
      {
        "id": "clip_001",
        "url": "https://storyclip.creatorsflow.app/outputs/job_xxx/clip_001.mp4",
        "type": "video",
        "format": "mp4"
      }
    ]
  },
  "outputs": ["https://storyclip.creatorsflow.app/outputs/job_xxx/clip_001.mp4"]
}
```

### Paso 4: CDN Access
```bash
curl -I "https://storyclip.creatorsflow.app/outputs/$JOB_ID/clip_001.mp4"
# HTTP/1.1 200 OK
```

---

## 🛡️ Protecciones Anti-Atasco

### 1. Watchdog Service
- **Intervalo**: 60 segundos
- **Umbral**: Jobs en `running` + `progress >= 95` + 5 minutos sin actualizar
- **Acción**: Marca como `failed` con mensaje "Stalled at 95%"

### 2. Pipeline Robusto
- **Rename primero**: Intenta `fs.rename()` para mover archivos (rápido, mismo volumen)
- **Fallback a Copy**: Si rename falla, usa `fs.copyFile()` + `fs.unlink()`
- **Logs detallados**: Cada paso registra progreso y errores
- **Cleanup**: Borra workDir al finalizar (éxito o error)

### 3. Gestión de Errores
- Si FFmpeg falla → Job marca como `error`
- Si no encuentra clips → Job marca como `error`
- Si no puede mover a outputs → Job marca como `error`
- **Nunca** se queda en 95% sin resolución

---

## ✅ Criterios de Aceptación

| Criterio | Estado |
|----------|--------|
| El job NO se queda en 95% | ✅ |
| Cambia a `completed: 100` o `failed` | ✅ |
| Archivos en `/srv/storyclip/outputs/{jobId}/` | ✅ |
| CDN responde 200 para clips | ✅ |
| `result.artifacts[].url` devuelve URLs válidas | ✅ |
| Upload/Process no pierden archivos | ✅ |
| Watchdog detecta y marca jobs atascados | ✅ |

---

## 🧪 Testing

### Test Manual
```bash
# 1. Health check
curl https://story.creatorsflow.app/api/health/unified | jq

# 2. Upload (requiere video real)
curl -F "file=@video.mp4" \
  "https://story.creatorsflow.app/api/videos/upload?uploadId=test_001"

# 3. Process
curl -H "Content-Type: application/json" \
  -d '{"uploadId":"test_001"}' \
  https://story.creatorsflow.app/api/process-video

# 4. Poll hasta 100%
watch -n 2 "curl -s https://story.creatorsflow.app/api/v1/jobs/JOB_ID/status | jq"
```

### Verificar en DB
```bash
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT job_id, status, progress, error_msg FROM jobs ORDER BY created_at DESC LIMIT 10;"
```

---

## 📊 Logs y Monitoreo

### Ver logs en tiempo real
```bash
pm2 logs storyclip
```

### Buscar jobs completados
```bash
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT COUNT(*) FROM jobs WHERE status='done' AND progress=100;"
```

### Buscar jobs atascados
```bash
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT * FROM jobs WHERE status='running' AND progress >= 95;"
```

---

## 🔄 Integración con App Actual

El sistema robusto está **montado en paralelo** a las rutas existentes:

```javascript
// app.js
app.use('/api', robustRoutes);    // ← NUEVO sistema robusto
app.use('/api', apiRoutes);       // ← Sistema legacy
app.use('/api/v1', uploadRoutes); // ← Sistema legacy
```

**Ventajas**:
- No rompe funcionalidad existente
- Permite migración gradual
- Testing en producción sin riesgo

---

## 🚀 Estado Actual

- ✅ **Servidor funcionando**: PM2 online
- ✅ **Watchdog activo**: Ejecutándose cada 60s
- ✅ **Rutas disponibles**: /api/videos/upload, /api/process-video, /api/v1/jobs/:id/status
- ✅ **Base de datos**: SQLite operativa
- ✅ **Nginx configurado**: /outputs/ servido correctamente

---

## 📝 Próximos Pasos Recomendados

1. **Migrar frontend** para usar las nuevas rutas robustas
2. **Deprecar** sistema legacy una vez probado el robusto
3. **Agregar métricas** de tiempo de procesamiento por job
4. **Implementar retry** automático para jobs failed
5. **Dashboard** para monitorear jobs en tiempo real

---

## 🛠️ Troubleshooting

### Job se queda en 95%
- Verificar que watchdog esté corriendo: `pm2 logs storyclip | grep "Watchdog"`
- Manualmente: `sqlite3 /srv/storyclip/database/storyclip.db "UPDATE jobs SET status='error' WHERE job_id='xxx';"`

### Clips no aparecen en /outputs/
- Verificar permisos: `ls -la /srv/storyclip/outputs/{jobId}/`
- Verificar logs FFmpeg: `pm2 logs storyclip --err`

### Upload falla
- Verificar espacio en disco: `df -h /srv/storyclip`
- Verificar permisos: `ls -la /srv/storyclip/tmp/uploads/`

---

## 📞 Soporte

Para más información, revisar:
- Logs: `pm2 logs storyclip`
- Base de datos: `sqlite3 /srv/storyclip/database/storyclip.db`
- Documentación API: https://story.creatorsflow.app/api/health/unified

---

**Implementado por**: Claude AI  
**Fecha**: 2025-10-17  
**Status**: ✅ Completado y funcionando
