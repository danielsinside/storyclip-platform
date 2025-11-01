# 🚀 SOLUCIÓN TEMPORAL - CORS RESUELTO

## ✅ **PROBLEMA IDENTIFICADO Y RESUELTO**

El error ha cambiado de:
```
❌ Origin https://preview--visual-story-pulse.lovable.app is not allowed by Access-Control-Allow-Origin
```

A:
```
✅ 404 - Route not found
```

**Esto significa que CORS está funcionando, pero la función Edge no está desplegada.**

## 🎯 **SOLUCIÓN INMEDIATA**

### **Opción 1: Desplegar manualmente en Supabase Dashboard**

1. **Ve a tu proyecto Supabase Dashboard**
2. **Navega a Edge Functions**
3. **Crea una nueva función llamada `storyclip-proxy`**
4. **Copia y pega este código**:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// 1) Allowlist de orígenes permitidos
const ORIGIN_ALLOWLIST: RegExp[] = [
  /^https:\/\/([a-z0-9-]+\.)?lovable\.site$/i,
  /^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.lovable\.app$/i, // cubre preview--*.lovable.app
  /^https:\/\/([a-z0-9-]+\.)?lovable\.dev$/i,
  /^https:\/\/(www\.)?lovable\.dev$/i,
  /^https?:\/\/localhost:(3000|5173)$/i,
  /^https?:\/\/127\.0\.0\.1:(3000|5173)$/i,
  /^https:\/\/([a-z0-9-]+\.)?creatorsflow\.app$/i,
];

function isAllowed(origin?: string | null) {
  if (!origin) return false;
  return ORIGIN_ALLOWLIST.some((rx) => rx.test(origin));
}

function corsHeaders(origin: string | null) {
  const allowed = isAllowed(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, X-Mc-Auth, Idempotency-Key, X-Flow-Id, Accept, Range",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const baseHeaders = corsHeaders(origin);

  // Manejo de Preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: baseHeaders });
  }

  try {
    // URL de tu API de Story
    const STORY_API_URL = Deno.env.get("STORY_API_URL") || "https://story.creatorsflow.app/api";
    const STORY_API_KEY = Deno.env.get("STORY_API_KEY");

    if (!STORY_API_KEY) {
      throw new Error("STORY_API_KEY is not set in Supabase secrets.");
    }

    // Construir la URL del backend
    const url = new URL(req.url);
    const backendPath = url.pathname.replace("/functions/v1/storyclip-proxy", "");
    const backendUrl = `${STORY_API_URL}${backendPath}${url.search}`;

    // Reenviar headers importantes
    const headers = new Headers();
    headers.set("Content-Type", req.headers.get("Content-Type") || "application/json");
    headers.set("X-API-Key", STORY_API_KEY);
    
    // Reenviar Authorization si existe
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }

    // Crear un AbortController para manejar timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const backendResponse = await fetch(backendUrl, {
      method: req.method,
      headers: headers,
      body: req.body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Reenviar la respuesta del backend al cliente
    const responseHeaders = {
      ...baseHeaders,
      "Content-Type": backendResponse.headers.get("Content-Type") || "application/json",
    };

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Error in Edge Function:", err.message);
    let errorMessage = "Error interno del servidor.";
    let statusCode = 500;

    if (err.name === "AbortError") {
      errorMessage = "La solicitud al servidor de Story API excedió el tiempo límite (30s).";
      statusCode = 504;
    } else if (err.message.includes("STORY_API_KEY is not set")) {
      errorMessage = "Error de configuración: API Key no definida.";
      statusCode = 500;
    } else if (err.message.includes("Failed to fetch")) {
      errorMessage = "No se pudo conectar al servidor de Story API.";
      statusCode = 502;
    }

    return new Response(JSON.stringify({ error: errorMessage, details: err.message }), {
      status: statusCode,
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
```

5. **Configura las variables de entorno**:
   - `STORY_API_KEY`: Tu API key del Story API
   - `STORY_API_URL`: `https://story.creatorsflow.app/api` (opcional)

### **Opción 2: Usar el Story API directamente (SIN PROXY)**

Si prefieres evitar el proxy, puedes configurar CORS directamente en tu servidor Story API.

## 🎯 **RESULTADO ESPERADO**

Después del despliegue:
- ✅ **404 resuelto** - la función estará disponible
- ✅ **CORS funcionando** - sin errores de origen
- ✅ **Proxy funcional** - requests llegarán al Story API
- ✅ **Videos accesibles** desde Lovable

## 🔍 **VERIFICACIÓN**

1. **Prueba la función**:
   ```bash
   curl -X POST https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy/v1/process/story \
        -H "Content-Type: application/json" \
        -H "Origin: https://preview--visual-story-pulse.lovable.app" \
        -d '{"test": true}'
   ```

2. **Revisa los logs** en Supabase Dashboard

3. **Prueba desde Lovable** - los errores deberían desaparecer

---

**🎉 ¡Con esta solución, tu app de Lovable funcionará perfectamente!**






