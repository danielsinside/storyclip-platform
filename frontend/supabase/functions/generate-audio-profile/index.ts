import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename, duration, mode, scope } = await req.json();
    
    console.log('Generating audio profile:', { filename, duration, mode, scope });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate AI-based audio profile
    const systemPrompt = `Eres un experto en procesamiento de audio para contenido viral en redes sociales.
Genera un perfil de audio optimizado basándote en:
- Filename: ${filename}
- Duration: ${duration} segundos
- Modo de variación: ${mode}
- Ámbito: ${scope}

El modo de variación significa:
- "suave": cambios sutiles, mantener naturalidad (amplitude entre 0.8-1.1)
- "medio": cambios moderados, equilibrio (amplitude entre 1.0-1.3)
- "fuerte": cambios marcados, impacto (amplitude entre 1.3-1.8)
- "personalizado": analizar el contenido y decidir (amplitude variable)

Devuelve SOLO un objeto JSON con esta estructura:
{
  "ambientNoise": boolean (true si el audio se beneficiaría de mejora de ambiente),
  "amplitude": number (entre 0.5 y 2.0),
  "explanation": string (breve explicación de por qué elegiste estos valores)
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Genera el perfil de audio óptimo para este contenido.' }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      // Fallback to default profile
      return new Response(
        JSON.stringify({
          ambientNoise: true,
          amplitude: mode === 'suave' ? 0.9 : mode === 'medio' ? 1.1 : mode === 'fuerte' ? 1.5 : 1.0,
          explanation: 'Perfil generado con configuración predeterminada'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Parse JSON from AI response
    let profile;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       content.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        profile = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, content);
      
      // Fallback
      profile = {
        ambientNoise: true,
        amplitude: mode === 'suave' ? 0.9 : mode === 'medio' ? 1.1 : mode === 'fuerte' ? 1.5 : 1.0,
        explanation: 'Perfil generado con configuración predeterminada'
      };
    }

    console.log('Generated profile:', profile);

    return new Response(
      JSON.stringify(profile),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-audio-profile:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        ambientNoise: true,
        amplitude: 1.0,
        explanation: 'Error al generar perfil, usando valores por defecto'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});
