import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const API   = Deno.env.get("METRICOOL_API_URL") || "https://app.metricool.com/api";
const TOKEN = Deno.env.get("METRICOOL_USER_TOKEN") || Deno.env.get("METRICOOL_API_TOKEN") || "";
const TZ    = "America/New_York";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS"
};

function jok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function jerr(status: number, code: string, meta?: unknown) {
  console.error(`[metricool-publish] Error ${status}:`, code, meta);
  return new Response(JSON.stringify({ error: { code, meta } }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function safeJson(res: Response) { 
  const t = await res.text(); 
  try { return JSON.parse(t); } catch { return { raw: t }; } 
}

function rid() { 
  return `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint8Array(4)).reduce((s,b)=>s+("0"+b.toString(16)).slice(-2),"")}`;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function normalizeUrl(userId: string, blogId: string, mediaUrl: string) {
  const u = `${API}/actions/normalize/image/url?url=${encodeURIComponent(mediaUrl)}&userId=${encodeURIComponent(userId)}&blogId=${encodeURIComponent(blogId)}`;
  console.log(`🔄 Normalizing: ${u}`);
  
  const r = await fetch(u, { headers: { "X-Mc-Auth": TOKEN } });
  const j = await safeJson(r);
  
  if (!r.ok || !j?.url) {
    console.error(`❌ Normalize failed: ${r.status}`, j);
    throw new Error(`NORMALIZE_FAILED:${r.status}`);
  }
  
  console.log(`✅ Normalized URL: ${j.url}`);
  return j.url as string;
}

async function postStory(userId: string, blogId: string, body: any) {
  const qs = new URLSearchParams({ userId, blogId });
  const url = `${API}/v2/scheduler/posts?${qs.toString()}`;
  const max = Number(Deno.env.get("PUBLISH_MAX_RETRIES") || 5);
  const base = Number(Deno.env.get("PUBLISH_RETRY_BASE_MS") || 1200);

  console.log(`📮 Posting story to: ${url}`);
  const startTime = Date.now();

  for (let i=0; i<=max; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-Mc-Auth": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    const elapsed = Date.now() - startTime;
    const json = await safeJson(res);
    
    // Handle auth errors
    if (res.status === 401) {
      console.error(`❌ Unauthorized - check METRICOOL_USER_TOKEN`);
      return jerr(401, "UNAUTHORIZED");
    }
    if (res.status === 403) {
      console.error(`❌ Forbidden - check permissions`);
      return jerr(403, "FORBIDDEN");
    }
    if (res.status === 404) {
      console.error(`❌ Not found - check userId/blogId`);
      return jerr(404, "NOT_FOUND");
    }
    
    // Retry on rate limit or server errors
    if (res.status === 429 || res.status >= 500) {
      if (i === max) {
        console.error(`❌ Max retries exhausted (${max})`);
        console.log(JSON.stringify({ evt: "publish_retry_exhausted", ms: elapsed, status: res.status, attempts: i+1 }));
        return jerr(res.status, "RETRY_EXHAUSTED", json);
      }
      // Add jitter to prevent thundering herd (±25%)
      const jitter = Math.random() * 0.25 + 0.75;
      const backoff = base * Math.pow(2, i) * jitter;
      console.warn(`⚠️ Retry ${i+1}/${max} after ${Math.round(backoff)}ms (status ${res.status})`);
      await sleep(backoff);
      continue;
    }
    
    // Any other error
    if (!res.ok) {
      console.error(`❌ Provider error: ${res.status}`, json);
      return jerr(res.status, "PROVIDER_ERROR", json);
    }
    
    console.log(JSON.stringify({ evt: "publish_post_success", ms: elapsed, status: res.status, retry: i }));
    console.log(`✅ Story posted successfully`, json);
    return jok(json);
  }
  
  return jerr(500, "UNEXPECTED");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const startTime = Date.now();
  
  try {
    const body = await req.json().catch(() => ({}));
    
    // Input validation
    const mediaUrl: string = body.mediaUrl;
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return jerr(400, "INVALID_INPUT", { message: "mediaUrl is required and must be a string" });
    }
    
    if (!mediaUrl.startsWith("http://") && !mediaUrl.startsWith("https://")) {
      return jerr(400, "INVALID_MEDIA_URL", { message: "mediaUrl must be a valid HTTP(S) URL" });
    }

    const userId = String(body.userId || Deno.env.get("METRICOOL_USER_ID") || "").trim();
    const blogId = String(body.blogId || Deno.env.get("METRICOOL_BLOG_ID") || "").trim();
    
    if (!userId || !blogId) {
      return jerr(400, "MISSING_IDS", { message: "userId and blogId are required" });
    }
    
    if (!TOKEN) {
      return jerr(500, "MISSING_TOKEN", { message: "METRICOOL_USER_TOKEN not configured" });
    }
    
    // Optional: Log idempotency key for tracing (don't send to Metricool)
    const idempotencyKey = body.idempotencyKey || `sc-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;

    console.log(`📤 Publishing story [${idempotencyKey}] for userId=${userId}, blogId=${blogId}`);
    console.log(`🎥 Media: ${mediaUrl.substring(0, 80)}...`);

    // 1) Normalize media URL
    const urlNorm = await normalizeUrl(userId, blogId, mediaUrl);

    // 2) Build story payload
    const nowISO = new Date().toISOString();
    const payload = {
      publicationDate: { dateTime: body.scheduledAt || nowISO, timezone: TZ },
      creationDate: { dateTime: nowISO, timezone: TZ },
      text: body.caption || "",
      firstCommentText: "",
      providers: [{ network: "facebook" }],
      autoPublish: true,
      saveExternalMediaFiles: false,
      shortener: false,
      draft: false,
      facebookData: { type: "STORY" },
      media: [{ type: "video", url: urlNorm }]
    };

    // 3) Publish story (with internal retries)
    const posted = await postStory(userId, blogId, payload);
    if (posted.status !== 200) return posted;

    // 4) Standard response
    const data = await posted.json();
    const response = { 
      publishId: rid(), 
      status: "sent", 
      providerId: data?.id || data?.data?.id,
      idempotencyKey 
    };
    
    const totalMs = Date.now() - startTime;
    console.log(JSON.stringify({ evt: "publish_complete", ms: totalMs, providerId: response.providerId }));
    console.log(`✅ Publish complete:`, response);
    return jok(response);
    
  } catch (e: any) {
    const totalMs = Date.now() - startTime;
    console.log(JSON.stringify({ evt: "publish_error", ms: totalMs, error: e?.message }));
    console.error(`❌ Internal error:`, e?.message);
    return jerr(500, "INTERNAL_ERROR", { message: e?.message });
  }
});
