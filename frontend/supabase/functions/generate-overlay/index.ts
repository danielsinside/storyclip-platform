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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating AI overlay...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en efectos visuales y animaciones CSS. Genera overlays animados únicos y creativos que se vean impresionantes sobre videos.'
          },
          {
            role: 'user',
            content: 'Genera un overlay animado creativo para un video. Puede incluir partículas, destellos, efectos geométricos, glitch, o cualquier efecto visual único. Sé muy creativo y genera algo visualmente impactante.'
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_overlay',
            description: 'Genera parámetros de overlay animado creativos',
            parameters: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Nombre creativo del overlay en español (ej: "Lluvia de Estrellas", "Pulso Digital")'
                },
                description: {
                  type: 'string',
                  description: 'Breve descripción del efecto visual (max 50 caracteres)'
                },
                type: {
                  type: 'string',
                  enum: ['particles', 'sparkles', 'glitch', 'vhs', 'geometric', 'waves', 'matrix', 'neon'],
                  description: 'Tipo base de overlay'
                },
                intensity: {
                  type: 'number',
                  description: 'Intensidad del overlay del 0 al 100',
                  minimum: 0,
                  maximum: 100
                },
                animationSpeed: {
                  type: 'string',
                  description: 'Velocidad de la animación (ej: "2s", "3.5s", "1.2s")'
                },
                colorScheme: {
                  type: 'string',
                  description: 'Esquema de color del overlay (ej: "cyan-magenta", "gold-purple", "neon-green")'
                }
              },
              required: ['name', 'description', 'type', 'intensity', 'animationSpeed', 'colorScheme'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_overlay' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido. Intenta de nuevo en unos momentos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos agotados. Por favor agrega fondos a tu workspace de Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const overlayData = JSON.parse(toolCall.function.arguments);
    console.log('Generated overlay:', overlayData);

    return new Response(
      JSON.stringify(overlayData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating overlay:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido al generar overlay'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
