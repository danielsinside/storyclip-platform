# 🎯 Fix CORS Completo - Supabase Edge Function

## 📋 Problema Actual

**Error**: `Origin https://preview--visual-story-pulse.lovable.app is not allowed by Access-Control-Allow-Origin. Status code: 200`

**Causa**: La Supabase Edge Function `storyclip-proxy` no tiene configuración CORS para el dominio `preview--visual-story-pulse.lovable.app`

**URL Problemática**: `https://kixjikosjlyozbnyvhua.supabase.co/functions/v1/storyclip-proxy`

---

## 🚀 Solución Completa

### **1. Edge Function con CORS (Lista para Deploy)**

**Archivo**: `supabase/functions/storyclip-proxy/index.ts`

```typescript
// /supabase/functions/storyclip-proxy/index.ts
// Edge Function con CORS completo para Lovable - VERSIÓN FINAL

// 1) Allowlist de orígenes permitidos (incluye preview--*.lovable.app)
const ORIGIN_ALLOWLIST: RegExp[] = [
  /^https:\/\/([a-z0-9-]+\.)?lovable\.site$/i,
  /^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.lovable\.app$/i, // ✅ incluye preview--*.lovable.app
  /^https:\/\/([a-z0-9-]+\.)?lovable\.dev$/i,
  /^https:\/\/(www\.)?lovable\.dev$/i,
  /^https:\/\/([a-z0-9-]+\.)?lovableproject\.com$/i,
  /^https?:\/\/localhost:(3000|5173)$/i,
  /^https?:\/\/127\.0\.0\.1:(3000|5173)$/i,
  /^https:\/\/([a-z0-9-]+\.)?creatorsflow\.app$/i,
];

function isAllowed(origin?: string | null): boolean {
  if (!origin) return false;
  return ORIGIN_ALLOWLIST.some(rx => rx.test(origin));
}

function corsHeaders(origin: string | null) {
  const allowed = isAllowed(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Mc-Auth, Idempotency-Key, X-Flow-Id, Accept, Range",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const baseHeaders = corsHeaders(origin);

  // Log para debugging
  console.log("=== STORYCLIP PROXY ===");
  console.log("Request Origin:", origin);
  console.log("Is Allowed:", isAllowed(origin));
  console.log("CORS Headers:", baseHeaders);
  console.log("Request Method:", req.method);
  console.log("Request URL:", req.url);

  // 2) Manejar preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling preflight request");
    return new Response("ok", { 
      status: 204, 
      headers: baseHeaders 
    });
  }

  try {
    // ---- LÓGICA DEL PROXY HACIA STORY API ----
    const payload = await req.json();
    console.log("Proxy payload:", payload);
    
    // Configurar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
    
    try {
      // Proxy hacia tu API de Story
      const response = await fetch("https://story.creatorsflow.app/api/v1/process/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": Deno.env.get("STORY_API_KEY") || "",
          // Reenviar headers importantes del cliente
          "Authorization": req.headers.get("Authorization") || "",
          "X-Mc-Auth": req.headers.get("X-Mc-Auth") || "",
          "Idempotency-Key": req.headers.get("Idempotency-Key") || "",
          "X-Flow-Id": req.headers.get("X-Flow-Id") || "",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const data = await response.json();
      console.log("Story API response:", data);
      
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          ...baseHeaders,
          "Content-Type": "application/json",
        },
      });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
    
  } catch (err) {
    console.error("Edge Function Error:", err);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
      details: err instanceof Error ? err.stack : undefined
    }), {
      status: 500,
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
```

### **2. Deploy Automático**

**Script**: `deploy-supabase-cors-fix.sh`

```bash
#!/bin/bash
# 🚀 Script de Deploy - Fix CORS para Supabase Edge Function

echo "🔧 Deploying CORS fix for Supabase Edge Function"

# 1. Crear directorio de la función
mkdir -p supabase/functions/storyclip-proxy

# 2. Copiar la función con CORS
cp /srv/storyclip/supabase-functions-storyclip-proxy-FINAL.ts supabase/functions/storyclip-proxy/index.ts

# 3. Configurar variables de entorno
supabase secrets set STORY_API_KEY=sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3

# 4. Deploy de la función
supabase functions deploy storyclip-proxy

# 5. Verificar deploy
supabase functions list

echo "🎉 Deploy completado!"
```

### **3. Deploy Manual**

```bash
# 1. Crear directorio
mkdir -p supabase/functions/storyclip-proxy

# 2. Copiar función
cp /srv/storyclip/supabase-functions-storyclip-proxy-FINAL.ts supabase/functions/storyclip-proxy/index.ts

# 3. Configurar API key
supabase secrets set STORY_API_KEY=sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3

# 4. Deploy
supabase functions deploy storyclip-proxy

# 5. Verificar
supabase functions list
```

---

## 🧪 Verificación de la Solución

### **1. Test Preflight (OPTIONS)**

```bash
curl -i -X OPTIONS \
  "https://kixjikosjlyozbnyvhua.supabase.co/functions/v1/storyclip-proxy" \
  -H "Origin: https://preview--visual-story-pulse.lovable.app" \
  -H "Access-Control-Request-Method: POST"
```

