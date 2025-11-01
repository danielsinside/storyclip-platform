#!/bin/bash

# 🧪 Script de Verificación CORS para Supabase Edge Function
# Uso: ./test-cors-fix.sh https://tu-proyecto.supabase.co

if [ -z "$1" ]; then
    echo "❌ Error: Proporciona la URL de tu proyecto Supabase"
    echo "Uso: ./test-cors-fix.sh https://tu-proyecto.supabase.co"
    exit 1
fi

SUPABASE_URL="$1"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/storyclip-proxy"
TEST_ORIGIN="https://preview--visual-story-pulse.lovable.app"

echo "🔧 Verificando CORS para Supabase Edge Function"
echo "📍 URL: $FUNCTION_URL"
echo "🌐 Origin: $TEST_ORIGIN"
echo ""

# 1. Test Preflight (OPTIONS)
echo "1️⃣ Probando preflight request (OPTIONS)..."
PREFLIGHT_RESPONSE=$(curl -s -i -X OPTIONS \
  "$FUNCTION_URL" \
  -H "Origin: $TEST_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization")

echo "$PREFLIGHT_RESPONSE"
echo ""

# Verificar headers CORS en preflight
if echo "$PREFLIGHT_RESPONSE" | grep -q "Access-Control-Allow-Origin: $TEST_ORIGIN"; then
    echo "✅ Preflight CORS: CORRECTO"
else
    echo "❌ Preflight CORS: FALLO - No se encontró Access-Control-Allow-Origin"
fi

if echo "$PREFLIGHT_RESPONSE" | grep -q "Vary: Origin"; then
    echo "✅ Vary Header: CORRECTO"
else
    echo "❌ Vary Header: FALLO - No se encontró Vary: Origin"
fi

if echo "$PREFLIGHT_RESPONSE" | grep -q "Access-Control-Allow-Credentials: true"; then
    echo "✅ Credentials: CORRECTO"
else
    echo "❌ Credentials: FALLO - No se encontró Access-Control-Allow-Credentials"
fi

echo ""

# 2. Test Request Real (POST)
echo "2️⃣ Probando request real (POST)..."
POST_RESPONSE=$(curl -s -i -X POST \
  "$FUNCTION_URL" \
  -H "Origin: $TEST_ORIGIN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test_cors_123",
    "tempPath": "/path/to/test/video.mp4",
    "fileName": "test_video.mp4",
    "options": {
      "quality": "high",
      "resolution": "1080x1920"
    }
  }')

echo "$POST_RESPONSE"
echo ""

# Verificar headers CORS en POST
if echo "$POST_RESPONSE" | grep -q "Access-Control-Allow-Origin: $TEST_ORIGIN"; then
    echo "✅ POST CORS: CORRECTO"
else
    echo "❌ POST CORS: FALLO - No se encontró Access-Control-Allow-Origin"
fi

if echo "$POST_RESPONSE" | grep -q "Vary: Origin"; then
    echo "✅ POST Vary: CORRECTO"
else
    echo "❌ POST Vary: FALLO - No se encontró Vary: Origin"
fi

echo ""

# 3. Test con otros orígenes de Lovable
echo "3️⃣ Probando otros orígenes de Lovable..."

ORIGINS=(
    "https://lovable.dev"
    "https://app.lovable.dev"
    "https://miapp.lovable.site"
    "https://test--miapp.lovable.app"
    "https://localhost:3000"
    "https://127.0.0.1:5173"
)

for origin in "${ORIGINS[@]}"; do
    echo "🧪 Probando origen: $origin"
    
    ORIGIN_RESPONSE=$(curl -s -i -X OPTIONS \
      "$FUNCTION_URL" \
      -H "Origin: $origin" \
      -H "Access-Control-Request-Method: POST")
    
    if echo "$ORIGIN_RESPONSE" | grep -q "Access-Control-Allow-Origin: $origin"; then
        echo "  ✅ $origin: PERMITIDO"
    else
        echo "  ❌ $origin: BLOQUEADO"
    fi
done

echo ""

# 4. Test con orígenes no permitidos
echo "4️⃣ Probando orígenes NO permitidos..."

BLOCKED_ORIGINS=(
    "https://malicious-site.com"
    "https://evil.lovable.fake"
    "http://localhost:3000"
)

for origin in "${BLOCKED_ORIGINS[@]}"; do
    echo "🚫 Probando origen bloqueado: $origin"
    
    BLOCKED_RESPONSE=$(curl -s -i -X OPTIONS \
      "$FUNCTION_URL" \
      -H "Origin: $origin" \
      -H "Access-Control-Request-Method: POST")
    
    if echo "$BLOCKED_RESPONSE" | grep -q "Access-Control-Allow-Origin: $origin"; then
        echo "  ❌ $origin: PERMITIDO (debería estar bloqueado)"
    else
        echo "  ✅ $origin: BLOQUEADO (correcto)"
    fi
done

echo ""
echo "🎯 Resumen de la verificación:"
echo "   - Si todos los tests muestran ✅, tu CORS está configurado correctamente"
echo "   - Si hay ❌, revisa la configuración de la Edge Function"
echo "   - El origen $TEST_ORIGIN debe estar permitido para resolver tu error"






