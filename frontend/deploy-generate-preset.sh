#!/bin/bash

echo "🚀 Deploying generate-preset Edge Function"
echo "==========================================="

cd /srv/story-creatorsflow-app/frontend-lovable

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ No estás logueado en Supabase"
    echo ""
    echo "Por favor ejecuta:"
    echo "  supabase login"
    echo ""
    echo "O configura el token:"
    echo "  export SUPABASE_ACCESS_TOKEN=tu_token_aqui"
    exit 1
fi

# Deploy the function
echo "📤 Desplegando generate-preset..."
supabase functions deploy generate-preset --project-ref kixjikosjlyozbnyvhua

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Función desplegada exitosamente!"
    echo ""
    echo "🔧 PRÓXIMO PASO:"
    echo "Configura la API Key de Lovable:"
    echo "  supabase secrets set LOVABLE_API_KEY=tu_lovable_api_key --project-ref kixjikosjlyozbnyvhua"
    echo ""
    echo "URL de la función:"
    echo "  https://kixjikosjlyozbnyvhua.supabase.co/functions/v1/generate-preset"
else
    echo "❌ Error al desplegar la función"
    exit 1
fi
