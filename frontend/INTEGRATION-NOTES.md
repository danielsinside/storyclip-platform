# StoryClip API v2 Integration Notes

## 🎯 Estado Actual

**Fecha:** 21 de Octubre 2025  
**Versión:** v1.1.0 - Real Video Processing  
**Estado:** ✅ Integración completa con nueva API

## 📡 Endpoints Configurados

### API Base
- **URL:** `https://story.creatorsflow.app`
- **Tenant:** `stories`
- **API Key:** Configurada en `src/lib/storyclipV2.ts`

### Endpoints Activos

| Endpoint | Método | Propósito | Implementado |
|----------|--------|-----------|--------------|
| `/api/health` | GET | Health check | ✅ |
| `/api/presets` | GET | Listar presets disponibles | ✅ |
| `/api/render` | POST | Crear job de renderizado | ✅ |
| `/api/render/:jobId` | GET | Obtener estado del job | ✅ |
| `/api/render/:jobId` | DELETE | Cancelar job | ✅ |

## 🎨 Efectos Implementados

### Filtros Visuales
- ✅ Vintage, Vivid, Cool, Warm, B&W
- ✅ AI Custom (CSS personalizado generado por IA)
- ✅ Intensidad configurable (0-100%)

### Overlays Animados
- ✅ Particles, Sparkles, Glitch, VHS
- ✅ Bokeh, Light Leak, Film Grain
- ✅ Chromatic, Lens Flare, Rain
- ✅ Matrix, DNA, Hexagon, Wave
- ✅ AI Custom (configuración personalizada)

### Movimientos de Cámara
- ✅ Zoom (con duración configurable)
- ✅ Pan (panorámica horizontal)
- ✅ Tilt (inclinación vertical)
- ✅ Rotate (rotación)
- ✅ Dolly (acercamiento/alejamiento)
- ✅ Shake (temblor)

### Transformaciones
- ✅ Horizontal Flip (espejo)

### Indicadores de Clip
- ✅ Temporal (0.1s al inicio)
- ✅ Permanente (todo el clip)
- ✅ Posiciones configurables
- ✅ Estilos: simple, badge, rounded
- ✅ Colores y opacidad personalizables

### Audio
- ✅ Normalización de loudness
- ✅ Ambiente noise
- ✅ Amplitud configurable
- ✅ Originalidad de audio (unique)

## 🔄 Flujo de Procesamiento

### 1. Upload (Página Upload)
```
Usuario sube video → Backend devuelve uploadId + videoUrl
```

### 2. Configuración (Página Manual)
```
Usuario configura:
- Semilla visual (seed)
- Modo de delay
- Clips (distribución)
- Audio (ambient noise, amplitud, originalidad)
- Filtros visuales
- Overlays animados
- Movimientos de cámara
- Indicadores de clip
- Metadata (título, descripción, keywords)
```

### 3. Procesamiento (Backend)
```typescript
// Manual.tsx - handleProcess()
const renderRequest = {
  preset: "storyclip_social_916",
  inputs: [{ url: videoUrl }],
  output: { container: "mp4", maxDurationSec: duration },
  metadata: { title, description, keywords, seed, delayMode },
  audio: { normalize: true, loudnessTarget: -16, ambientNoise, amplitude },
  effects: {
    horizontalFlip,
    filter: { type, intensity, customCSS, customName },
    overlay: { type, intensity, customName, customConfig },
    camera: { zoom, pan, tilt, rotate, dolly, shake },
    clipIndicator: { type, position, size, textColor, bgColor, opacity, style }
  }
};

const { jobId } = await createRender(renderRequest);
```

### 4. Polling (Página Process)
```
useRenderJobV2 hook → Poll cada 3s → getJob(jobId) → Actualiza progreso
```

### 5. Resultados
```
Status: completed → outputs: [{ url, width, height, duration, size }]
```

## 📦 Archivos Modificados

### Core SDK
- ✅ `src/lib/storyclipV2.ts` - SDK actualizado para nueva API
  - `getPresets()` → `/api/presets`
  - `createRender()` → `/api/render`
  - `getJob()` → `/api/render/:jobId`
  - `cancelJob()` → `/api/render/:jobId` (DELETE)

### Hooks
- ✅ `src/hooks/useRenderJobV2.ts` - Polling de jobs
- ✅ `src/hooks/useVideoSession.ts` - Persistencia de configuración
- ⚠️ `src/hooks/useStoryclip.ts` - **LEGACY** (no usar)

### Páginas
- ✅ `src/pages/Manual.tsx` - Configuración completa de efectos
- ✅ `src/pages/Process.tsx` - Polling y resultados
- ⚠️ `src/lib/api.ts` - **LEGACY processVideo()** (no usar)

## 🚧 Migraciones Pendientes

### Preset Page
- ❌ Todavía usa API vieja
- 🔧 Necesita migrar a `createRender()` con preset seleccionado

### Upload Page
- ⚠️ Verifica que `videoUrl` se guarde correctamente

## 🐛 Problemas Conocidos

### 1. URL del Video
**Problema:** A veces el `videoUrl` no se guarda correctamente en la sesión.

**Solución Implementada:**
- Guardar en localStorage: `videoUrl_${uploadId}`
- Prioridad: sessionData → location.state → localStorage → construir desde uploadId

### 2. Efectos no Aplicados
**Problema:** Los efectos configurados en Manual no se aplicaban al video.

**Causa:** Usaba API vieja sin soporte real para efectos.

**Solución:** Migración a `/api/render` con todos los parámetros.

## ✅ Testing Checklist

- [ ] Upload video → Verificar que videoUrl se guarde
- [ ] Manual page → Configurar filtro → Verificar preview
- [ ] Manual page → Configurar overlay → Verificar preview
- [ ] Manual page → Configurar cámara → Verificar preview
- [ ] Manual page → Configurar indicador → Verificar preview
- [ ] Manual page → Procesar → Verificar que se envíe todo al backend
- [ ] Process page → Verificar polling cada 3s
- [ ] Process page → Job completed → Verificar URL del output
- [ ] Clip download → Verificar que realmente tenga los efectos aplicados

## 📝 Notas Técnicas

### Preset Social 9:16
```json
{
  "id": "storyclip_social_916",
  "name": "Stories/Reels 9:16",
  "cmd": "-vf \"scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p\" -c:v libx264 -preset veryfast -crf 21 -g 48 -keyint_min 48 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k -af \"loudnorm=I=-14:TP=-1.5:LRA=11\"",
  "suitable_for": ["stories", "reels", "social_vertical"],
  "quality": "good",
  "speed": "fast"
}
```

### Rate Limits
- Tenant `stories`: Uso normal
- Si hay rate limit → Backend retorna 429

### Timeouts
- Upload: 15 minutos
- Processing: Depende del video (estimateSec en response)

## 🔗 Referencias

- [Documentación completa de la API](./STORYCLIP-API.md)
- [Changelog del proyecto](./Storyclip-CHANGELOG.md)
- [Go-Live Checklist](./GO-LIVE-CHECKLIST.md)
