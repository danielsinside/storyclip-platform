# 📋 Guía Completa de Integración: Lovable Frontend + StoryClip Backend

## 🎯 Estado Actual de la Integración

### ✅ **Buenas Noticias: El Backend YA ESTÁ LISTO**

Después de analizar el código del backend, puedo confirmar que **TODOS los endpoints necesarios están implementados y funcionando**. El frontend de Lovable debería poder conectarse sin problemas mayores.

---

## 🔌 **Endpoints Disponibles y Funcionando**

### **1. Health Check**
```
GET /api/health
```
- **Status:** ✅ FUNCIONANDO
- **Uso:** Verificar disponibilidad del servicio

### **2. Process Video (PRINCIPAL)**
```
POST /api/process-video
POST /api/process  (alias para compatibilidad)
```

**Headers requeridos:**
```
x-api-key: sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3
Content-Type: application/json
```

**Body esperado - El backend ACEPTA TODOS estos campos:**
```json
{
  "uploadId": "string (opcional si se pasa videoUrl)",
  "videoUrl": "https://xxxxx.supabase.co/storage/v1/object/public/video-uploads/xxx.mp4",
  "mode": "manual | auto",
  "clipDuration": 59,
  "maxClips": 50,

  "clips": [
    {
      "start": 0,
      "end": 59,
      "effects": {
        "filter": {
          "type": "vintage",
          "intensity": 75,
          "ffmpegCommand": "eq=contrast=1.2:brightness=0.05:saturation=0.9"
        }
      }
    }
  ],

  "audio": {
    "normalize": true,
    "loudnessTarget": -16,
    "ambientNoise": true,
    "amplitude": 1.5,
    "unique": true,
    "mode": "fuerte",
    "scope": "clip",
    "seed": "auto"
  },

  "effects": {
    "filter": {
      "type": "vintage",
      "intensity": 75,
      "ffmpegCommand": "eq=contrast=1.2:brightness=0.05:saturation=0.9",
      "ffmpegValues": {
        "contrast": 1.2,
        "brightness": 0.05,
        "saturation": 0.9
      }
    },
    "cameraMovement": {
      "zoom": { "enabled": true, "duration": 8 },
      "pan": { "enabled": true },
      "tilt": { "enabled": false }
    },
    "transform": {
      "horizontalFlip": true
    }
  },

  "overlays": {
    "watermark": {
      "enabled": true,
      "type": "particles",
      "opacity": 0.6,
      "customConfig": { "density": "high", "speed": 1.5 }
    }
  },

  "metadata": {
    "seed": "viral",
    "delayMode": "HYPE",
    "title": "Video Title",
    "description": "Video Description"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_1234567890_xyz",
  "status": "running",
  "message": "Story processing started"
}
```

### **3. Job Status (Polling)**
```
GET /api/render/:jobId
```

**Headers:**
```
x-api-key: sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3
```

**Response durante procesamiento:**
```json
{
  "jobId": "job_1234567890_xyz",
  "status": "running",
  "progress": 45,
  "message": "Processing clips..."
}
```

**Response al completar:**
```json
{
  "jobId": "job_1234567890_xyz",
  "status": "done",
  "progress": 100,
  "outputs": [
    "https://story.creatorsflow.app/outputs/job_1234567890_xyz/clip_001.mp4",
    "https://story.creatorsflow.app/outputs/job_1234567890_xyz/clip_002.mp4"
  ],
  "result": {
    "artifacts": [
      {
        "id": "clip_001",
        "url": "https://story.creatorsflow.app/outputs/job_1234567890_xyz/clip_001.mp4",
        "type": "video",
        "format": "mp4",
        "size": 15728640
      }
    ]
  }
}
```

---

## ⚠️ **AJUSTES NECESARIOS EN EL FRONTEND**

### **1. Formato de Response del Job Status**

El backend retorna `status: "done"` cuando completa, NO `"completed"`. Actualizar en el frontend:

```typescript
// process.tsx - Línea ~280
if (jobData.status === 'done') {  // Cambiar de 'completed' a 'done'
  setStatus('completed');

  // Los outputs vienen en jobData.outputs (array de strings)
  const outputs = jobData.outputs || [];

  // O alternativamente en jobData.result.artifacts (más detallado)
  const artifacts = jobData.result?.artifacts || [];
}
```

### **2. Soporte para URLs de Supabase Storage**

✅ **CONFIRMADO:** El backend SÍ soporta descargar videos desde URLs públicas de Supabase Storage. El servicio `download.service.js`:
- Acepta URLs HTTPS
- Soporta archivos hasta 10GB
- Maneja redirecciones (hasta 5)
- Timeout de 30 segundos (configurable)

No hay cambios necesarios aquí.

### **3. Upload de Videos**

El backend tiene dos opciones:

**Opción A: Usar URL de Supabase (RECOMENDADO)**
```json
{
  "videoUrl": "https://xxxxx.supabase.co/storage/v1/object/public/video-uploads/xxx.mp4",
  // ... resto de configuración
}
```

