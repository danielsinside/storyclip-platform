#!/bin/bash

# 🚀 Script de Deploy - Fix CORS para Supabase Edge Function
# Uso: ./deploy-supabase-cors-fix.sh

echo "🔧 Deploying CORS fix for Supabase Edge Function"
echo "================================================"

# 1. Verificar que estamos en el directorio correcto
if [ ! -d "supabase" ]; then
    echo "❌ Error: No se encontró el directorio 'supabase'"
    echo "   Asegúrate de estar en el directorio raíz de tu proyecto Supabase"
    exit 1
fi

# 2. Crear directorio de la función si no existe
echo "📁 Creando directorio de la función..."
mkdir -p supabase/functions/storyclip-proxy

# 3. Copiar la función con CORS
echo "📄 Copiando función con CORS..."
cp /srv/storyclip/supabase-functions-storyclip-proxy-FINAL.ts supabase/functions/storyclip-proxy/index.ts

# 4. Verificar que la función se copió correctamente
if [ ! -f "supabase/functions/storyclip-proxy/index.ts" ]; then
    echo "❌ Error: No se pudo crear la función"
    exit 1
fi

echo "✅ Función creada correctamente"

# 5. Configurar variables de entorno
echo "🔑 Configurando variables de entorno..."
supabase secrets set STORY_API_KEY=sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3

# 6. Deploy de la función
echo "🚀 Desplegando función..."
supabase functions deploy storyclip-proxy

# 7. Verificar que la función esté desplegada
echo "✅ Verificando deploy..."
supabase functions list

# 8. Test de la función
echo "🧪 Probando función desplegada..."
FUNCTION_URL="https://kixjikosjlyozbnyvhua.supabase.co/functions/v1/storyclip-proxy"

echo "Test 1: Preflight request"
curl -s -i -X OPTIONS \
  "$FUNCTION_URL" \
  -H "Origin: https://preview--visual-story-pulse.lovable.app" \
  -H "Access-Control-Request-Method: POST"

echo ""
echo "Test 2: POST request"
curl -s -i -X POST \
  "$FUNCTION_URL" \
  -H "Origin: https://preview--visual-story-pulse.lovable.app" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

echo ""
echo "🎉 Deploy completado!"
echo "   La función ahora debería permitir CORS desde Lovable"
echo "   URL: $FUNCTION_URL"






