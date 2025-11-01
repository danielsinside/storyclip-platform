# StoryClips - Arquitectura del Sistema

## 🏗️ Arquitectura General

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│                                         │
│  ┌──────────┐  ┌──────────┐           │
│  │  Upload  │→│  Preset  │            │
│  └──────────┘  └─────┬────┘            │
│                      │                  │
│                      ▼                  │
│  ┌──────────┐  ┌──────────┐           │
│  │  Manual  │  │ Process  │            │
│  └─────┬────┘  └─────┬────┘            │
│        │             │                  │
│        └──────┬──────┘                  │
│               ▼                         │
│         ┌──────────┐                    │
│         │ Publish  │                    │
│         └──────────┘                    │
└─────────────────────────────────────────┘
       │              │
       │              │
       ▼              ▼
┌──────────────┐  ┌─────────────────────┐
│ CreatorsFlow │  │  Lovable Cloud      │
│   Stories    │  │  (Supabase)         │
│   Backend    │  │                     │
│   (V2 API)   │  │  • Edge Functions   │
│              │  │  • Database         │
│              │  │  • Authentication   │
└──────────────┘  └─────────────────────┘
```

## 📡 API Endpoints

### CreatorsFlow Stories V2 API

**Base URL:** `https://api.creatorsflow.app`

#### Autenticación
Todas las llamadas requieren el header:
```
X-Api-Key: sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3
```

#### Endpoints Principales

1. **Crear Render Job**
   ```
   POST /api/t/stories/render
   ```
   Body:
   ```json
   {
     "preset": "storyclip_social_916",
     "inputs": [
       {
         "fileId": "upl_xxx",
         "start": 0,
         "end": 60
       }
     ],
     "overlays": {
       "vs": {
         "enabled": true,
         "style": "center_glow",
         "label": "VS"
       }
     },
     "output": {
       "container": "mp4",
       "maxDurationSec": 60
     },
     "metadata": {
       "seed": "viral",
       "delayMode": "HYPE"
     }
   }
   ```
   Response:
   ```json
   {
     "jobId": "job_xxx",
     "status": "queued",
     "estimateSec": 120
   }
   ```

2. **Consultar Estado del Job**
   ```
   GET /api/t/stories/jobs/{jobId}
   ```
   Response (processing):
   ```json
   {
     "jobId": "job_xxx",
     "status": "processing",
     "progress": {
       "pct": 45,
       "stage": "Rendering video",
       "fps": 30,
       "etaSec": 60
     }
   }
   ```
   Response (completed):
   ```json
   {
     "jobId": "job_xxx",
     "status": "completed",
     "outputs": [
       {
         "kind": "video",
         "url": "https://storyclip.creatorsflow.app/outputs/job_xxx/clip_001.mp4",
         "width": 1080,
         "height": 1920,
         "duration": 15,
         "size": 2048576
       }
     ],
     "vmaf": 95.5
   }
   ```

3. **Obtener Presets**
   ```
   GET /api/t/stories/presets
   ```
   Response:
   ```json
   [
     {
       "id": "storyclip_social_916",
       "name": "Social Stories",
       "desc": "Optimizado para Instagram/Facebook Stories"
     }
   ]
   ```

4. **Obtener Capacidades**
   ```
   GET /api/t/stories/capabilities
   ```

### Lovable Cloud Edge Functions

**Base URL:** `{VITE_SUPABASE_URL}/functions/v1`

1. **Generar Preset con IA**
   ```
   POST /generate-preset
   ```
   Body:
   ```json
   {
     "uploadId": "upl_xxx",
     "filename": "video.mp4",
     "filesize": 293623029,
     "duration": 115
   }
   ```

2. **Publicar a Metricool**
   ```
   POST /metricool-publish
   ```

3. **Obtener Brands de Metricool**
   ```
   GET /metricool-brands
   ```

## 🔄 Flujo de Usuario

### 1. Upload (/)
1. Usuario selecciona video
2. Frontend:
   - Valida tipo y tamaño del archivo
   - Extrae duración del video
   - Sube a CreatorsFlow (legacy upload endpoint)
3. Navega a `/preset/{uploadId}` con metadata

### 2. Preset (/preset/:presetId)
1. Frontend llama `generate-preset` Edge Function
2. IA genera configuración optimizada:
   - Clips sugeridos
   - Metadata (título, descripción, keywords)
   - Audio settings
3. Usuario puede:
   - **Aceptar**: Procede directo a procesamiento
   - **Personalizar**: Va a `/manual/{uploadId}`
   - **Regenerar**: Pide nueva sugerencia a la IA

### 3. Manual (/manual/:uploadId)
1. Editor completo de configuración:
   - **Distribución de clips**: Manual o automática
   - **Metadata**: Título, descripción, keywords
   - **Audio**: Ruido ambiental, amplitud, originalidad
   - **Filtros visuales**: Vintage, vivid, cool, etc.
   - **Overlays**: Particles, sparkles, glitch, etc.
   - **Transformaciones**: Flip, zoom, pan, etc.
   - **Indicadores**: Marcadores de clip
2. Guarda sesión en Supabase DB
3. Al finalizar, envía a procesamiento

