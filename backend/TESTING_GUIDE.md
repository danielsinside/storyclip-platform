# 🧪 Guía de Testing - Sistema Robusto StoryClip

## Fecha: 2025-10-17

---

## 📋 Pre-requisitos

- Video de prueba (formato: MP4, MOV, AVI, MKV, WEBM)
- `curl` instalado
- `jq` instalado (opcional, para formateo JSON)

---

## 🔄 Flujo Completo de Testing

### Paso 1: Upload del Video

```bash
# Subir un video con uploadId específico
curl -F "file=@tu_video.mp4" \
  "https://story.creatorsflow.app/api/videos/upload?uploadId=test_$(date +%s)"

# Respuesta esperada:
{
  "success": true,
  "uploadId": "test_1234567890",
  "temp_path": "/srv/storyclip/tmp/uploads/test_1234567890.mp4",
  "filename": "test_1234567890.mp4",
  "size": 123456789
}
```

**Guarda el `uploadId` para el siguiente paso.**

---

### Paso 2: Iniciar Procesamiento

```bash
# Procesar el video subido
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "test_1234567890",
    "clipDuration": 5,
    "maxClips": 50
  }' \
  https://story.creatorsflow.app/api/process-video | jq

# Respuesta esperada:
{
  "success": true,
  "jobId": "job_1760693132895_ceyrx7ls",
  "status": "running",
  "message": "Story processing started"
}
```

**Guarda el `jobId` para hacer polling.**

---

### Paso 3: Polling del Status

```bash
# Opción A: Polling manual
JOB_ID="job_1760693132895_ceyrx7ls"
curl -s "https://story.creatorsflow.app/api/v1/jobs/$JOB_ID/status" | jq

# Opción B: Polling automático con watch
watch -n 2 "curl -s https://story.creatorsflow.app/api/v1/jobs/$JOB_ID/status | jq '.status, .progress, .message'"
```

**Progreso esperado:**
```
10% - File prepared
30% - Analyzing video...
90% - Exporting clips...
100% - Job completed successfully - X clips generated
```

---

### Paso 4: Verificar Resultado Final

```bash
# Obtener resultado completo
curl -s "https://story.creatorsflow.app/api/v1/jobs/$JOB_ID/status" | jq

# Respuesta cuando finaliza:
{
  "id": "job_xxx",
  "status": "done",
  "progress": 100,
  "message": "Job completed successfully - 40 clips generated",
  "result": {
    "artifacts": [
      {
        "id": "clip_001",
        "url": "https://storyclip.creatorsflow.app/outputs/job_xxx/clip_001.mp4",
        "type": "video",
        "format": "mp4",
        "size": 1519939,
        "duration": 5
      },
      ...
    ]
  },
  "outputs": [
    "https://storyclip.creatorsflow.app/outputs/job_xxx/clip_001.mp4",
    ...
  ],
  "totalClips": 40,
  "createdAt": "2025-10-17T09:44:11.627Z",
  "finishedAt": "2025-10-17T09:44:36.686Z"
}
```

---

### Paso 5: Verificar CDN

```bash
# Verificar que el primer clip sea accesible
curl -I "https://storyclip.creatorsflow.app/outputs/$JOB_ID/clip_001.mp4"

# Respuesta esperada:
HTTP/2 200 
server: nginx/1.18.0 (Ubuntu)
content-type: video/mp4
content-length: 1519939
```

---

## 🧪 Script de Testing Automatizado

Guarda este script como `test_pipeline.sh`:

```bash
#!/bin/bash
set -e

VIDEO_FILE="$1"
if [ -z "$VIDEO_FILE" ]; then
  echo "Usage: $0 <video_file.mp4>"
  exit 1
fi

BASE_URL="https://story.creatorsflow.app"
UPLOAD_ID="test_$(date +%s)"

echo "🎬 Starting StoryClip Pipeline Test"
echo "=================================="
echo ""

# 1. Upload
echo "📤 Step 1: Uploading video..."
UPLOAD_RESP=$(curl -s -F "file=@$VIDEO_FILE" "$BASE_URL/api/videos/upload?uploadId=$UPLOAD_ID")
echo "$UPLOAD_RESP" | jq '.'

UPLOAD_SUCCESS=$(echo "$UPLOAD_RESP" | jq -r '.success')
if [ "$UPLOAD_SUCCESS" != "true" ]; then
  echo "❌ Upload failed"
  exit 1
fi
echo "✅ Upload successful: $UPLOAD_ID"
echo ""

# 2. Process
echo "⚙️  Step 2: Starting processing..."
PROCESS_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"uploadId\":\"$UPLOAD_ID\",\"clipDuration\":5,\"maxClips\":50}" \
  "$BASE_URL/api/process-video")
echo "$PROCESS_RESP" | jq '.'

JOB_ID=$(echo "$PROCESS_RESP" | jq -r '.jobId')
if [ -z "$JOB_ID" ] || [ "$JOB_ID" == "null" ]; then
  echo "❌ Process failed"
  exit 1
fi
echo "✅ Processing started: $JOB_ID"
echo ""

# 3. Poll status
echo "🔄 Step 3: Polling job status..."
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  STATUS_RESP=$(curl -s "$BASE_URL/api/v1/jobs/$JOB_ID/status")
  STATUS=$(echo "$STATUS_RESP" | jq -r '.status')
  PROGRESS=$(echo "$STATUS_RESP" | jq -r '.progress')
  MESSAGE=$(echo "$STATUS_RESP" | jq -r '.message')
  
  echo "[$ATTEMPT] Status: $STATUS | Progress: $PROGRESS% | $MESSAGE"
  
  if [ "$STATUS" == "done" ] && [ "$PROGRESS" == "100" ]; then
    echo ""
    echo "✅ Job completed successfully!"
    echo "$STATUS_RESP" | jq '.'
    
    # 4. Verify CDN
    FIRST_CLIP=$(echo "$STATUS_RESP" | jq -r '.result.artifacts[0].url')
    echo ""
    echo "🌐 Step 4: Verifying CDN access..."
    echo "Testing: $FIRST_CLIP"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FIRST_CLIP")
    if [ "$HTTP_CODE" == "200" ]; then
      echo "✅ CDN accessible (HTTP $HTTP_CODE)"
    else
      echo "❌ CDN not accessible (HTTP $HTTP_CODE)"
      exit 1
    fi
    
    TOTAL_CLIPS=$(echo "$STATUS_RESP" | jq -r '.totalClips')
    echo ""
    echo "🎉 Test completed successfully!"
    echo "   Total clips: $TOTAL_CLIPS"
    echo "   Job ID: $JOB_ID"
    exit 0
  fi
  
  if [ "$STATUS" == "error" ]; then
    echo ""
    echo "❌ Job failed: $MESSAGE"
    exit 1
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  sleep 5
done

echo ""
echo "❌ Timeout: Job did not complete in time"
exit 1
```

