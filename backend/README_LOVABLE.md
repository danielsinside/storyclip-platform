# 🎬 Story API - Integración con Lovable

## 📋 Resumen Ejecutivo

Esta documentación proporciona una guía completa para integrar la **Story API** con aplicaciones desarrolladas en **Lovable**. La API permite subir, procesar y mejorar videos con capacidades de upscaling y filtros avanzados.

---

## 🚀 Características Principales

- ✅ **Upload de Videos** - Soporte para MP4, WebM, MOV
- ✅ **Procesamiento Avanzado** - Upscaling, filtros, ajustes de calidad
- ✅ **CORS Configurado** - Compatible con todos los dominios de Lovable
- ✅ **URLs Dinámicas** - Generación automática de URLs con extensión .mp4
- ✅ **TypeScript** - Tipado completo y documentación
- ✅ **Componentes React** - Listos para usar
- ✅ **Hooks Personalizados** - Fácil reutilización
- ✅ **Manejo de Errores** - Robusto y user-friendly

---

## 📁 Archivos de Documentación

### **1. Guía Principal**
- **📄 `LOVABLE_INTEGRATION_GUIDE.md`** - Documentación completa de la API
- **🔗 Endpoints disponibles**
- **⚙️ Configuración CORS**
- **💻 Ejemplos de uso**
- **⚠️ Manejo de errores**
- **🔧 Troubleshooting**

### **2. Ejemplos de Código**
- **📄 `LOVABLE_CODE_EXAMPLES.md`** - Ejemplos de código listos para usar
- **🎣 Hooks personalizados**
- **🧩 Componentes React**
- **📱 Página principal**
- **🔧 Configuración TypeScript**

### **3. Configuración**
- **📄 `LOVABLE_CONFIG.md`** - Configuración específica para Lovable
- **⚙️ Variables de entorno**
- **🔧 Configuración de Next.js**
- **🎨 Configuración de Tailwind**
- **📦 Dependencias**

---

## 🎯 Quick Start

### **1. Configuración Básica**
```typescript
// Configurar variables de entorno
NEXT_PUBLIC_STORY_API_URL=https://story.creatorsflow.app
NEXT_PUBLIC_STORY_API_TIMEOUT=30000
NEXT_PUBLIC_STORY_MAX_FILE_SIZE=500000000
```

### **2. Upload de Video**
```typescript
// Subir video
const formData = new FormData();
formData.append('file', videoFile);

const response = await fetch('https://story.creatorsflow.app/api/videos/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.videoUrl contiene la URL del video
```

### **3. Procesamiento**
```typescript
// Procesar video con upscaling
const processResponse = await fetch('https://story.creatorsflow.app/api/v1/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploadId: result.uploadId,
    options: {
      resolution: '1080x1920',
      quality: 'high',
      filters: [
        { type: 'upscale', params: { scale: '2x' } }
      ]
    }
  })
});
```

---

## 🌐 Dominios CORS Permitidos

La API está configurada para aceptar requests desde:

- ✅ `lovable.dev` y `*.lovable.dev`
- ✅ `lovable.app` y `*.lovable.app`
- ✅ `id-preview--*.lovable.app`
- ✅ `lovableproject.com`
- ✅ `localhost:3000` y `localhost:5173`
- ✅ `127.0.0.1:3000` y `127.0.0.1:5173`

---

## 🔗 Endpoints Principales

### **Upload de Video**
```http
POST https://story.creatorsflow.app/api/videos/upload
```

### **Upload de Preview**
```http
POST https://story.creatorsflow.app/api/upload-preview
```

### **Procesamiento**
```http
POST https://story.creatorsflow.app/api/v1/jobs
```

### **Estado del Procesamiento**
```http
GET https://story.creatorsflow.app/api/v1/jobs/{jobId}/status
```

---

## 💻 Componentes Listos para Usar

### **VideoUploader**
```typescript
import { VideoUploader } from './components/VideoUploader';

<VideoUploader
  onVideoReady={(url) => console.log('Video ready:', url)}
  onProcessingComplete={(url) => console.log('Processing complete:', url)}
/>
```

### **VideoGallery**
```typescript
import { VideoGallery } from './components/VideoGallery';

<VideoGallery />
```

### **Hook Personalizado**
```typescript
import { useVideoUpload } from './hooks/useVideoUpload';

const { uploadVideo, processVideo, uploading, processing } = useVideoUpload();
```

---

## ⚙️ Opciones de Procesamiento

### **Resoluciones**
- `720x1280` - HD Vertical
- `1080x1920` - Full HD Vertical
- `1920x1080` - Full HD Horizontal
- `3840x2160` - 4K

### **Calidades**
- `low` - Baja calidad, menor tamaño
- `medium` - Calidad media
- `high` - Alta calidad
- `ultra` - Máxima calidad

### **Filtros**
- **Upscaling** - Mejora de resolución
- **Brillo** - Ajuste de brillo
- **Contraste** - Ajuste de contraste
- **Saturación** - Ajuste de saturación

---

## 🚨 Manejo de Errores

### **Errores Comunes**
- **CORS Error** - Verificar dominio en lista blanca
- **File Too Large** - Reducir tamaño del archivo
- **Invalid Format** - Usar formatos compatibles
- **Processing Failed** - Verificar archivo de video

### **Códigos de Estado**
- **200** - Éxito
- **400** - Bad Request
- **413** - File Too Large
- **404** - Not Found
- **500** - Internal Server Error

---

## 🔧 Troubleshooting

### **Verificar CORS**
```bash
curl -H "Origin: https://tu-dominio.lovable.app" -I https://story.creatorsflow.app/outputs/uploads/archivo.mp4
```

### **Verificar Upload**
```bash
curl -X POST -F "file=@video.mp4" https://story.creatorsflow.app/api/videos/upload
```

### **Verificar Procesamiento**
```bash
curl -X GET https://story.creatorsflow.app/api/v1/jobs/job_id/status
```

---

## 📊 Métricas y Monitoreo

### **Logs del Servidor**
```bash
# Ver logs en tiempo real
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Estado del Servidor**
```http
GET https://story.creatorsflow.app/health
```

---

## 🎯 Mejores Prácticas

### **1. Optimización de Upload**
- Comprimir videos antes de subir
- Usar formatos compatibles (MP4, WebM)
- Limitar tamaño de archivo (máximo 500MB)

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

- **📄 Documentación**: Archivos en este directorio
- ** Logs**: `/var/log/nginx/access.log` y `/var/log/nginx/error.log`
- ** Estado**: `https://story.creatorsflow.app/health`

---

## 🔄 Changelog

### **v1.0.0** - 19 Oct 2025
- ✅ Configuración CORS completa para Lovable
- ✅ Endpoints de upload y procesamiento
- ✅ Soporte para upscaling y filtros
- ✅ URLs dinámicas con extensión .mp4
- ✅ Documentación completa
- ✅ Ejemplos de código listos para usar
- ✅ Componentes React modulares
- ✅ Hooks personalizados
- ✅ Configuración TypeScript

---

## 🚀 Próximos Pasos

1. **📖 Leer la documentación** - Revisar `LOVABLE_INTEGRATION_GUIDE.md`
2. **💻 Copiar ejemplos** - Usar código de `LOVABLE_CODE_EXAMPLES.md`
3. **⚙️ Configurar proyecto** - Seguir `LOVABLE_CONFIG.md`
4. **🧪 Probar integración** - Subir un video de prueba
5. **🎬 Implementar en producción** - Usar en tu aplicación de Lovable

---

**¡Listo para integrar con Lovable! 🎬✨**

---

*Documentación generada automáticamente - Story API v1.0.0*










