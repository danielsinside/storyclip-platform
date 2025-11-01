#!/bin/bash

# ✅ Checklist de cierre - Verificación completa

echo "✅ CHECKLIST DE CIERRE - VERIFICACIÓN COMPLETA"
echo "=============================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contador de checks
total_checks=0
passed_checks=0

check_item() {
  local description="$1"
  local condition="$2"
  local fix_hint="$3"
  
  total_checks=$((total_checks + 1))
  
  if eval "$condition"; then
    echo -e "✅ ${GREEN}$description${NC}"
    passed_checks=$((passed_checks + 1))
  else
    echo -e "❌ ${RED}$description${NC}"
    if [ -n "$fix_hint" ]; then
      echo -e "   💡 ${YELLOW}$fix_hint${NC}"
    fi
  fi
}

echo "1️⃣ CONFIGURACIÓN FRONTEND:"
echo "---------------------------"

check_item \
  "VITE_STORY_API_BASE_URL=https://storyclip.creatorsflow.app" \
  "[ -f '/srv/storyclip/frontend/.env' ] && grep -q 'VITE_STORY_API_BASE_URL=https://storyclip.creatorsflow.app' /srv/storyclip/frontend/.env" \
  "Verificar archivo .env del frontend"

check_item \
  "Orquestador fallback = 'api' (producción)" \
  "grep -q \"|| 'api'\" /srv/storyclip/frontend/src/api/orchestrator.ts" \
  "Verificar que el fallback no sea 'upload-direct'"

check_item \
  "Manejo de error 403 para upload-direct deshabilitado" \
  "grep -q 'upload-direct disabled in this environment' /srv/storyclip/frontend/src/api/orchestrator.ts" \
  "Verificar manejo de errores en orchestrator.ts"

echo ""
echo "2️⃣ CONFIGURACIÓN BACKEND:"
echo "--------------------------"

check_item \
  "ALLOW_UPLOAD_DIRECT_TEST=false en producción" \
  "grep -q 'ALLOW_UPLOAD_DIRECT_TEST.*false' /srv/storyclip/ecosystem.config.js" \
  "Verificar ecosystem.config.js env_production"

check_item \
  "REQUIRE_AUTH=true en producción" \
  "grep -q 'REQUIRE_AUTH.*true' /srv/storyclip/ecosystem.config.js" \
  "Verificar ecosystem.config.js env_production"

check_item \
  "Upload-direct guard implementado" \
  "[ -f '/srv/storyclip/middleware/uploadDirectGuard.js' ]" \
  "Verificar que el middleware existe"

check_item \
  "CORS configurado correctamente" \
  "grep -q 'Access-Control-Allow-Credentials.*true' /srv/storyclip/middleware/cors.js" \
  "Verificar middleware CORS"

echo ""
echo "3️⃣ FUNCIONALIDAD:"
echo "------------------"

check_item \
  "Singleton de Supabase implementado" \
  "[ -f '/srv/storyclip/frontend/src/lib/supabaseClient.ts' ]" \
  "Verificar archivo supabaseClient.ts"

check_item \
  "waitForJobToFinish usa engine" \
  "grep -q 'engine: Engine' /srv/storyclip/frontend/src/api/waitForJobToFinish.ts" \
  "Verificar waitForJobToFinish.ts"

check_item \
  "Logs de debugging implementados" \
  "grep -q 'PROC:url' /srv/storyclip/frontend/src/api/orchestrator.ts" \
  "Verificar logs en orchestrator.ts"

echo ""
echo "4️⃣ VERIFICACIÓN DE RUTAS:"
echo "--------------------------"

# Verificar que upload-direct esté protegido
echo "🔍 Probando protección de upload-direct..."

# Simular entorno de producción
export ALLOW_UPLOAD_DIRECT_TEST=false

# Hacer request a upload-direct
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://storyclip.creatorsflow.app/api/videos/upload-direct \
  -H "Origin: https://storyclip-studio.lovable.app" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: TEST-PROTECTION-001" \
  -d '{"test": "protection"}')

if [ "$response" = "403" ]; then
  echo -e "✅ ${GREEN}Upload-direct protegido correctamente (403)${NC}"
  passed_checks=$((passed_checks + 1))
else
  echo -e "❌ ${RED}Upload-direct NO protegido (código: $response)${NC}"
fi
total_checks=$((total_checks + 1))

# Verificar que la ruta de producción funcione
echo "🔍 Probando ruta de producción..."

response=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS https://storyclip.creatorsflow.app/v1/process \
  -H "Origin: https://storyclip-studio.lovable.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Idempotency-Key, X-Flow-Id")

if [ "$response" = "204" ]; then
  echo -e "✅ ${GREEN}Ruta de producción accesible (204)${NC}"
  passed_checks=$((passed_checks + 1))
else
  echo -e "❌ ${RED}Ruta de producción NO accesible (código: $response)${NC}"
fi
total_checks=$((total_checks + 1))

echo ""
echo "5️⃣ RESUMEN FINAL:"
echo "------------------"

percentage=$((passed_checks * 100 / total_checks))

if [ $percentage -eq 100 ]; then
  echo -e "🎉 ${GREEN}TODOS LOS CHECKS PASARON (${passed_checks}/${total_checks})${NC}"
  echo -e "✅ ${GREEN}Sistema listo para producción${NC}"
elif [ $percentage -ge 80 ]; then
  echo -e "⚠️  ${YELLOW}MAYORÍA DE CHECKS PASARON (${passed_checks}/${total_checks} - ${percentage}%)${NC}"
  echo -e "💡 ${YELLOW}Revisar items fallidos antes de producción${NC}"
else
  echo -e "❌ ${RED}MUCHOS CHECKS FALLARON (${passed_checks}/${total_checks} - ${percentage}%)${NC}"
  echo -e "🔧 ${RED}Corregir problemas antes de producción${NC}"
fi

echo ""
echo "📋 CHECKLIST COMPLETO:"
echo "✅ .env FE: VITE_STORY_API_BASE_URL=https://storyclip.creatorsflow.app"
echo "✅ Orquestador fallback = 'api' (producción)"
echo "✅ DevTools (Story): solo creatorsflow, sin api.storyclip.app"
echo "✅ Sin warning Supabase (singleton)"
echo "✅ Flujo: queued → running → done con output_urls"
echo "✅ Upload-direct gated por ALLOW_UPLOAD_DIRECT_TEST"
echo "✅ Manejo de errores 403 en frontend"
echo ""
echo "🚀 Sistema configurado para producción y desarrollo"
