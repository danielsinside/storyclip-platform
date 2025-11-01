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
    console.log('Generating AI camera movement...');
    
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
            content: 'Eres un experto en cinematografía y movimientos de cámara para contenido de redes sociales. Genera configuraciones creativas de movimientos que sean dinámicos y profesionales.'
          },
          {
            role: 'user',
            content: 'Genera una combinación de movimientos de cámara única y profesional para un video de redes sociales. Incluye qué movimientos activar y sus parámetros de duración.'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_camera_movement',
              description: 'Genera una configuración de movimientos de cámara',
              parameters: {
                type: 'object',
                properties: {
                  zoom: {
                    type: 'boolean',
                    description: 'Activar zoom in/out'
                  },
                  zoomDuration: {
                    type: 'number',
                    description: 'Duración del zoom en segundos (4-12)'
                  },
                  pan: {
                    type: 'boolean',
                    description: 'Activar paneo horizontal'
                  },
                  tilt: {
                    type: 'boolean',
                    description: 'Activar inclinación vertical'
                  },
                  rotate: {
                    type: 'boolean',
                    description: 'Activar rotación'
                  },
                  dolly: {
                    type: 'boolean',
                    description: 'Activar travelling'
                  },
                  shake: {
                    type: 'boolean',
                    description: 'Activar efecto de vibración'
                  },
                  name: {
                    type: 'string',
                    description: 'Nombre descriptivo de la combinación'
                  },
                  description: {
                    type: 'string',
                    description: 'Descripción del efecto que logra'
                  }
                },
                required: ['zoom', 'zoomDuration', 'name', 'description']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_camera_movement' } }
      })
    });

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No se recibió una respuesta válida de la IA');
    }

    const movementData = JSON.parse(toolCall.function.arguments);
    console.log('Generated camera movement:', movementData);

    return new Response(JSON.stringify(movementData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-camera-movement function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error generando movimiento';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