### 4. Process (/process/:jobId)
1. Crea job en CreatorsFlow V2 API
2. Polling cada 2.5s para obtener estado
3. Muestra:
   - Barra de progreso
   - Logs de generación
   - Detección de trabajos estancados
4. Al completar, muestra clips generados
5. Usuario puede:
   - **Publicar**: Va a `/publish/{jobId}`
   - **Volver a configurar**: Regresa a `/manual/{uploadId}`

### 5. Publish (/publish/:jobId)
1. Usuario selecciona:
   - Brand/perfil de Metricool
   - Estrategia de publicación (batch/agent)
2. Asigna metadata a cada clip
3. Publica vía Edge Function `metricool-publish`
4. Monitorea estado de publicación en tiempo real

## 🗄️ Base de Datos (Supabase)

### Tablas

#### `video_sessions`
Almacena configuración de edición manual.

```sql
CREATE TABLE video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id TEXT NOT NULL,
  user_id UUID,
  filename TEXT,
  filesize BIGINT,
  duration INTEGER,
  video_url TEXT,
  
  -- Configuración
  seed TEXT DEFAULT 'natural',
  delay_mode TEXT DEFAULT 'NATURAL',
  manual_clips JSONB DEFAULT '[{"start":0,"end":59}]',
  
  -- Metadata
  title TEXT,
  description TEXT,
  keywords TEXT,
  
  -- Audio
  ambient_noise BOOLEAN DEFAULT false,
  amplitude NUMERIC DEFAULT 1.0,
  audio_unique BOOLEAN DEFAULT false,
  audio_mode TEXT DEFAULT 'medio',
  audio_scope TEXT DEFAULT 'clip',
  audio_seed TEXT DEFAULT 'auto',
  
  -- Visual
  filter_type TEXT DEFAULT 'none',
  filter_intensity NUMERIC DEFAULT 50,
  overlay_type TEXT DEFAULT 'none',
  overlay_intensity NUMERIC DEFAULT 50,
  horizontal_flip BOOLEAN DEFAULT false,
  
  -- Camera
  camera_zoom BOOLEAN DEFAULT false,
  camera_pan BOOLEAN DEFAULT false,
  camera_tilt BOOLEAN DEFAULT false,
  
  -- Indicators
  clip_indicator TEXT DEFAULT 'none',
  indicator_position TEXT DEFAULT 'top-right',
  
  -- Status
  status TEXT DEFAULT 'configuring',
  job_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `creator_profiles`
Perfiles de creadores con configuración de Metricool.

```sql
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  
  -- Metricool
  metricool_brand_id TEXT,
  
  -- Configuración
  seed seed_type NOT NULL DEFAULT 'natural',
  delay_mode delay_mode NOT NULL DEFAULT 'NATURAL',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  safe_hours_start TIME NOT NULL DEFAULT '09:00:00',
  safe_hours_end TIME NOT NULL DEFAULT '21:00:00',
  
  -- Settings
  allow_flip BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 🔐 Autenticación

- Usa Supabase Auth
- Email/Password signup
- Auto-confirm habilitado para desarrollo
- RLS policies protegen datos por `user_id`

## 📦 Estructura del Código

```
src/
├── components/         # Componentes React
│   ├── ui/            # Componentes UI (shadcn)
│   ├── Header.tsx
│   ├── ClipsList.tsx
│   ├── PresetCard.tsx
│   └── AgentPublishModal.tsx
│
├── hooks/             # Custom hooks
│   ├── useStoryclip.ts      # SDK legacy + V2
│   ├── useRenderJobV2.ts    # Polling V2 API
│   ├── useVideoSession.ts   # Sesiones DB
│   └── useJobPolling.ts     # Polling legacy
│
├── lib/               # Utilidades y SDKs
│   ├── api.ts              # API wrapper
│   ├── storyclipV2.ts      # SDK V2 CreatorsFlow
│   ├── storyclipClient.ts  # SDK legacy
│   └── utils.ts
│
├── pages/             # Páginas principales
│   ├── Upload.tsx
│   ├── Preset.tsx
│   ├── Manual.tsx
│   ├── Process.tsx
│   ├── Publish.tsx
│   ├── Profiles.tsx
│   └── Auth.tsx
│
└── types/             # TypeScript types
    └── index.ts
```

## 🚀 Mejoras Implementadas

### ✅ V2 API Integration
- SDK actualizado para usar API directa de CreatorsFlow
- Headers `X-Api-Key` en todas las peticiones
- Endpoints `/api/t/stories/*` en lugar de proxy

### ✅ Flujo Optimizado
- Upload → Preset IA → Manual (opcional) → Process → Publish
- Polling inteligente con detección de trabajos estancados
- Auto-guardado de sesiones en DB

### ✅ Mejor UX
- Animaciones de carga con IA
- Feedback visual en cada paso
- Logs detallados de procesamiento
- Manejo de errores robusto

## 🔧 Próximos Pasos

1. **Testing**
   - Probar flujo completo end-to-end
   - Verificar manejo de errores
   - Validar polling y timeouts

2. **Optimizaciones**
   - Cache de resultados
   - Retry logic mejorado
   - Compression de videos

3. **Features**
   - Preview de clips antes de publicar
   - Edición de clips individuales
   - Analytics de publicaciones