**Uso:**
```bash
chmod +x test_pipeline.sh
./test_pipeline.sh video.mp4
```

---

## 🔍 Verificación Manual en Servidor

### Verificar archivos en filesystem

```bash
# Ver últimos jobs completados
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT job_id, status, progress, finished_at FROM jobs WHERE status='done' ORDER BY created_at DESC LIMIT 5;"

# Ver archivos de un job específico
JOB_ID="job_xxx"
ls -lh /srv/storyclip/outputs/$JOB_ID/

# Contar clips
ls /srv/storyclip/outputs/$JOB_ID/ | grep -c "clip_.*\.mp4"

# Ver tamaño total
du -sh /srv/storyclip/outputs/$JOB_ID/
```

### Verificar logs

```bash
# Ver logs en tiempo real
pm2 logs storyclip

# Ver logs de procesamiento
pm2 logs storyclip | grep "progress\|completed\|failed"

# Ver logs del watchdog
pm2 logs storyclip | grep "Watchdog"
```

---

## ✅ Criterios de Éxito

Un test es exitoso cuando:

- [x] Upload retorna `success: true` y `uploadId`
- [x] Process retorna `success: true` y `jobId`
- [x] Job progresa: 10% → 30% → 90% → 100%
- [x] Status final: `status: "done"`, `progress: 100`
- [x] Array `artifacts` contiene todos los clips
- [x] Todos los clips son accesibles vía CDN (HTTP 200)
- [x] Archivos existen en `/srv/storyclip/outputs/{jobId}/`
- [x] Job NO se queda atascado en 95%

---

## 🐛 Troubleshooting

### Job se queda en running sin progresar

```bash
# Verificar logs
pm2 logs storyclip --err

# Verificar si watchdog está activo
pm2 logs storyclip | grep "Watchdog service started"

# Verificar estado en DB
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT * FROM jobs WHERE job_id='JOB_ID';"
```

### Clips no aparecen en /outputs/

```bash
# Verificar workDir
ls -la /srv/storyclip/work/JOB_ID/

# Verificar permisos
ls -la /srv/storyclip/outputs/JOB_ID/

# Verificar logs de FFmpeg
pm2 logs storyclip --err | grep -A 10 "JOB_ID"
```

### CDN retorna 403 o 404

```bash
# Verificar permisos del directorio
ls -ld /srv/storyclip/outputs/JOB_ID/

# Verificar permisos de los clips
ls -l /srv/storyclip/outputs/JOB_ID/*.mp4

# Corregir permisos si es necesario
sudo chown -R www-data:www-data /srv/storyclip/outputs/JOB_ID/
sudo chmod 755 /srv/storyclip/outputs/JOB_ID/
sudo chmod 644 /srv/storyclip/outputs/JOB_ID/*.mp4
```

---

## 📊 Métricas Esperadas

Para un video de ejemplo (~200MB, duración 5 minutos):

- **Upload**: 10-30 segundos (depende de conexión)
- **Processing**: 20-60 segundos (depende de clipDuration y maxClips)
- **Clips generados**: Calculado como `duración_video / clipDuration`
- **Tamaño por clip**: 1-2 MB promedio para clips de 5 segundos

---

## 🎯 Testing con Diferentes Configuraciones

### Test 1: Clips cortos (muchos clips)
```json
{
  "uploadId": "xxx",
  "clipDuration": 3,
  "maxClips": 100
}
```

### Test 2: Clips largos (pocos clips)
```json
{
  "uploadId": "xxx",
  "clipDuration": 10,
  "maxClips": 20
}
```

### Test 3: Video corto
Video de 30 segundos → ~6 clips de 5 segundos cada uno

### Test 4: Video largo
Video de 10 minutos → 50 clips (si maxClips=50)

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `pm2 logs storyclip`
2. Verifica la base de datos con las queries de arriba
3. Consulta la documentación completa en `/srv/storyclip/FIX_JOBS_95_PERCENT.md`

---

**Última actualización**: 2025-10-17  
**Estado**: ✅ Sistema validado y funcionando
