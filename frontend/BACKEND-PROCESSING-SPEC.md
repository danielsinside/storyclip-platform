# Especificación Backend - Sistema de Procesamiento de Video

## 1. Modelo de Datos Principal: VideoSession

El backend debe leer de la tabla `video_sessions` usando el `upload_id`. Todos los campos son configurables desde el frontend.

### 1.1 Información Básica del Video
```typescript
{
  upload_id: string;        // ID único del video subido
  filename: string;         // Nombre del archivo original
  filesize: number;         // Tamaño en bytes
  duration: number;         // Duración total en segundos
  video_url: string;        // URL del video original
  user_id: string;          // ID del usuario (opcional)
  status: string;           // Estado: 'configuring' | 'processing' | 'completed'
  job_id?: string;          // ID del job de procesamiento
}
```

### 1.2 Configuración de Seeds y Modos
```typescript
{
  seed: 'natural' | 'viral' | 'cinematica' | 'humor' | 'impacto' | 'no_flip_texto' | 'mirror_safe' | 'creator_id';
  delay_mode: 'HYPE' | 'FAST' | 'NATURAL' | 'PRO';
}
```

**Importante**: Estos valores determinan el estilo de edición del video procesado.

### 1.3 Metadatos para Publicación
```typescript
{
  title?: string;           // Título del clip
  description?: string;     // Descripción
  keywords?: string;        // Keywords separados por comas
}
```

---

## 2. Sistema de Audio

### 2.1 Configuración de Audio
```typescript
{
  ambient_noise: boolean;        // Si debe agregar ruido ambiente
  amplitude: number;             // Amplitud del audio (0.1 - 2.0)
  cut_start: number;            // Inicio del corte en segundos
  cut_end: number;              // Fin del corte en segundos
  audio_unique: boolean;         // Audio único por clip
  audio_mode: 'bajo' | 'medio' | 'alto' | 'extremo';
  audio_scope: 'clip' | 'job';   // Aplicar por clip o por job
  audio_seed?: string;           // Seed específico para audio
}
```

### 2.2 Lógica de Procesamiento de Audio
1. **Si `audio_unique = true`**: Generar perfil de audio único para cada clip
2. **Si `audio_scope = 'clip'`**: Aplicar configuración por cada clip individual
3. **Si `audio_scope = 'job'`**: Aplicar misma configuración a todos los clips del job
4. **`audio_mode`** determina la intensidad:
   - `bajo`: procesamiento suave
   - `medio`: procesamiento estándar
   - `alto`: procesamiento agresivo
   - `extremo`: procesamiento máximo

**Edge Function requerida**: `generate-audio-profile` (ya existe)

---

## 3. Sistema de Clips

### 3.1 Configuración de Clips Manuales
```typescript
{
  manual_clips: Array<{
    start: number;    // Tiempo de inicio en segundos
    end: number;      // Tiempo de fin en segundos
  }>;
}
```

### 3.2 Lógica de Generación de Clips
1. Leer el array `manual_clips` de la sesión
2. Para cada clip:
   - Extraer del video original desde `start` hasta `end`
   - Aplicar todas las configuraciones de audio, filtros, overlays, cámara
   - Aplicar el seed correspondiente
3. Generar exactamente N clips (donde N = longitud de `manual_clips`)

---

## 4. Sistema de Indicadores de Clip

### 4.1 Configuración de Indicadores
```typescript
{
  clip_indicator: 'none' | 'numero' | 'contador' | 'progress' | 'custom';
  indicator_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  indicator_size: number;              // Porcentaje 0-100
  indicator_text_color: string;        // Color hex (#ffffff)
  indicator_bg_color: string;          // Color hex (#000000)
  indicator_opacity: number;           // 0.0 - 1.0
  indicator_style: 'badge' | 'minimal' | 'bold';
}
```

### 4.2 Tipos de Indicadores
- **none**: Sin indicador
- **numero**: Muestra "1/50", "2/50", etc.
- **contador**: Solo número del clip actual
- **progress**: Barra de progreso
- **custom**: Generado por IA

**Edge Function requerida**: `generate-clip-indicator` (ya existe)

---

## 5. Sistema de Filtros Visuales

### 5.1 Configuración de Filtros
```typescript
{
  filter_type: 'none' | 'sepia' | 'grayscale' | 'vintage' | 'vibrant' | 'dark' | 'custom';
  filter_intensity: number;         // 0-100 porcentaje
  custom_filter_css?: string;       // CSS personalizado (si filter_type='custom')
  custom_filter_name?: string;      // Nombre del filtro custom
}
```

