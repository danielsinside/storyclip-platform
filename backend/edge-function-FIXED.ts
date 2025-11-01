// Supabase Edge Function: StoryClip proxy (tenant=stories)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const BACKEND_BASE = Deno.env.get("STORYCLIP_BACKEND") || "https://story.creatorsflow.app";
const API_KEY       = Deno.env.get("STORYCLIP_API_KEY")!;
const TENANT        = Deno.env.get("STORYCLIP_TENANT") || "stories";

// Permite SOLO tus orígenes
const ALLOWED_ORIGINS = [
  "https://stories.creatorsflow.app",
  "https://creatorsflow.app",
  "http://localhost:8080",
  "http://localhost:5173",
  // Lovable development and preview domains
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+-preview--[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/preview--[a-z0-9-]+\.lovable\.app$/
];

function corsHeaders(origin: string | null) {
  let allow = "";
  if (origin) {
    // Check if origin is in the allowed list (including regex patterns)
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
    "Access-Control-Allow-Headers": "content-type,x-sc-action,authorization,apikey,x-client-info",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  // Protección básica de CORS
  if (!origin) {
    return new Response(JSON.stringify({ error: "origin_missing" }), {
      status: 403,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
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
    console.log('📋 Allowed patterns:', ALLOWED_ORIGINS);
    return new Response(JSON.stringify({ error: "origin_not_allowed", origin }), {
      status: 403,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  }

  try {
    console.log('📥 Request received:', {
      method: req.method,
      origin,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Enrutado simple por path y/o header x-sc-action
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/?/, "");
    const action = req.headers.get("x-sc-action") || url.searchParams.get("action");

    console.log('🎯 Action detected:', action);

    let upstream = "";
    let method = req.method;
    let body: BodyInit | undefined = undefined;
    const headers: Record<string, string> = {
      "X-Api-Key": API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    // 0. Health Check (NEW - FIX para 404)
    if ((action || "").toLowerCase() === "health" || (req.method === "GET" && url.pathname.includes("/health"))) {
      console.log('🏥 Health check request');

      upstream = `${BACKEND_BASE}/api/health`;
      method = "GET";
      delete headers["Content-Type"];

      console.log('🌐 Fetching health status:', upstream);
    }
    // 1. Render API (NEW v2)
    else if ((action || "").toLowerCase() === "render-create" || (req.method === "POST" && url.pathname.includes("/render"))) {
      const payload = await req.json().catch(() => ({}));
      console.log('📦 Creating render job:', payload);
      
      upstream = `${BACKEND_BASE}/api/render`;
      method = "POST";
      body = JSON.stringify(payload);
      
      console.log('🎬 Creating render via API v2:', upstream);
    }
    // 2. Render status (NEW v2)
    else if ((action || "").toLowerCase() === "render-status" || (req.method === "GET" && url.pathname.match(/\/render\/[^\/]+$/))) {
      const jobIdMatch = url.pathname.match(/\/render\/([^\/]+)$/);
      const jobId = jobIdMatch ? jobIdMatch[1] : "";
      
      console.log('🔍 Render status request for ID:', jobId);
      
      if (!jobId) {
        console.error('❌ Missing job ID');
        return new Response(JSON.stringify({ error: "missing_job_id" }), {
          status: 400,
          headers: { "content-type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      upstream = `${BACKEND_BASE}/api/render/${jobId}`;
      method = "GET";
      delete headers["Content-Type"];
      
      console.log('🌐 Fetching render status:', upstream);
    }
    // 3. Render cancel (NEW v2)
    else if ((action || "").toLowerCase() === "render-cancel" || (req.method === "DELETE" && url.pathname.match(/\/render\/[^\/]+$/))) {
      const jobIdMatch = url.pathname.match(/\/render\/([^\/]+)$/);
      const jobId = jobIdMatch ? jobIdMatch[1] : "";
      
      console.log('🗑️ Render cancel request for ID:', jobId);
      
      if (!jobId) {
        console.error('❌ Missing job ID');
        return new Response(JSON.stringify({ error: "missing_job_id" }), {
          status: 400,
          headers: { "content-type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      upstream = `${BACKEND_BASE}/api/render/${jobId}`;
      method = "DELETE";
      delete headers["Content-Type"];
      
      console.log('🗑️ Canceling render:', upstream);
    }
    // 4. Direct process-video (RECOMMENDED) - Try multiple endpoints as fallback
    else if ((action || "").toLowerCase() === "process-video" || (req.method === "POST" && url.pathname.includes("/process-video"))) {
      const payload = await req.json().catch(() => ({}));
      console.log('📦 Direct process-video:', payload);
      
      // Try primary endpoint first, then fallback
      upstream = `${BACKEND_BASE}/api/process-video`;
      method = "POST";
      body = JSON.stringify(payload);
      
      console.log('🎬 Processing via direct API:', upstream);
      console.log('💡 Note: Will try /api/process as fallback if this fails');
    }
    // Fallback: Try /api/process (alias)
    else if ((action || "").toLowerCase() === "process" && !(url.pathname.includes("/stories/"))) {
      const payload = await req.json().catch(() => ({}));
      console.log('📦 Fallback to /api/process:', payload);
      
      upstream = `${BACKEND_BASE}/api/process`;
      method = "POST";
      body = JSON.stringify(payload);
      
      console.log('🎬 Processing via alias API:', upstream);
    }
    // 2. Crear story (LEGACY)
    else if ((action || "").toLowerCase() === "create-story" || (req.method === "POST" && url.pathname.includes("/stories/create"))) {
      const payload = await req.json().catch(() => ({}));
      console.log('📦 Creating story:', payload);
      
      upstream = `${BACKEND_BASE}/api/stories`;
      method = "POST";
      body = JSON.stringify(payload);
      
      console.log('🎬 Creating story via API:', upstream);
    }
    // 3. Iniciar procesamiento (LEGACY)
    else if ((action || "").toLowerCase() === "process" || url.pathname.includes("/stories/") && url.pathname.includes("/process")) {
      const payload = await req.json().catch(() => ({}));
      const storyIdMatch = url.pathname.match(/\/stories\/([^\/]+)\/process/);
      const storyId = storyIdMatch ? storyIdMatch[1] : "";
      
      console.log('📦 Processing story:', storyId, payload);
      
      upstream = `${BACKEND_BASE}/api/stories/${storyId}/process`;
      method = "POST";
      body = JSON.stringify(payload);
      
      console.log('🎬 Starting process via API:', upstream);
    }
    // 3. Verificar estado
    else if ((action || "").toLowerCase() === "story-status" || url.pathname.includes("/stories/") && url.pathname.includes("/status")) {
      const storyIdMatch = url.pathname.match(/\/stories\/([^\/]+)\/status/);
      const storyId = storyIdMatch ? storyIdMatch[1] : url.searchParams.get("id") || "";
      
      console.log('🔍 Story status request for ID:', storyId);
      
      if (!storyId) {
        console.error('❌ Missing story ID');
        return new Response(JSON.stringify({ error: "missing_story_id" }), {
          status: 400,
          headers: { "content-type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      upstream = `${BACKEND_BASE}/api/stories/${storyId}/status`;
      method = "GET";
      delete headers["Content-Type"];
      
      console.log('🌐 Fetching story status:', upstream);
    }
    // Legacy: Presets
    else if ((action || "").toLowerCase() === "presets" || (req.method === "GET" && url.pathname.endsWith("/presets"))) {
      upstream = `${BACKEND_BASE}/api/presets`;
      method = "GET";
    } else {
      const parts = url.pathname.replace(/^\/storyclip-proxy\/?/, "").split("/");
      if (parts[0] === "presets") {
        upstream = `${BACKEND_BASE}/api/presets`;
        method = "GET";
      } else if (parts[0] === "jobs" && parts[1]) {
        upstream = `${BACKEND_BASE}/api/v1/jobs/${parts[1]}/status`;
        method = "GET";
        delete headers["Content-Type"];
      }
    }

    if (!upstream) {
      console.error('❌ Route not supported:', { path, action });
      return new Response(JSON.stringify({ error: "route_not_supported" }), {
        status: 404,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    console.log('🚀 Calling upstream:', { upstream, method, headers });
    const resp = await fetch(upstream, { method, headers, body });
    console.log('✅ Upstream response:', { status: resp.status, ok: resp.ok });
    
    const responseText = await resp.text();
    console.log('📄 Response body:', responseText);
    
    // Parse and log the JSON for debugging
    try {
      const jsonData = JSON.parse(responseText);
      console.log('📊 Parsed response data:', {
        status: jsonData.status,
        outputsCount: jsonData.outputs?.length || 0,
        hasOutputs: !!jsonData.outputs
      });
    } catch (e) {
      console.log('⚠️ Response is not valid JSON');
    }
    
    const contentType = resp.headers.get("content-type") || "application/json";

    return new Response(responseText, {
      status: resp.status,
      headers: { "content-type": contentType, ...corsHeaders(origin) },
    });
  } catch (e) {
    console.error('💥 Proxy error:', e);
    return new Response(JSON.stringify({ error: "proxy_error", detail: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  }
});
