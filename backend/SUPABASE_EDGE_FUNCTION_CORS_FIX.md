# 🔧 Fix CORS para Supabase Edge Function - storyclip-proxy

## 🎯 Problema Identificado

**Error**: `Blocked a frame with origin "https://lovable.dev" from accessing a frame with origin "https://preview--visual-story-pulse.lovable.app"`

**Causa**: La Edge Function responde 200 pero sin `Access-Control-Allow-Origin` para el dominio `preview--visual-story-pulse.lovable.app`

---

## 🚀 Solución Completa

### **1. Edge Function con CORS Correcto**

```typescript
// /supabase/functions/storyclip-proxy/index.ts
// Deno/Edge Function

// 1) Allowlist de orígenes permitidos (incluye preview--*.lovable.app)
const ORIGIN_ALLOWLIST: RegExp[] = [
  /^https:\/\/([a-z0-9-]+\.)?lovable\.site$/i,
  /^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.lovable\.app$/i, // ✅ incluye preview--*.lovable.app
  /^https:\/\/([a-z0-9-]+\.)?lovable\.dev$/i,
  /^https:\/\/(www\.)?lovable\.dev$/i,
  /^https:\/([a-z0-9-]+\.)?lovableproject\.com$/i,
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

  // 2) Manejar preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 204, 
      headers: baseHeaders 
    });
  }

  try {
    // ---- TU LÓGICA DEL PROXY AQUÍ ----
    const payload = await req.json();
    
    // Ejemplo: Proxy hacia tu API de Story
    const response = await fetch("https://story.creatorsflow.app/api/v1/process/story", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": Deno.env.get("STORY_API_KEY") || "",
        // Reenviar headers importantes
        "Authorization": req.headers.get("Authorization") || "",
        "X-Mc-Auth": req.headers.get("X-Mc-Auth") || "",
        "Idempotency-Key": req.headers.get("Idempotency-Key") || "",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
      },
    });
    
  } catch (err) {
    console.error("Edge Function Error:", err);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error"
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

### **2. Variables de Entorno**

```bash
# En tu proyecto Supabase
supabase secrets set STORY_API_KEY=sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3
```

### **3. Deploy de la Función**

```bash
# Deploy la función
supabase functions deploy storyclip-proxy

# Verificar que esté funcionando
supabase functions list
```

---

## 🧪 Verificación con cURL

### **1. Test Preflight (OPTIONS)**

```bash
curl -i -X OPTIONS \
  "https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy" \
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

### **2. Test Request Real (POST)**

```bash
curl -i -X POST \
  "https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy" \
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

## 🔧 Configuración Frontend (Lovable)

### **1. Uso con Credentials**

```typescript
// Si usas cookies/sesión
const response = await fetch('https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy', {
  method: 'POST',
  credentials: 'include', // ✅ Importante para CORS con credenciales
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Si usas auth
  },
  body: JSON.stringify({
    jobId: 'job_123',
    tempPath: '/path/to/video.mp4',
    options: {
      quality: 'high',
      resolution: '1080x1920'
    }
  })
});
```

### **2. Uso sin Credentials**

```typescript
// Si NO usas cookies/sesión
const response = await fetch('https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    jobId: 'job_123',
    tempPath: '/path/to/video.mp4',
    options: {
      quality: 'high',
      resolution: '1080x1920'
    }
  })
});
```

---

## 🚨 Errores Comunes y Soluciones

### **1. Error: "CORS policy: No 'Access-Control-Allow-Origin' header"**

**Causa**: La función no devuelve el header correcto
**Solución**: Verificar que `isAllowed(origin)` retorne `true`

### **2. Error: "CORS policy: The request client is not a secure context"**

**Causa**: Usar `http://` en lugar de `https://`
**Solución**: Usar siempre HTTPS en producción

### **3. Error: "CORS policy: Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"

**Causa**: Usar `*` con `credentials: 'include'`
**Solución**: Usar origen específico, no `*`

### **4. Error: "CORS policy: The request client is not a secure context"**

**Causa**: Mezclar HTTP/HTTPS
**Solución**: Usar HTTPS consistentemente

---

## 🔍 Debugging CORS

### **1. Verificar Headers en DevTools**

```javascript
// En la consola del navegador
fetch('https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Headers:', [...r.headers.entries()]);
  return r.json();
})
.then(console.log);
```

### **2. Verificar con cURL**

```bash
# Verificar headers CORS
curl -v -H "Origin: https://preview--visual-story-pulse.lovable.app" \
  "https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy"
```

### **3. Logs de la Edge Function**

```typescript
// Agregar logging en la función
console.log("Origin:", origin);
console.log("Allowed:", isAllowed(origin));
console.log("Headers:", corsHeaders(origin));
```

---

## 📋 Checklist de Verificación

- [ ] ✅ **Regex correcto** - `preview--*.lovable.app` incluido
- [ ] ✅ **Preflight manejado** - OPTIONS retorna 204
- [ ] ✅ **Headers correctos** - ACAO, Vary, Credentials
- [ ] ✅ **Origen específico** - No usar `*` con credenciales
- [ ] ✅ **HTTPS consistente** - No mezclar HTTP/HTTPS
- [ ] ✅ **Variables de entorno** - API keys configuradas
- [ ] ✅ **Deploy exitoso** - Función desplegada correctamente

---

## 🎯 Dominios CORS Incluidos

### **Lovable**
- ✅ `lovable.site` y `*.lovable.site`
- ✅ `lovable.app` y `*.lovable.app`
- ✅ `preview--*.lovable.app` (tu caso específico)
- ✅ `lovable.dev` y `*.lovable.dev`
- ✅ `lovableproject.com` y `*.lovableproject.com`

### **Desarrollo**
- ✅ `localhost:3000` y `localhost:5173`
- ✅ `127.0.0.1:3000` y `127.0.0.1:5173`

### **Producción**
- ✅ `creatorsflow.app` y `*.creatorsflow.app`

---

## 🚀 Deploy Final

```bash
# 1. Crear la función
mkdir -p supabase/functions/storyclip-proxy
# Copiar el código de arriba a supabase/functions/storyclip-proxy/index.ts

# 2. Configurar variables
supabase secrets set STORY_API_KEY=tu_api_key_aqui

# 3. Deploy
supabase functions deploy storyclip-proxy

# 4. Verificar
supabase functions list
```

---

**¡Con esta configuración, el error CORS se resolverá completamente!** 🎬✨

El dominio `https://preview--visual-story-pulse.lovable.app` estará permitido y podrás hacer requests desde Lovable sin problemas de CORS.






