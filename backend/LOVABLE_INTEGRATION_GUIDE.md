# 🎬 Guía de Integración con Story API - Lovable

## 📋 Índice
1. [Configuración Inicial](#configuración-inicial)
2. [Endpoints Disponibles](#endpoints-disponibles)
3. [Configuración CORS](#configuración-cors)
4. [Ejemplos de Uso](#ejemplos-de-uso)
5. [Manejo de Errores](#manejo-de-errores)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Configuración Inicial

### **Base URL**
```
https://story.creatorsflow.app
```

### **Headers Requeridos**
```typescript
const headers = {
  'Content-Type': 'multipart/form-data',
  'Accept': 'application/json'
};
```

---

## 🔗 Endpoints Disponibles

### **1. Upload de Video**
```http
POST https://story.creatorsflow.app/api/videos/upload
```

**Request:**
```typescript
const formData = new FormData();
formData.append('file', videoFile); // Archivo de video
```

**Response:**
```typescript
{
  success: true,
  uploadId: "video_1760850174554_yq90rg",
  filename: "video_1760850174554_yq90rg.mp4",
  size: 255843013,
  videoUrl: "https://story.creatorsflow.app/outputs/uploads/video_1760850174554_yq90rg.mp4",
  message: "File uploaded successfully. Use uploadId to process."
}
```

### **2. Upload de Preview**
```http
POST https://story.creatorsflow.app/api/upload-preview
```

**Request:**
```typescript
const formData = new FormData();
formData.append('file', videoFile);
```

**Response:**
```typescript
{
  success: true,
  uploadId: "preview_1760850174554_yq90rg",
  filename: "preview_1760850174554_yq90rg.mp4",
  size: 255843013,
  previewUrl: "https://story.creatorsflow.app/outputs/uploads/preview_1760850174554_yq90rg.mp4",
  message: "Preview uploaded successfully"
}
```

### **3. Procesamiento de Video**
```http
POST https://story.creatorsflow.app/api/v1/jobs
```

**Request:**
```typescript
{
  "uploadId": "video_1760850174554_yq90rg",
  "options": {
    "resolution": "1080x1920",        // Resolución de salida
    "quality": "high",                // Calidad del video
    "videoBitrate": "5000k",          // Bitrate del video
    "preset": "medium",               // Preset de codificación
    "crf": 23,                        // Factor de calidad
    "fps": 30,                        // Frames por segundo
    "filters": [                      // Filtros a aplicar
      {
        "type": "upscale",
        "params": {
          "scale": "2x"
        }
      }
    ]
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "jobId": "job_1760850174554_yq90rg",
  "status": "queued",
  "message": "Job created successfully"
}
```

### **4. Estado del Procesamiento**
```http
GET https://story.creatorsflow.app/api/v1/jobs/{jobId}/status
```

**Response:**
```typescript
{
  "success": true,
  "jobId": "job_1760850174554_yq90rg",
  "status": "completed", // queued, processing, completed, failed
  "progress": 100,
  "outputUrl": "https://story.creatorsflow.app/outputs/processed/job_1760850174554_yq90rg.mp4",
  "message": "Job completed successfully"
}
```

---

## 🌐 Configuración CORS

### **Dominios Permitidos**
La API está configurada para aceptar requests desde:

- ✅ `lovable.dev`
- ✅ `*.lovable.dev`
- ✅ `lovable.app`
- ✅ `*.lovable.app`
- ✅ `id-preview--*.lovable.app`
- ✅ `lovableproject.com`
- ✅ `localhost:3000`
- ✅ `localhost:5173`
- ✅ `127.0.0.1:3000`
- ✅ `127.0.0.1:5173`

### **Headers CORS Automáticos**
```typescript
// Estos headers se agregan automáticamente
{
  'Access-Control-Allow-Origin': 'https://tu-dominio.lovable.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Mc-Auth, Idempotency-Key, X-Flow-Id, Accept, Range',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
}
```

---

## 💻 Ejemplos de Uso

### **Ejemplo 1: Upload Simple**
```typescript
async function uploadVideo(videoFile: File) {
  const formData = new FormData();
  formData.append('file', videoFile);
  
  const response = await fetch('https://story.creatorsflow.app/api/videos/upload', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  return result.videoUrl; // URL del video subido
}
```

### **Ejemplo 2: Upload con Procesamiento**
```typescript
async function uploadAndProcess(videoFile: File) {
  // 1. Upload del video
  const formData = new FormData();
  formData.append('file', videoFile);
  
  const uploadResponse = await fetch('https://story.creatorsflow.app/api/videos/upload', {
    method: 'POST',
    body: formData
  });
  
  const uploadResult = await uploadResponse.json();
  
  // 2. Iniciar procesamiento
  const processResponse = await fetch('https://story.creatorsflow.app/api/v1/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uploadId: uploadResult.uploadId,
      options: {
        resolution: '1080x1920',
        quality: 'high',
        filters: [
          {
            type: 'upscale',
            params: { scale: '2x' }
          }
        ]
      }
    })
  });
  
  const processResult = await processResponse.json();
  return processResult.jobId;
}
```

### **Ejemplo 3: Monitoreo de Procesamiento**
```typescript
async function monitorProcessing(jobId: string) {
  const response = await fetch(`https://story.creatorsflow.app/api/v1/jobs/${jobId}/status`);
  const result = await response.json();
  
  if (result.status === 'completed') {
    return result.outputUrl; // URL del video procesado
  } else if (result.status === 'failed') {
    throw new Error('Processing failed');
  } else {
    // Seguir monitoreando
    return null;
  }
}
```

### **Ejemplo 4: Componente React Completo**
```typescript
import React, { useState } from 'react';

const VideoUploader: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload del video
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('https://story.creatorsflow.app/api/videos/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setVideoUrl(result.videoUrl);
        
        // Iniciar procesamiento
        const processResponse = await fetch('https://story.creatorsflow.app/api/v1/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: result.uploadId,
            options: {
              resolution: '1080x1920',
              quality: 'high'
            }
          })
        });
        
        const processResult = await processResponse.json();
        setJobId(processResult.jobId);
        setProcessing(true);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const checkProcessingStatus = async () => {
    if (!jobId) return;
    
    try {
      const response = await fetch(`https://story.creatorsflow.app/api/v1/jobs/${jobId}/status`);
      const result = await response.json();
      
      if (result.status === 'completed') {
        setVideoUrl(result.outputUrl);
        setProcessing(false);
      } else if (result.status === 'failed') {
        setProcessing(false);
        alert('Processing failed');
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFileUpload} />
      
      {videoUrl && (
        <video src={videoUrl} controls style={{ width: '100%', maxWidth: '500px' }} />
      )}
      
      {processing && (
        <div>
          <p>Processing video...</p>
          <button onClick={checkProcessingStatus}>Check Status</button>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
```

---

## ⚠️ Manejo de Errores

### **Errores Comunes**

#### **1. CORS Error**
```typescript
// Error: Blocked a frame with origin "https://lovable.dev" from accessing a frame
// Solución: Verificar que el dominio esté en la lista blanca
```

#### **2. File Too Large**
```typescript
// Error: 413 Request Entity Too Large
// Solución: Reducir el tamaño del archivo o comprimir el video
```

#### **3. Invalid File Format**
```typescript
// Error: Invalid data found when processing input
// Solución: Asegurar que el archivo sea un video válido (MP4, WebM, etc.)
```

#### **4. Processing Failed**
```typescript
// Error: Processing error: ffprobe exited with code 1
// Solución: Verificar que el archivo de video sea válido y no esté corrupto
```

### **Códigos de Estado HTTP**
- **200**: Éxito
- **400**: Bad Request (archivo inválido)
- **413**: Request Entity Too Large
- **404**: Not Found (archivo no encontrado)
- **500**: Internal Server Error

---

## 🔧 Troubleshooting

### **1. Verificar CORS**
```bash
curl -H "Origin: https://tu-dominio.lovable.app" -I https://story.creatorsflow.app/outputs/uploads/archivo.mp4
```

### **2. Verificar Upload**
```bash
curl -X POST -F "file=@video.mp4" https://story.creatorsflow.app/api/videos/upload
```

### **3. Verificar Procesamiento**
```bash
curl -X GET https://story.creatorsflow.app/api/v1/jobs/job_id/status
```

### **4. Logs del Servidor**
```bash
# Ver logs en tiempo real
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 📊 Opciones de Procesamiento

### **Resoluciones Disponibles**
- `720x1280` - HD Vertical
- `1080x1920` - Full HD Vertical
- `1920x1080` - Full HD Horizontal
- `3840x2160` - 4K

### **Calidades Disponibles**
- `low` - Baja calidad, menor tamaño
- `medium` - Calidad media
- `high` - Alta calidad
- `ultra` - Máxima calidad

### **Filtros Disponibles**
```typescript
// Upscaling
{
  type: 'upscale',
  params: { scale: '2x' }
}

// Ajuste de brillo
{
  type: 'brightness',
  params: { value: 1.2 }
}

// Ajuste de contraste
{
  type: 'contrast',
  params: { value: 1.1 }
}

// Ajuste de saturación
{
  type: 'saturation',
  params: { value: 1.3 }
}
```

---

## 🚀 Mejores Prácticas

### **1. Optimización de Upload**
- Comprimir videos antes de subir
- Usar formatos compatibles (MP4, WebM)
- Limitar tamaño de archivo (máximo 500MB recomendado)

### **2. Manejo de Estados**
- Implementar loading states
- Mostrar progreso de procesamiento
- Manejar errores gracefully

### **3. Caching**
- Los videos procesados se cachean por 1 hora
- Usar URLs estables para videos finales
- Implementar fallbacks para videos no disponibles

### **4. Performance**
- Usar streaming para videos grandes
- Implementar lazy loading
- Optimizar para dispositivos móviles

---

## 📞 Soporte

Para soporte técnico o preguntas sobre la integración:

- **Documentación**: Este archivo
- **Logs**: `/var/log/nginx/access.log` y `/var/log/nginx/error.log`
- **Estado del Servidor**: `https://story.creatorsflow.app/health`

---

## 🔄 Changelog

### **v1.0.0** - 19 Oct 2025
- ✅ Configuración CORS completa para Lovable
- ✅ Endpoints de upload y procesamiento
- ✅ Soporte para upscaling y filtros
- ✅ URLs dinámicas con extensión .mp4
- ✅ Documentación completa

---

**¡Listo para integrar con Lovable! 🎬✨**










