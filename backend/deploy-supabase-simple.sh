#!/bin/bash

echo "🚀 Deploying Supabase Edge Function with CORS fix"
echo "================================================"

# Verificar que estamos en el directorio correcto
if [ ! -f "supabase/functions/storyclip-proxy/index.ts" ]; then
    echo "❌ Error: No se encontró la función Edge"
    exit 1
fi

# Verificar si Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "📦 Instalando Supabase CLI..."
    npm install -g supabase
fi

# Verificar si estamos logueados
if ! supabase projects list &> /dev/null; then
    echo "🔐 Por favor, inicia sesión en Supabase:"
    echo "   supabase login"
    echo ""
    echo "Luego ejecuta este script nuevamente."
    exit 1
fi

# Desplegar la función
echo "📤 Desplegando función Edge..."
supabase functions deploy storyclip-proxy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Función desplegada exitosamente!"
    echo ""
    echo "🔧 PRÓXIMOS PASOS:"
    echo "1. Configura la API Key en Supabase Dashboard:"
    echo "   supabase secrets set STORY_API_KEY=tu_api_key_aqui"
    echo ""
    echo "2. Opcional - Configura la URL del API:"
    echo "   supabase secrets set STORY_API_URL=https://story.creatorsflow.app/api"
    echo ""
    echo "3. Prueba la función:"
    echo "   curl -X POST https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy/v1/process/story \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -H 'Origin: https://preview--visual-story-pulse.lovable.app' \\"
    echo "        -d '{\"test\": true}'"
    echo ""
    echo "🎯 La función ahora debería permitir CORS desde dominios de Lovable!"
else
    echo "❌ Error al desplegar la función"
    exit 1
fi






