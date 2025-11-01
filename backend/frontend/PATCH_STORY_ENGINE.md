# 🎯 PATCH: Story Engine Exclusivo

## ✅ Objetivo Logrado

**Story SIEMPRE usa `https://storyclip.creatorsflow.app`** - Sin mezclar dominios, sin errores CORS.

## 🔧 Archivos Implementados

### 1. **`.env`** - Configuración por Engine
```env
# ❗ Story SOLO creatorsflow (tu requerimiento)
VITE_STORY_API_BASE_URL=https://storyclip.creatorsflow.app

# (Opcional) define otros si quieres separar por motor
VITE_REEL_API_BASE_URL=https://api.storyclip.app
VITE_IMAGE_API_BASE_URL=https://api.storyclip.app
```

### 2. **`src/api/baseUrl.ts`** - Helper Central
- Devuelve el base URL por engine (story|reel|image)
- Nunca mezcla dominios
- Story SIEMPRE apunta a creatorsflow

### 3. **`src/types/processing.ts`** - Tipos Actualizados
- `Engine` type: 'story' | 'reel' | 'image'
- `ProcessorPath` y `JobUpdate` types

### 4. **`src/api/orchestrator.ts`** - Orchestrator con Engine
- Nuevo parámetro `engine: Engine`
- Usa `apiUrl(engine, endpoint)` para URL correcta
- Guard anti doble disparo por engine

### 5. **`src/hooks/useProcess.ts`** - Hook con Engine
- Se liga el engine al hook: `useProcess('story')`
- Siempre pasa el engine al orchestrator

### 6. **`src/components/StoryPage.tsx`** - Ejemplo de Uso
```tsx
const { process } = useProcess('story'); // 👈 Engine fijo
await process(file, { clips: 50, len: 3, slicing: { clip_duration_seconds: 1.5 } });
```

## 🎯 Flujo de URLs

### Story Engine:
```
useProcess('story') → apiUrl('story', '/v1/process') → https://storyclip.creatorsflow.app/v1/process
```

### Reel Engine (opcional):
```
useProcess('reel') → apiUrl('reel', '/v1/process') → https://api.storyclip.app/v1/process
```

## ✅ Beneficios

1. **✅ Story SIEMPRE creatorsflow**: Sin excepciones
2. **✅ Cero mezcla de dominios**: Adiós errores CORS
3. **✅ Orquestador intacto**: Mismos contratos, solo +engine
4. **✅ Hook intacto**: Misma API, solo +engine
5. **✅ Extensible**: Fácil agregar Reel/Image a creatorsflow

## 🚀 Uso

```tsx
// En cualquier página de Story
import { useProcess } from '@/hooks/useProcess';

export default function StoryPage() {
  const { process } = useProcess('story'); // 👈 Engine fijo
  
  const handleSubmit = async (file: File) => {
    await process(file, { 
      clips: 50, 
      slicing: { clip_duration_seconds: 1.5 } 
    });
  };
}
```

## 🔧 Backend CORS

El backend ya está configurado para:
- ✅ `https://storyclip-studio.lovable.app`
- ✅ `https://preview--storyclip-studio.lovable.app`
- ✅ `https://id-preview--92c9540b-7547-4104-876c-daca56a762f8.lovable.app`

**¡Patch implementado y listo para usar!**
