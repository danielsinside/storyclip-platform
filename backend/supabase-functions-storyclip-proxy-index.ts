// /supabase/functions/storyclip-proxy/index.ts
// Edge Function con CORS completo para Lovable

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

  // Log para debugging
  console.log("Request Origin:", origin);
  console.log("Is Allowed:", isAllowed(origin));
  console.log("CORS Headers:", baseHeaders);

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






