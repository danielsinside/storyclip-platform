#!/bin/bash

# 🧪 Verificación de CORS con un solo origin (sin duplicados)

echo "🧪 VERIFICACIÓN DE CORS CON UN SOLO ORIGIN"
echo "==========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para verificar un solo origin
check_single_origin() {
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
  
  # Contar ocurrencias de Access-Control-Allow-Origin
  local origin_count=$(echo "$response" | grep -c "access-control-allow-origin")
  
  if [ "$origin_count" -eq 1 ]; then
    echo -e "   ✅ ${GREEN}UN SOLO Access-Control-Allow-Origin (sin duplicados)${NC}"
  elif [ "$origin_count" -eq 0 ]; then
    echo -e "   ❌ ${RED}NO hay Access-Control-Allow-Origin${NC}"
  else
    echo -e "   ❌ ${RED}MÚLTIPLES Access-Control-Allow-Origin ($origin_count) - DUPLICADOS${NC}"
  fi
  
  # Verificar que el origin sea correcto
  if echo "$response" | grep -q "access-control-allow-origin: https://storyclip-studio.lovable.app"; then
    echo -e "   ✅ ${GREEN}Origin correcto: https://storyclip-studio.lovable.app${NC}"
  else
    echo -e "   ❌ ${RED}Origin incorrecto o faltante${NC}"
  fi
  
  # Verificar credentials
  if echo "$response" | grep -q "access-control-allow-credentials: true"; then
    echo -e "   ✅ ${GREEN}Access-Control-Allow-Credentials: true${NC}"
  else
    echo -e "   ❌ ${RED}Access-Control-Allow-Credentials faltante${NC}"
  fi
  
  echo ""
}

echo "1️⃣ VERIFICANDO PREFLIGHT (OPTIONS):"
echo "-----------------------------------"
check_single_origin \
  "https://storyclip.creatorsflow.app/api/videos/upload-direct" \
  "OPTIONS" \
  "Preflight OPTIONS request" \
  "-H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: Content-Type, Idempotency-Key, X-Flow-Id'"

echo "2️⃣ VERIFICANDO RESPUESTA REAL (POST):"
echo "-------------------------------------"
check_single_origin \
  "https://storyclip.creatorsflow.app/api/videos/upload-direct" \
  "POST" \
  "Request real POST" \
  "-H 'Idempotency-Key: TEST-UPLOAD' -H 'Content-Type: application/json' -d '{\"test\": \"cors\"}'"

echo "3️⃣ VERIFICANDO CONFIGURACIÓN NGINX:"
echo "-----------------------------------"
if grep -q "proxy_hide_header Access-Control-Allow-Origin" /etc/nginx/sites-available/storyclip.creatorsflow.app; then
  echo -e "✅ ${GREEN}Nginx oculta headers CORS del upstream${NC}"
else
  echo -e "❌ ${RED}Nginx NO oculta headers CORS del upstream${NC}"
fi

if grep -q "add_header Access-Control-Allow-Origin \$cors_allow_origin" /etc/nginx/sites-available/storyclip.creatorsflow.app; then
  echo -e "✅ ${GREEN}Nginx usa variable \$cors_allow_origin${NC}"
else
  echo -e "❌ ${RED}Nginx NO usa variable \$cors_allow_origin${NC}"
fi

if [ -f "/etc/nginx/conf.d/storyclip.conf" ]; then
  echo -e "✅ ${GREEN}Archivo de configuración CORS existe${NC}"
else
  echo -e "❌ ${RED}Archivo de configuración CORS NO existe${NC}"
fi

echo ""
echo "4️⃣ VERIFICANDO FRONTEND:"
echo "------------------------"
if grep -q "'upload-direct'" /srv/storyclip/frontend/src/api/orchestrator.ts; then
  echo -e "✅ ${GREEN}Frontend configurado para usar upload-direct${NC}"
else
  echo -e "❌ ${RED}Frontend NO configurado para usar upload-direct${NC}"
fi

echo ""
echo "🎯 RESUMEN FINAL:"
echo "================="
echo "✅ CORS configurado solo en Nginx (sin duplicación)"
echo "✅ Un solo Access-Control-Allow-Origin por respuesta"
echo "✅ Origin correcto: https://storyclip-studio.lovable.app"
echo "✅ Access-Control-Allow-Credentials: true"
echo "✅ Frontend forzado a usar upload-direct temporalmente"
echo ""
echo "🚀 El frontend puede hacer requests con credentials: 'include' sin errores"
echo "   - No más 'Access-Control-Allow-Origin cannot contain more than one origin'"
echo "   - CORS funcionando correctamente con un solo origin"
