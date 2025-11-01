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
    const { uploadId, filename, filesize, duration } = await req.json();
    
    if (!uploadId) {
      throw new Error('uploadId is required');
    }

    if (!duration || duration <= 0) {
      throw new Error('Video duration is required and must be greater than 0');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Service configuration error');
    }

    // AI prompt to analyze video and generate optimal preset
    const systemPrompt = `Eres un experto en optimización de contenido para redes sociales y stories. 
Tu tarea es generar configuraciones óptimas y VARIADAS para crear StoryClips virales.

REGLAS DE ORO OBLIGATORIAS:
1. Cada clip NO PUEDE exceder 60 segundos de duración
2. Cada clip debe tener MÍNIMO 3 segundos de duración
3. Genera SIEMPRE 50 clips si el video lo permite (si el video es más corto, genera tantos como sea posible)
4. Los clips deben distribuirse a lo largo de todo el video
5. Las duraciones deben ser ALEATORIAS y DINÁMICAS para verse natural:
   - Los primeros 10-20 clips deben ser MÁS CORTOS (3-15 segundos) para captar atención rápidamente
   - Los clips restantes pueden variar entre 10-60 segundos de forma aleatoria
   - NUNCA todos los clips deben tener la misma duración

Visual Seeds disponibles:
- "viral": dinámico, llamativo, máximo engagement
- "cinematica": artístico, profesional, cinematográfico  
- "natural": auténtico, casual, orgánico
- "humor": divertido, entretenido
- "impacto": poderoso, memorable

Delay Modes disponibles:
- "FAST": publicación rápida (15-30 min entre clips)
- "NATURAL": pausas orgánicas (1-2 horas)
- "HYPE": máximo hype (5-10 min)
- "PRO": estratégico (3-4 horas)

METADATOS: Siempre positivos, optimistas y diseñados para mejorar el rendimiento en Facebook.
Usa palabras que generen engagement positivo. Los keywords deben ser hashtags relevantes y populares.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "seed": "viral" | "cinematica" | "natural" | "humor" | "impacto",
  "delayMode": "FAST" | "NATURAL" | "HYPE" | "PRO",
  "clips": [
    { "start": número, "end": número },
    { "start": número, "end": número },
    ... (hasta 50 clips con duraciones VARIADAS)
  ],
  "duration": número (duración total del video en segundos),
  "audio": {
    "ambientNoise": boolean,
    "amplitude": número entre 0.5-1.0
  },
  "metadata": {
    "title": "Título atractivo y positivo (máx 60 caracteres)",
    "description": "Descripción optimizada para Facebook (máx 160 caracteres)",
    "keywords": "hashtags relevantes separados por comas"
  },
  "explanation": "Breve explicación de por qué elegiste estos parámetros"
}`;

    const userPrompt = `Genera una configuración óptima para este video:
- Upload ID: ${uploadId}
- Nombre de archivo: ${filename || 'video.mp4'}
- Tamaño: ${filesize ? `${(filesize / 1024 / 1024).toFixed(2)} MB` : 'desconocido'}
- Duración REAL del video: ${duration} segundos

CRÍTICO: 
- La duración REAL del video es ${duration} segundos - ÚSALA para distribuir los clips
- Genera el MÁXIMO de clips posibles (hasta 50) que quepan en ${duration} segundos
- Si el video es corto (menos de ~300s), genera menos clips pero bien distribuidos
- Duraciones VARIADAS y ALEATORIAS:
  * Clips 1-15: entre 3-12 segundos (cortos para engagement inicial)
  * Clips 16-50: entre 8-60 segundos (variados aleatoriamente)
- Los clips deben cubrir TODO el video desde 0 hasta ${duration} segundos
- Los clips NO deben superponerse ni exceder ${duration} segundos
- Los metadatos deben ser creativos, positivos y únicos`;

    console.log('Calling Lovable AI to generate preset...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.2, // Mayor temperatura para más variación
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content received from AI');
    }

    console.log('AI Response:', aiContent);

    // Parse AI response - extract JSON from markdown code blocks if present
    let aiConfig;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : aiContent;
      aiConfig = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI content was:', aiContent);
      
      // Fallback to sensible defaults if AI response is invalid
      const maxClips = Math.min(50, Math.floor(duration / 10));
      const clipDuration = Math.floor(duration / maxClips);
      
      aiConfig = {
        seed: 'viral',
        delayMode: 'NATURAL',
        clips: Array.from({ length: maxClips }, (_, i) => ({
          start: i * clipDuration,
          end: Math.min((i + 1) * clipDuration, duration)
        })),
        duration: duration,
        audio: {
          ambientNoise: true,
          amplitude: 0.7
        },
        explanation: 'Configuración por defecto debido a error en análisis de IA.'
      };
    }

    // Build complete preset response with clip indicator
    const preset = {
      presetId: uploadId,
      creatorId: 'ai_generator',
      seed: aiConfig.seed || 'viral',
      delayMode: aiConfig.delayMode || 'NATURAL',
      clips: aiConfig.clips || [
        { start: 0, end: 15 },
        { start: 20, end: 35 },
        { start: 40, end: 55 }
      ],
      duration: aiConfig.duration || 60,
      audio: {
        ambientNoise: aiConfig.audio?.ambientNoise ?? true,
        amplitude: aiConfig.audio?.amplitude || 0.7
      },
      // Always include clip indicator with basic style
      clipIndicator: {
        type: 'numero',
        position: 'top-left',
        style: 'badge',
        size: 75,
        textColor: '#ffffff',
        bgColor: '#000000',
        opacity: 0.7
      },
      metadata: aiConfig.metadata || {
        title: 'Contenido Increíble para tus Stories',
        description: '¡Descubre contenido positivo y atractivo optimizado para conectar con tu audiencia!',
        keywords: '#viral, #trending, #inspiracion, #motivacion, #contenido'
      },
      explanation: aiConfig.explanation || 'Configuración optimizada por IA para maximizar engagement.'
    };

    console.log('Generated preset:', preset);

    return new Response(
      JSON.stringify(preset),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-preset function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate preset';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
