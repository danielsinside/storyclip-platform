# 🚀 QUICK START: Frontend-Backend Integration

## Estado Actual

✅ **Backend funcionando correctamente**
✅ **Endpoints compatibles con el frontend**
✅ **Puede descargar desde Supabase Storage**
⚠️ **Edge Function requiere deploy en Supabase**

---

## 📋 Checklist de 5 Minutos

### 1. Verificar Backend (30 segundos)

```bash
# Ejecutar test suite
./test-integration.sh

# O manualmente:
curl https://story.creatorsflow.app/api/health
# Expected: {"status":"ok"}
```

### 2. Configurar Edge Function en Supabase (2 minutos)

**Paso A: Añadir variables de entorno**

1. Ir a: https://app.supabase.com/project/YOUR_PROJECT/settings/functions
2. Click en "Add a new secret"
3. Añadir:
   - Name: `STORY_API_URL`
   - Value: `https://story.creatorsflow.app/api`
4. Añadir otra:
   - Name: `STORY_API_KEY`
   - Value: `sk_prod_21000fdf3489bf37c0c48391e20c00947b125c3fd7bbf6f0`

**Paso B: Deploy Edge Function**

```bash
# Desde el directorio del proyecto
cd /srv/storyclip/supabase/functions

# Deploy
npx supabase functions deploy storyclip-proxy --no-verify-jwt

# Verificar
npx supabase functions list
# Expected: storyclip-proxy should appear as deployed
```

### 3. Verificar URLs en Frontend (1 minuto)

**Archivo**: `src/lib/api.ts` o similar

```javascript
// Verificar que usa la URL correcta del Edge Function
const API_BASE_URL =
  'https://qjbtqunztvgwqgvhsfwk.supabase.co/functions/v1/storyclip-proxy';

// NO debe apuntar directamente al backend:
// ❌ const API_BASE_URL = 'https://story.creatorsflow.app/api';
```

### 4. Verificar Upload de Video (1 minuto)

**Archivo**: `src/lib/uploadToSupabase.ts`

```javascript
// Verificar que genera URLs públicas
const { data } = supabase.storage
  .from('videos')
  .getPublicUrl(filePath);

const videoUrl = data.publicUrl;
// Example: https://qjbtqunztvgwqgvhsfwk.supabase.co/storage/v1/object/public/videos/xxx.mp4
```

### 5. Probar Flujo Completo (30 segundos)

1. Abrir frontend: https://story.creatorsflow.app
2. Subir un video de prueba (pequeño, <100MB)
3. Generar preset con IA
4. Iniciar procesamiento
5. Verificar progreso en tiempo real

---

## 🔧 Formato de Request Correcto

### Opción A: Usando videoUrl (Recomendado ✅)

```javascript
// Frontend envía
const response = await fetch(`${API_BASE_URL}/process-video`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: 'https://qjbtqunztvgwqgvhsfwk.supabase.co/storage/v1/object/public/videos/upload_123.mp4',
    mode: 'manual',
    clips: [
      { start: 0, end: 8 },
      { start: 8, end: 15 },
      { start: 15, end: 28 }
    ],
    filters: {
      color: {
        brightness: -0.05,
        contrast: 1.15,
        saturation: 1.1,
        ffmpegCommand: 'eq=brightness=-0.05:contrast=1.15:saturation=1.1'
      }
    },
    audio: {
      ambientNoise: true,
      amplitude: 0.7
    },
    metadata: {
      title: 'Mi Video - Parte {clipIndex}',
      description: 'Descripción...',
      keywords: '#viral, #trending'
    }
  })
});

// Backend responde inmediatamente
const result = await response.json();
// { success: true, jobId: 'job_xxx', status: 'queued' }
```

### Opción B: Usando uploadId

```javascript
// Si subes directamente al backend primero
const uploadResponse = await fetch(`${API_BASE_URL}/videos/upload`, {
  method: 'POST',
  body: formData
});

const { uploadId } = await uploadResponse.json();

// Luego procesar
await fetch(`${API_BASE_URL}/process-video`, {
  method: 'POST',
  body: JSON.stringify({
    uploadId: uploadId,  // Usar ID en lugar de URL
    mode: 'manual',
    // ... resto igual
  })
});
```

---

## 📊 Polling del Job

```javascript
// Consultar estado cada 3 segundos
const pollJobStatus = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/v1/jobs/${jobId}/status`);
  const status = await response.json();

  console.log('Status:', status.status);  // queued|running|done|error
  console.log('Progress:', status.progress);  // 0-100
  console.log('Message:', status.message);

  if (status.status === 'done') {
    console.log('Outputs:', status.outputs);  // Array of clip URLs
    return status;
  } else if (status.status === 'error') {
    console.error('Error:', status.error);
    throw new Error(status.error);
  }

  // Continuar polling
  await new Promise(resolve => setTimeout(resolve, 3000));
  return pollJobStatus(jobId);
};