### 5.2 Aplicación de Filtros
1. **Si `filter_type = 'custom'`**:
   - Usar `custom_filter_css` directamente
   - O generar con IA usando `generate-filter` edge function
2. **Si tipo predefinido**:
   - Aplicar filtro CSS correspondiente con intensidad de `filter_intensity`
3. **Intensidad**:
   - 0 = sin filtro
   - 50 = intensidad media
   - 100 = filtro completo

**Edge Function requerida**: `generate-filter` (ya existe)

---

## 6. Sistema de Overlays

### 6.1 Configuración de Overlays
```typescript
{
  overlay_type: 'none' | 'particles' | 'gradient' | 'vignette' | 'custom';
  overlay_intensity: number;              // 0-100 porcentaje
  custom_overlay_name?: string;           // Nombre del overlay custom
  custom_overlay_config?: {               // Configuración JSON del overlay
    type: string;
    properties: Record<string, any>;
  };
}
```

### 6.2 Tipos de Overlays
- **particles**: Partículas flotantes
- **gradient**: Degradados de color
- **vignette**: Viñeta oscura en bordes
- **custom**: Generado por IA o configuración manual

**Edge Function requerida**: `generate-overlay` (ya existe)

---

## 7. Sistema de Transformaciones

### 7.1 Configuración de Transformaciones
```typescript
{
  horizontal_flip: boolean;    // Voltear horizontalmente (espejo)
}
```

### 7.2 Aplicación
Si `horizontal_flip = true`, aplicar transformación CSS `scaleX(-1)` o equivalente en video processing.

---

## 8. Sistema de Movimientos de Cámara

### 8.1 Configuración de Cámara
```typescript
{
  camera_zoom: boolean;              // Activar zoom
  camera_zoom_duration: number;      // Duración del zoom en segundos (default: 8.0)
  camera_pan: boolean;               // Paneo horizontal
  camera_tilt: boolean;              // Inclinación vertical
  camera_rotate: boolean;            // Rotación
  camera_dolly: boolean;             // Movimiento dolly (acercamiento/alejamiento)
  camera_shake: boolean;             // Efecto de vibración
}
```

### 8.2 Lógica de Movimientos
1. **Zoom**: 
   - Si activado, aplicar zoom gradual durante `camera_zoom_duration` segundos
   - Puede ser zoom in o zoom out
2. **Pan**: Movimiento horizontal suave
3. **Tilt**: Movimiento vertical suave
4. **Rotate**: Rotación sutil del frame
5. **Dolly**: Simular movimiento de cámara hacia adelante/atrás
6. **Shake**: Vibración rápida para efecto dinámico

**Edge Function requerida**: `generate-camera-movement` (ya existe)

---

## 9. Flujo de Procesamiento Completo

### 9.1 Secuencia de Procesamiento
```
1. Recibir uploadId + mode='manual'
2. Leer VideoSession desde database
3. Validar que status != 'completed'
4. Para cada clip en manual_clips:
   a. Extraer segmento del video (start -> end)
   b. Aplicar audio (amplitude, ambient_noise, cut, audio_mode)
   c. Aplicar filtro visual (filter_type + intensity)
   d. Aplicar overlay (overlay_type + intensity)
   e. Aplicar transformaciones (horizontal_flip)
   f. Aplicar movimientos de cámara (zoom, pan, tilt, rotate, dolly, shake)
   g. Generar indicador de clip (clip_indicator)
   h. Aplicar seed y delay_mode
   i. Renderizar clip final
5. Guardar clips procesados con URLs
6. Actualizar status='completed' y job_id
7. Retornar lista de clips generados
```

### 9.2 Endpoint Backend Requerido
```
POST /api/story/manual/process
Body: {
  uploadId: string;
  mode: 'manual';
}

Proceso:
1. Lee video_sessions WHERE upload_id = uploadId
2. Obtiene TODA la configuración
3. Genera los clips según manual_clips[]
4. Aplica todas las configuraciones
5. Retorna { jobId: string }
```

---

## 10. Sistema de Estados SSE (Tiempo Real)

### 10.1 Stream de Procesamiento
```
Endpoint: /realtime/jobs/:jobId

Eventos emitidos:
- start: Inicio del procesamiento
- processing: Progreso de cada clip (con progress %)
- complete: Procesamiento completado
- done: Listo para publicar
```

### 10.2 Ejemplo de Eventos
```json
{"type":"start","message":"Starting StoryClips generation..."}
{"type":"processing","message":"Processing clip 1/3","progress":33}
{"type":"processing","message":"Processing clip 2/3","progress":66}
{"type":"processing","message":"Processing clip 3/3","progress":100}
{"type":"complete","message":"All clips generated successfully"}
{"type":"done","message":"Ready to publish"}
```

