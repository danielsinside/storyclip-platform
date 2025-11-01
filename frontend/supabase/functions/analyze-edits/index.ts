import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { effects } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build the effects summary
    const effectsList = [];
    if (effects.horizontalFlip) effectsList.push("volteo horizontal");
    if (effects.cameraZoom) effectsList.push(`zoom de cámara (${effects.cameraZoomDuration}s)`);
    if (effects.filterType !== 'none') effectsList.push(`filtro ${effects.filterType} (${effects.filterIntensity}%)`);
    if (effects.overlayType !== 'none') effectsList.push(`overlay ${effects.overlayType} (${effects.overlayIntensity}%)`);
    if (effects.clipIndicator !== 'none') effectsList.push(`indicador de clip ${effects.clipIndicator}`);
    if (effects.ambientNoise) effectsList.push("ruido ambiental");
    if (effects.amplitude !== 1.0) effectsList.push(`amplitud de audio ${effects.amplitude}x`);
    if (effects.audioUnique) effectsList.push("audio único");
    if (effects.cutStart !== 0 || effects.cutEnd !== 59) effectsList.push(`corte de ${effects.cutStart}s a ${effects.cutEnd}s`);

    const prompt = `Analiza las siguientes ediciones aplicadas a un video y proporciona una opinión profesional breve (máximo 2-3 oraciones) sobre por qué estas ediciones mejoran el contenido para redes sociales:

Efectos aplicados:
${effectsList.join(', ')}

Enfócate en cómo estos efectos pueden aumentar el engagement, retención de audiencia y profesionalismo del video.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Eres un experto en marketing de contenido para redes sociales. Analiza ediciones de video y proporciona opiniones concisas y profesionales."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Las ediciones aplicadas mejoran significativamente la calidad y el profesionalismo del video.";

    return new Response(
      JSON.stringify({ analysis }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in analyze-edits function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
