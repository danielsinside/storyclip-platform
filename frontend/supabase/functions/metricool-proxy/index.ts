import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const BACKEND_BASE = Deno.env.get("METRICOOL_BACKEND") || "https://api.creatorsflow.app/api/metricool";
const API_KEY      = Deno.env.get("METRICOOL_API_KEY") || ""; // si tu backend lo requiere

const ALLOWED_ORIGINS = [
  "https://stories.creatorsflow.app",
  "https://creatorsflow.app",
  "http://localhost:8080",
  "http://localhost:5173",
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/preview--[a-z0-9-]+\.lovable\.app$/
];

function corsHeaders(origin: string | null) {
  let allow = "";
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return pattern === origin;
    });
    allow = isAllowed ? origin : "";
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });

  if (!origin) {
    return new Response(JSON.stringify({ error: "origin_missing" }), {
      status: 403, headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  }

  const isAllowed = ALLOWED_ORIGINS.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return pattern === origin;
  });

  if (!isAllowed) {
    console.log('❌ Origin not allowed:', origin);
    return new Response(JSON.stringify({ error: "origin_not_allowed", origin }), {
      status: 403, headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/?metricool-proxy\/?/, "");
    const headers: Record<string, string> = { ...(API_KEY ? { "X-Api-Key": API_KEY } : {}) };

    // SSE passthrough
    if (path.startsWith("stream")) {
      console.log(`Proxying SSE stream: ${BACKEND_BASE}/stream${url.search}`);
      const resp = await fetch(`${BACKEND_BASE}/stream${url.search}`, { headers });
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": resp.headers.get("content-type") || "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        }
      });
    }

    // GET status
    if (path.startsWith("status")) {
      console.log(`Proxying status: ${BACKEND_BASE}/status${url.search}`);
      const resp = await fetch(`${BACKEND_BASE}/status${url.search}`, { headers });
      const data = await resp.text();
      return new Response(data, {
        status: resp.status,
        headers: { ...corsHeaders(origin), "content-type": resp.headers.get("content-type") || "application/json" },
      });
    }

    // POST publish/stories
    if (path.startsWith("publish/stories") || path === "publish" || path === "publish/") {
      const payload = await req.json().catch(() => ({}));
      console.log(`Proxying publish: ${BACKEND_BASE}/publish/stories`);
      const resp = await fetch(`${BACKEND_BASE}/publish/stories`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.text();
      return new Response(data, {
        status: resp.status,
        headers: { ...corsHeaders(origin), "content-type": resp.headers.get("content-type") || "application/json" },
      });
    }

    // Acciones GET
    const passthroughs = ["pause", "resume", "cancel", "retry-failed"];
    for (const p of passthroughs) {
      if (path.startsWith(p)) {
        console.log(`Proxying ${p}: ${BACKEND_BASE}/${p}${url.search}`);
        const resp = await fetch(`${BACKEND_BASE}/${p}${url.search}`, { headers });
        const data = await resp.text();
        return new Response(data, {
          status: resp.status,
          headers: { ...corsHeaders(origin), "content-type": resp.headers.get("content-type") || "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "route_not_supported" }), {
      status: 404, headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  } catch (e) {
    console.error("Proxy error:", e);
    return new Response(JSON.stringify({ error: "proxy_error", detail: String(e) }), {
      status: 500, headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  }
});
