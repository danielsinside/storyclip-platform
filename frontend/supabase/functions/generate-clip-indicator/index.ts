import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('Generating AI clip indicator...');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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
            content: 'Eres un experto en diseño de interfaces para videos de redes sociales. Genera configuraciones creativas para indicadores de clips que sean atractivos y funcionales.'
          },
          {
            role: 'user',
            content: 'Genera una configuración de indicador de clips única y atractiva para un video de redes sociales. Debe incluir tipo (temporal, numérico, progreso), posición, tamaño, colores y estilo.'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_clip_indicator',
              description: 'Genera una configuración de indicador de clips',
              parameters: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['temporal', 'numerico', 'progreso'],
                    description: 'Tipo de indicador'
                  },
                  position: {
                    type: 'string',
                    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
                    description: 'Posición del indicador'
                  },
                  size: {
                    type: 'number',
                    description: 'Tamaño del indicador (50-150)'
                  },
                  textColor: {
                    type: 'string',
                    description: 'Color del texto en formato hexadecimal'
                  },
                  bgColor: {
                    type: 'string',
                    description: 'Color de fondo en formato hexadecimal'
                  },
                  opacity: {
                    type: 'number',
                    description: 'Opacidad del indicador (0-1)'
                  },
                  style: {
                    type: 'string',
                    enum: ['rounded', 'square', 'circle'],
                    description: 'Estilo del indicador'
                  },
                  name: {
                    type: 'string',
                    description: 'Nombre descriptivo del indicador'
                  },
                  description: {
                    type: 'string',
                    description: 'Descripción breve del estilo'
                  }
                },
                required: ['type', 'position', 'size', 'textColor', 'bgColor', 'opacity', 'style', 'name', 'description']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_clip_indicator' } }
      })
    });

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No se recibió una respuesta válida de la IA');
    }

    const indicatorData = JSON.parse(toolCall.function.arguments);
    console.log('Generated clip indicator:', indicatorData);

    return new Response(JSON.stringify(indicatorData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-clip-indicator function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error generando indicador';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
