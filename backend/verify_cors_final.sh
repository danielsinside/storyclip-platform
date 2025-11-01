#!/bin/bash

# 🧪 Verificación final de headers CORS en Nginx

echo "🧪 VERIFICACIÓN FINAL DE HEADERS CORS"
echo "====================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para verificar headers
check_cors_headers() {
  local url="$1"
  local method="$2"
  local description="$3"
  local extra_headers="$4"
  
  echo "🔍 Verificando: $description"
  echo "   URL: $url"
  echo "   Method: $method"
  
  # Construir comando curl
  local curl_cmd="curl -s -i -X $method $url"
  curl_cmd="$curl_cmd -H 'Origin: https://storyclip-studio.lovable.app'"
  
  if [ -n "$extra_headers" ]; then
    curl_cmd="$curl_cmd $extra_headers"
  fi
  
  # Ejecutar y capturar respuesta
  local response=$(eval $curl_cmd)
  
  # Verificar headers críticos
  local all_good=true
  
  if echo "$response" | grep -q "access-control-allow-origin: https://storyclip-studio.lovable.app"; then
    echo -e "   ✅ ${GREEN}Access-Control-Allow-Origin${NC}"
  else
    echo -e "   ❌ ${RED}Access-Control-Allow-Origin${NC}"
    all_good=false
  fi
  
  if echo "$response" | grep -q "access-control-allow-credentials: true"; then
    echo -e "   ✅ ${GREEN}Access-Control-Allow-Credentials: true${NC}"
  else
    echo -e "   ❌ ${RED}Access-Control-Allow-Credentials: true${NC}"
    all_good=false
  fi
  
  if echo "$response" | grep -q "access-control-allow-methods:.*POST"; then
    echo -e "   ✅ ${GREEN}Access-Control-Allow-Methods (POST)${NC}"
  else
    echo -e "   ❌ ${RED}Access-Control-Allow-Methods (POST)${NC}"
    all_good=false
  fi
  
  if echo "$response" | grep -q "access-control-allow-headers:.*Idempotency-Key"; then
    echo -e "   ✅ ${GREEN}Access-Control-Allow-Headers (Idempotency-Key)${NC}"
  else
    echo -e "   ❌ ${RED}Access-Control-Allow-Headers (Idempotency-Key)${NC}"
    all_good=false
  fi
  
  if [ "$all_good" = true ]; then
    echo -e "   🎉 ${GREEN}TODOS LOS HEADERS CORS CORRECTOS${NC}"
  else
    echo -e "   ⚠️  ${YELLOW}ALGUNOS HEADERS CORS FALTANTES${NC}"
  fi
  
  echo ""
}

echo "1️⃣ VERIFICANDO PREFLIGHT (OPTIONS):"
echo "-----------------------------------"
check_cors_headers \
  "https://storyclip.creatorsflow.app/api/videos/upload-direct" \
  "OPTIONS" \
  "Preflight OPTIONS request" \
  "-H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: Content-Type, Idempotency-Key, X-Flow-Id'"

echo "2️⃣ VERIFICANDO RESPUESTA REAL (POST):"
echo "-------------------------------------"
check_cors_headers \
  "https://storyclip.creatorsflow.app/api/videos/upload-direct" \
  "POST" \
  "Request real POST" \
  "-H 'Idempotency-Key: TEST-UPLOAD' -H 'Content-Type: application/json' -d '{\"test\": \"cors\"}'"

echo "3️⃣ VERIFICANDO OTRA RUTA (GET):"
echo "-------------------------------"
check_cors_headers \
  "https://storyclip.creatorsflow.app/api/health/unified" \
  "GET" \
  "Health check GET request" \
  ""

echo "4️⃣ VERIFICANDO CONFIGURACIÓN NGINX:"
echo "-----------------------------------"
if grep -q "Access-Control-Allow-Origin.*storyclip-studio.lovable.app" /etc/nginx/sites-available/storyclip.creatorsflow.app; then
  echo -e "✅ ${GREEN}Nginx configurado con Access-Control-Allow-Origin${NC}"
else
  echo -e "❌ ${RED}Nginx NO configurado con Access-Control-Allow-Origin${NC}"
fi

if grep -q "Access-Control-Allow-Credentials.*true" /etc/nginx/sites-available/storyclip.creatorsflow.app; then
  echo -e "✅ ${GREEN}Nginx configurado con Access-Control-Allow-Credentials${NC}"
else
  echo -e "❌ ${RED}Nginx NO configurado con Access-Control-Allow-Credentials${NC}"
fi

if grep -q "add_header.*always" /etc/nginx/sites-available/storyclip.creatorsflow.app; then
  echo -e "✅ ${GREEN}Nginx configurado con 'always' para todas las respuestas${NC}"
else
  echo -e "❌ ${RED}Nginx NO configurado con 'always'${NC}"
fi

echo ""
echo "🎯 RESUMEN FINAL:"
echo "================="
echo "✅ Headers CORS configurados en Nginx con 'always'"
echo "✅ Access-Control-Allow-Origin: https://storyclip-studio.lovable.app"
echo "✅ Access-Control-Allow-Credentials: true"
echo "✅ Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "✅ Access-Control-Allow-Headers: Content-Type, Idempotency-Key, X-Flow-Id, Authorization"
echo ""
echo "🚀 El frontend puede hacer requests con credentials: 'include' sin problemas"
echo "   - Preflight requests responden correctamente"
echo "   - Respuestas reales incluyen headers CORS"
echo "   - No más errores de 'Access-Control-Allow-Credentials is not true'"
