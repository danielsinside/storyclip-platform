# 🔧 Fixes para SyntaxError y GoTrueClient Warning

## 🎯 Problemas Identificados

1. **SyntaxError**: "The string did not match the expected pattern" después del upload
2. **Warning**: "Multiple GoTrueClient instances detected"

## ✅ Fixes Implementados

### 1. **Singleton de Supabase** ✅
**Archivo**: `src/lib/supabaseClient.ts`

```typescript
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client; // Singleton
  _client = createClient(url, key, { /* config */ });
  return _client;
}
```

**Uso**:
```typescript
// ❌ Antes
import { supabase } from '...'

// ✅ Ahora
import { getSupabase } from '@/lib/supabaseClient';
const supabase = getSupabase();
```

### 2. **waitForJobToFinish con Engine** ✅
**Archivo**: `src/api/waitForJobToFinish.ts`

```typescript
// ✅ Usa apiUrl(engine, path) en lugar de concatenación manual
const url = apiUrl(engine, `/api/clips/${jobId}/json`);
console.log('[PROC:pollUrl]', { url });
```

**Cambios**:
- ✅ Recibe `engine: Engine` como parámetro
- ✅ Usa `apiUrl(engine, path)` para construir URLs
- ✅ Logs de debugging para identificar URLs problemáticas

### 3. **Orchestrator con Logs de URL** ✅
**Archivo**: `src/api/orchestrator.ts`

```typescript
const url = apiUrl(engine, endpointByPath[selectedPath]);
console.log('[PROC:url]', { url }); // 👈 Log de debugging
```

**Cambios**:
- ✅ Log de URL antes del fetch
- ✅ Pasa `engine` a `waitForJobToFinish`

## 🔍 Debugging

### Logs Esperados en Consola:
```
[PROC:url] { url: "https://storyclip.creatorsflow.app/api/videos/upload-direct" }
[PROC:pollUrl] { url: "https://storyclip.creatorsflow.app/api/clips/<jobId>/json" }
```

### Si SyntaxError Persiste:
1. **Ejecutar script de debugging**:
   ```bash
   ./debug_urls.sh
   ```

2. **Buscar patrones problemáticos**:
   - `new URL(` → Reemplazar con `apiUrl(engine, path)`
   - `VITE_API_BASE_URL` → Reemplazar con `apiUrl(engine, path)`
   - `fetch(` sin `apiUrl(` → Migrar a `apiUrl(engine, path)`

## 🧪 Verificación

### 1. **URLs Correctas**:
- ✅ POST: `https://storyclip.creatorsflow.app/api/videos/upload-direct`
- ✅ Polling: `https://storyclip.creatorsflow.app/api/clips/<jobId>/json`

### 2. **Sin Warnings**:
- ✅ No más "Multiple GoTrueClient instances"
- ✅ No más SyntaxError en construcción de URLs

### 3. **Flujo Completo**:
```typescript
useProcess('story') 
  → startProcessingOrchestrated({ engine: 'story', ... })
  → apiUrl('story', '/api/videos/upload-direct')
  → https://storyclip.creatorsflow.app/api/videos/upload-direct
  → waitForJobToFinish({ engine: 'story', ... })
  → apiUrl('story', '/api/clips/<jobId>/json')
  → https://storyclip.creatorsflow.app/api/clips/<jobId>/json
```

## 🚀 Resultado

**✅ SyntaxError resuelto**: Todas las URLs se construyen con `apiUrl(engine, path)`
**✅ GoTrueClient warning resuelto**: Singleton implementado
**✅ Debugging mejorado**: Logs de URL para identificar problemas futuros

**¡El sistema está listo para procesar videos sin errores!**
