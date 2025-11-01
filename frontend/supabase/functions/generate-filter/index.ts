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

    console.log('Generating AI filter...');

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
            content: 'Eres un experto en filtros CSS creativos. Genera combinaciones únicas y artísticas de filtros CSS que se vean profesionales y atractivas para videos.'
          },
          {
            role: 'user',
            content: 'Genera un filtro CSS único y creativo para un video. El filtro debe incluir parámetros como hue-rotate, saturate, brightness, contrast, sepia, grayscale, blur, etc. Sé creativo y genera algo visualmente interesante.'
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_filter',
            description: 'Genera parámetros de filtro CSS creativos',
            parameters: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Nombre creativo del filtro en español (ej: "Atardecer Dorado", "Neón Urbano")'
                },
                description: {
                  type: 'string',
                  description: 'Breve descripción del efecto visual (max 50 caracteres)'
                },
                filter: {
                  type: 'string',
                  description: 'String de filtro CSS completo (ej: "hue-rotate(45deg) saturate(150%) brightness(110%)")'
                },
                intensity: {
                  type: 'number',
                  description: 'Intensidad base del filtro del 0 al 100',
                  minimum: 0,
                  maximum: 100
                }
              },
              required: ['name', 'description', 'filter', 'intensity'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_filter' } }
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

    const filterData = JSON.parse(toolCall.function.arguments);
    console.log('Generated filter:', filterData);

    return new Response(
      JSON.stringify(filterData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating filter:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido al generar filtro'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