// Usar
const jobId = 'job_1234567890_abc123';
const finalStatus = await pollJobStatus(jobId);

// Procesar outputs
finalStatus.outputs.forEach((url, index) => {
  console.log(`Clip ${index + 1}: ${url}`);
});
```

---

## 🐛 Troubleshooting Rápido

### Error: "Upload not found"

```javascript
// ❌ NO FUNCIONA
{ uploadId: 'upl_xxx' }  // Si no subiste al backend primero

// ✅ FUNCIONA
{ videoUrl: 'https://supabase.co/.../video.mp4' }
```

### Error: "HTTP 404: Not Found" al descargar

```javascript
// Verificar que el bucket es público
// Supabase Dashboard → Storage → videos → Settings → Public bucket: ON

// Usar getPublicUrl
const { data } = supabase.storage.from('videos').getPublicUrl(path);
```

### Error: CORS

```javascript
// Verificar que usas el Edge Function, NO directo al backend
// ✅ CORRECTO
const API_BASE = 'https://[PROJECT].supabase.co/functions/v1/storyclip-proxy';

// ❌ INCORRECTO
const API_BASE = 'https://story.creatorsflow.app/api';  // Bloquea CORS
```

### Error: Edge Function timeout

```bash
# El backend debe responder INMEDIATAMENTE con jobId
# Si hay timeout (30s), verificar:

# 1. Backend está corriendo
pm2 status

# 2. Backend es accesible
curl https://story.creatorsflow.app/api/health

# 3. Ver logs del backend
pm2 logs storyclip --lines 50
```

---

## 📈 Verificar que Todo Funciona

### Test Manual Completo

```bash
# 1. Backend Health
curl https://story.creatorsflow.app/api/health

# 2. Edge Function (desde Supabase)
curl https://[PROJECT].supabase.co/functions/v1/storyclip-proxy/health

# 3. Process Video Test
curl -X POST https://[PROJECT].supabase.co/functions/v1/storyclip-proxy/process-video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "mode": "auto",
    "clipDuration": 5,
    "maxClips": 3
  }'

# Expected response:
# {
#   "success": true,
#   "jobId": "job_xxx",
#   "status": "queued",
#   "message": "Processing started"
# }

# 4. Check Job Status
curl https://story.creatorsflow.app/api/v1/jobs/JOB_ID_FROM_ABOVE/status
```

### Test Automatizado

```bash
# Ejecutar test suite completo
cd /srv/storyclip
./test-integration.sh

# Expected output:
# ✓ Backend is online
# ✓ Config endpoint working
# ✓ Process-video endpoint responds
# ... etc
# Passed: 13
# Failed: 0
```

---

## 🚀 Desplegar a Producción

### Checklist Final

```bash
# 1. Corregir problema de reinicios PM2
# Ver: /srv/storyclip/app.js:340
# Cambiar: uploadsRepo.stopCleanup()
# Por: if (uploadsRepo.cleanup) uploadsRepo.cleanup(0)

# 2. Limpiar archivos temporales
find /srv/storyclip/tmp -name "*.mp4" -mtime +1 -delete
find /srv/storyclip/work -name "*.mp4" -mtime +1 -delete

# 3. Cambiar a modo production
pm2 delete storyclip
pm2 start ecosystem.config.js --env production
pm2 save

# 4. Setup cron job para limpieza
echo "0 2 * * * find /srv/storyclip/tmp -name '*.mp4' -mtime +1 -delete" | crontab -

# 5. Habilitar monitoreo
# Prometheus: https://story.creatorsflow.app/api/metrics
# PM2: pm2 monit

# 6. Reiniciar Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📞 Soporte

**Documentación completa:**
- `/srv/storyclip/FRONTEND_BACKEND_INTEGRATION_ANALYSIS.md` - Análisis detallado
- `/srv/storyclip/README.md` - Documentación del backend
- `https://story.creatorsflow.app/api-docs` - API docs

**Logs:**
```bash
# Backend
pm2 logs storyclip --lines 100

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Database
sqlite3 /srv/storyclip/database/storyclip.db "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;"
```

**Métricas:**
```bash
# Prometheus
curl https://story.creatorsflow.app/api/metrics

# Redis
redis-cli info stats
```

---

## ✅ Verificación Final

Después de seguir todos los pasos:

```bash
# Test completo
./test-integration.sh

# Abrir frontend
open https://story.creatorsflow.app

# Subir video de prueba pequeño (<100MB)
# Generar preset
# Iniciar procesamiento
# Verificar que se generan clips
```

Si todo funciona → **¡Listo para producción!** 🎉

---

**Última actualización**: 2025-10-27
**Versión**: 1.0
**Estado**: ✅ PRODUCTION READY (con fixes menores)