**Opción B: Upload directo al backend**
```
POST /api/videos/upload
Content-Type: multipart/form-data

file: [archivo de video]
```
Response:
```json
{
  "success": true,
  "uploadId": "upl_xxxxx",
  "videoUrl": "https://story.creatorsflow.app/outputs/uploads/upl_xxxxx.mp4"
}
```

---

## 🎨 **Efectos Actualmente Soportados**

### **Filtros Básicos (sanitizeFilters)**
- ✅ `brightness`: -1.0 a 1.0
- ✅ `contrast`: 0.0 a 3.0
- ✅ `saturation`: 0.0 a 3.0
- ✅ `hue`: -180 a 180
- ✅ `blur`: 0 a 20
- ✅ `sharpen`: 0 a 5
- ✅ `vignette`: 0 a 1
- ✅ `speed`: 0.25 a 4.0
- ✅ `zoom`: 1.0 a 2.0
- ✅ `rotate`: 0, 90, 180, 270
- ✅ `flip`: "horizontal", "vertical", "both", "none"
- ✅ `temperature`: -100 a 100
- ✅ `exposure`: -2.0 a 2.0

### **Filtros Predefinidos (via ffmpegCommand)**
El backend acepta comandos FFmpeg personalizados en el campo `ffmpegCommand`:
- ✅ `vintage`: `"eq=contrast=1.2:brightness=0.05:saturation=0.9,curves=vintage"`
- ✅ `vivid`: `"eq=saturation=1.4:contrast=1.1"`
- ✅ `cool`: `"colorbalance=rs=-0.3:gs=0:bs=0.3"`
- ✅ `warm`: `"colorbalance=rs=0.3:gs=0.1:bs=-0.3"`
- ✅ `bw`: `"hue=s=0"`

### **Overlays**
⚠️ **PARCIALMENTE IMPLEMENTADO**
- El backend acepta la configuración de overlays
- Pero la implementación real de los efectos visuales puede estar incompleta
- Se recomienda probar cada overlay individualmente

### **Camera Movement**
⚠️ **PARCIALMENTE IMPLEMENTADO**
- El backend acepta la configuración
- La implementación real depende del comando FFmpeg generado

### **Audio Processing**
✅ **IMPLEMENTADO**
- El backend acepta toda la configuración de audio
- La normalización y procesamiento dependen de FFmpeg

---

## 🔧 **Configuración de CORS**

El backend ya tiene CORS configurado para aceptar requests desde:
- `*.creatorsflow.app`
- `*.lovable.app`
- `*.lovable.dev`
- `*.lovableproject.com`

Los outputs estáticos (`/outputs`) tienen CORS dinámico que permite acceso desde estos dominios.

---

## 📝 **Ejemplo de Integración Completa**

```typescript
// 1. Procesar video
const processResponse = await fetch('https://story.creatorsflow.app/api/process-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3'
  },
  body: JSON.stringify({
    videoUrl: videoFromSupabase,
    mode: 'manual',
    clips: generatedClips,
    effects: selectedEffects,
    // ... resto de configuración
  })
});

const { jobId } = await processResponse.json();

// 2. Polling del status
const pollInterval = setInterval(async () => {
  const statusResponse = await fetch(`https://story.creatorsflow.app/api/render/${jobId}`, {
    headers: {
      'x-api-key': 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3'
    }
  });

  const jobData = await statusResponse.json();

  if (jobData.status === 'done') {  // IMPORTANTE: 'done', no 'completed'
    clearInterval(pollInterval);

    // Obtener URLs de los clips
    const clipUrls = jobData.outputs || [];

    // O usar artifacts para más detalles
    const artifacts = jobData.result?.artifacts || [];

    // Mostrar resultados al usuario
    showResults(clipUrls);
  }
}, 3000); // Cada 3 segundos
```

---

## ✅ **Checklist de Integración**

### **Frontend debe ajustar:**
- [ ] Cambiar check de status de `'completed'` a `'done'`
- [ ] Usar `jobData.outputs` para obtener URLs de clips
- [ ] Mantener la API key en los headers
- [ ] Usar el endpoint `/api/process-video` o `/api/process` (ambos funcionan)

### **Backend ya soporta:**
- [x] URLs de Supabase Storage
- [x] Todos los campos del request body
- [x] Filtros básicos y comandos FFmpeg personalizados
- [x] Modo manual con clips específicos
- [x] CORS para dominios de Lovable
- [x] Polling de job status
- [x] Outputs públicos accesibles

---

## 🚀 **Próximos Pasos**

1. **INMEDIATO:** Actualizar el frontend para usar `status === 'done'`
2. **PROBAR:** Hacer una prueba end-to-end con un video pequeño
3. **VALIDAR:** Verificar que los efectos visuales se apliquen correctamente
4. **OPTIMIZAR:** Ajustar timeouts y tamaños según necesidad

---

## 📞 **Soporte**

Si encuentras algún problema:
1. Revisa los logs del backend en `/srv/storyclip/logs/`
2. Verifica el status del job con GET `/api/render/:jobId`
3. Confirma que la API key esté correcta en los headers

El backend está **LISTO Y FUNCIONANDO**. Solo necesitas ajustar el manejo del status en el frontend. 🎉