---

## 11. Modelo de Respuesta de Clips

### 11.1 Estructura de Clip Generado
```typescript
interface StoryClip {
  clipIndex: number;           // Índice del clip (0-based)
  title: string;               // Título del clip
  description?: string;        // Descripción opcional
  duration: number;            // Duración en segundos
  seed: string;                // Seed usado
  url: string;                 // URL del clip procesado
}
```

### 11.2 Endpoint de Lista de Clips
```
GET /api/storyclips/:jobId/list

Response: {
  items: StoryClip[];
}
```

---

## 12. Validaciones Requeridas

### 12.1 Validaciones Pre-Procesamiento
- `manual_clips` debe tener al menos 1 clip
- Cada clip debe tener `start < end`
- `end` no debe exceder `duration` del video
- `filter_intensity` debe estar entre 0-100
- `overlay_intensity` debe estar entre 0-100
- `amplitude` debe estar entre 0.1-2.0
- `indicator_opacity` debe estar entre 0.0-1.0

### 12.2 Validaciones Durante Procesamiento
- Video source debe ser accesible en `video_url`
- Cada configuración debe tener valores válidos
- Edge functions deben responder correctamente

---

## 13. Edge Functions Requeridas

| Función | Propósito | Input | Output |
|---------|-----------|-------|--------|
| `generate-audio-profile` | Generar perfil de audio | audioMode, audioScope, seed | Audio config JSON |
| `generate-filter` | Generar filtro CSS | filterType, intensity | CSS filter string |
| `generate-overlay` | Generar overlay | overlayType, intensity | Overlay config |
| `generate-clip-indicator` | Generar indicador | indicatorType, position, style | Indicator SVG/HTML |
| `generate-camera-movement` | Generar movimientos | cameraConfig | Movement keyframes |

---

## 14. Ejemplo Completo de Sesión

```json
{
  "upload_id": "upl_001",
  "filename": "video.mp4",
  "filesize": 15728640,
  "duration": 60,
  "video_url": "https://example.com/video.mp4",
  "seed": "cinematica",
  "delay_mode": "PRO",
  "title": "Mi Video Épico",
  "description": "Descripción del video",
  "keywords": "viral,cinematica,pro",
  
  "ambient_noise": true,
  "amplitude": 1.2,
  "cut_start": 0,
  "cut_end": 59,
  "audio_unique": false,
  "audio_mode": "alto",
  "audio_scope": "job",
  "audio_seed": "auto",
  
  "clip_indicator": "numero",
  "indicator_position": "top-right",
  "indicator_size": 75,
  "indicator_text_color": "#ffffff",
  "indicator_bg_color": "#000000",
  "indicator_opacity": 0.7,
  "indicator_style": "badge",
  
  "filter_type": "vintage",
  "filter_intensity": 50,
  "custom_filter_css": null,
  "custom_filter_name": null,
  
  "overlay_type": "vignette",
  "overlay_intensity": 30,
  "custom_overlay_name": null,
  "custom_overlay_config": null,
  
  "horizontal_flip": false,
  
  "camera_zoom": true,
  "camera_zoom_duration": 8.0,
  "camera_pan": false,
  "camera_tilt": false,
  "camera_rotate": false,
  "camera_dolly": false,
  "camera_shake": false,
  
  "manual_clips": [
    { "start": 0, "end": 15 },
    { "start": 15, "end": 30 },
    { "start": 30, "end": 45 }
  ],
  
  "status": "processing",
  "job_id": null
}
```

---

## 15. Checklist de Implementación Backend

- [ ] Leer configuración completa de `video_sessions` por `upload_id`
- [ ] Procesar array de `manual_clips` correctamente
- [ ] Aplicar configuración de audio (amplitude, ambient_noise, mode, scope)
- [ ] Aplicar filtros visuales (type, intensity, custom CSS)
- [ ] Aplicar overlays (type, intensity, custom config)
- [ ] Aplicar transformaciones (horizontal_flip)
- [ ] Aplicar movimientos de cámara (zoom, pan, tilt, rotate, dolly, shake)
- [ ] Generar indicadores de clip (type, position, style, colors)
- [ ] Aplicar seed y delay_mode correctamente
- [ ] Emitir eventos SSE de progreso
- [ ] Guardar clips procesados con URLs
- [ ] Actualizar status y job_id en la sesión
- [ ] Manejar errores y reintentos
