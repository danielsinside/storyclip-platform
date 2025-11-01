import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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
    "Access-Control-Allow-Headers": "content-type,authorization,apikey,x-client-info",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return new Response(JSON.stringify({ error: "missing_job_id" }), {
        status: 400,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    console.log('📊 Mock job status requested for:', jobId);

    // Extraer upload_id del jobId (formato: job_TIMESTAMP_UPLOADID)
    const uploadIdMatch = jobId.match(/job_\d+_(upl_\d+_[a-z0-9]+)/);
    const uploadId = uploadIdMatch ? uploadIdMatch[1] : null;

    if (!uploadId) {
      return new Response(JSON.stringify({ error: "invalid_job_id_format" }), {
        status: 400,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    // En modo mock, usamos el video original como referencia para todos los clips
    // Esto simula que cada clip es el video completo hasta que se procese realmente
    const originalVideoUrl = `https://story.creatorsflow.app/outputs/uploads/${uploadId}.mp4`;
    
    // Generar 17 clips todos apuntando al video original
    // Esto permite ver el resultado visual inmediatamente mientras se procesa
    const numClips = 17;
    const outputs = Array.from({ length: numClips }, () => originalVideoUrl);

    // Mock job status - simula un job completado
    const mockStatus = {
      jobId: jobId,
      status: "completed",
      progress: {
        pct: 100,
        stage: "completed"
      },
      outputs
    };

    console.log('✅ Returning mock status with original video as clips:', mockStatus);

    return new Response(JSON.stringify(mockStatus), {
      status: 200,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });

  } catch (e) {
    console.error('💥 Mock job error:', e);
    return new Response(JSON.stringify({ error: "mock_job_error", detail: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  }
});
