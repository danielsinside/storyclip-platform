// /supabase/functions/v1/storyclip-proxy/index.ts
// Deno/Edge Function

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// 1) Allowlist de orígenes permitidos (ajusta tus dominios reales)
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
    "Access-Control-Max-Age": "86400", // Cache preflight por 24 horas
    "Vary": "Origin", // Importante para proxies y caches
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const baseHeaders = corsHeaders(origin);

  // 2) Manejo de Preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: baseHeaders });
  }

  try {
    // URL de tu API de Story (ajusta si es diferente)
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
    headers.set("X-API-Key", STORY_API_KEY); // Usar la API Key del backend
    
    // Reenviar Authorization si existe
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }

    // Crear un AbortController para manejar timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

    const backendResponse = await fetch(backendUrl, {
      method: req.method,
      headers: headers,
      body: req.body, // Reenviar el body original
      signal: controller.signal, // Aplicar el timeout
    });

    clearTimeout(timeoutId); // Limpiar el timeout si la respuesta llega a tiempo

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
      statusCode = 504; // Gateway Timeout
    } else if (err.message.includes("STORY_API_KEY is not set")) {
      errorMessage = "Error de configuración: API Key no definida.";
      statusCode = 500;
    } else if (err.message.includes("Failed to fetch")) {
      errorMessage = "No se pudo conectar al servidor de Story API. Verifica la URL o el estado del servidor.";
      statusCode = 502; // Bad Gateway
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