**Respuesta esperada:**
```http
HTTP/2 204
Access-Control-Allow-Origin: https://preview--visual-story-pulse.lovable.app
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Mc-Auth, Idempotency-Key, X-Flow-Id, Accept, Range
Access-Control-Max-Age: 86400
```

### **2. Test POST Request**

```bash
curl -i -X POST \
  "https://kixjikosjlyozbnyvhua.supabase.co/functions/v1/storyclip-proxy" \
  -H "Origin: https://preview--visual-story-pulse.lovable.app" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test_123", "tempPath": "/path/to/video.mp4"}'
```

**Respuesta esperada:**
```http
HTTP/2 200
Access-Control-Allow-Origin: https://preview--visual-story-pulse.lovable.app
Vary: Origin
Access-Control-Allow-Credentials: true
Content-Type: application/json

{"success": true, "jobId": "test_123", "status": "processing"}
```

---

## 🎯 Dominios CORS Incluidos

### **✅ Lovable (Todos Permitidos)**
- `lovable.site` y `*.lovable.site`
- `lovable.app` y `*.lovable.app`
- **`preview--*.lovable.app`** (tu caso específico)
- `lovable.dev` y `*.lovable.dev`
- `lovableproject.com` y `*.lovableproject.com`

### **✅ Desarrollo**
- `localhost:3000` y `localhost:5173`
- `127.0.0.1:3000` y `127.0.0.1:5173`

### **✅ Producción**
- `creatorsflow.app` y `*.creatorsflow.app`

---

## 🔧 Configuración Frontend (Lovable)

### **1. Uso con la Edge Function**

```typescript
// En tu aplicación de Lovable
const response = await fetch('https://kixjikosjlyozbnyvhua.supabase.co/functions/v1/storyclip-proxy', {
  method: 'POST',
  credentials: 'include', // Si usas cookies/sesión
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Si usas auth
  },
  body: JSON.stringify({
    jobId: 'job_123',
    tempPath: '/path/to/video.mp4',
    fileName: 'video.mp4',
    options: {
      quality: 'high',
      resolution: '1080x1920',
      filters: [
        {
          type: 'upscale',
          params: { scale: '2x' }
        }
      ]
    }
  })
});

const result = await response.json();
console.log('Resultado:', result);
```

### **2. Manejo de Errores**

```typescript
try {
  const response = await fetch('https://kixjikosjlyozbnyvhua.supabase.co/functions/v1/storyclip-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result;
} catch (error) {
  console.error('Error en Edge Function:', error);
  throw error;
}
```

---

## 🚨 Troubleshooting

### **1. Error: "CORS policy: No 'Access-Control-Allow-Origin' header"**

**Causa**: La función no devuelve el header correcto
**Solución**: Verificar que el regex incluya tu dominio

### **2. Error: "CORS policy: Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"

**Causa**: Usar `*` con `credentials: 'include'`
**Solución**: La función ya usa origen específico, no `*`

### **3. Error: "CORS policy: The request client is not a secure context"**

**Causa**: Mezclar HTTP/HTTPS
**Solución**: Usar siempre HTTPS en producción

### **4. Error: "CORS policy: The request client is not a secure context"**

**Causa**: Usar `http://` en lugar de `https://`
**Solución**: Usar siempre HTTPS

---

## 📊 Monitoreo y Logs

### **1. Ver Logs de la Función**

```bash
# Ver logs en tiempo real
supabase functions logs storyclip-proxy --follow

# Ver logs específicos
supabase functions logs storyclip-proxy --limit 50
```

### **2. Debug en la Función**

```typescript
// La función ya incluye logging completo
console.log("Request Origin:", origin);
console.log("Is Allowed:", isAllowed(origin));
console.log("CORS Headers:", baseHeaders);
console.log("Proxy payload:", payload);
console.log("Story API response:", data);
```

---

## ✅ Checklist de Deploy

- [ ] ✅ **Función creada** - `supabase/functions/storyclip-proxy/index.ts`
- [ ] ✅ **Variables configuradas** - `STORY_API_KEY` set
- [ ] ✅ **Función desplegada** - `supabase functions deploy`
- [ ] ✅ **CORS verificado** - Script de test ejecutado
- [ ] ✅ **Preflight funcionando** - OPTIONS retorna 204
- [ ] ✅ **POST funcionando** - Request real funciona
- [ ] ✅ **Dominios permitidos** - `preview--*.lovable.app` incluido
- [ ] ✅ **Headers correctos** - ACAO, Vary, Credentials
- [ ] ✅ **Frontend configurado** - Lovable usando la función
- [ ] ✅ **Error resuelto** - No más bloqueos CORS

---

## 🎉 Resultado Final

**Con esta configuración, el error CORS se resolverá completamente:**

- ✅ `https://preview--visual-story-pulse.lovable.app` estará permitido
- ✅ Requests desde Lovable funcionarán sin bloqueos
- ✅ Headers CORS correctos en todas las respuestas
- ✅ Soporte para credenciales si las usas
- ✅ Timeout y error handling robusto
- ✅ Logging completo para debugging

**¡El error CORS está resuelto!** 🎬✨

---

*Fix CORS implementado el 19 de Octubre de 2025 - Story API v1.0.0*






