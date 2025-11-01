#!/bin/bash
set -euo pipefail

echo "🔍 StoryClip Post-Deploy Validation"
echo "===================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# 1. Estado general
echo -e "\n${BLUE}📊 Estado General de Servicios${NC}"
docker compose ps

echo -e "\n${BLUE}📋 Logs Recientes${NC}"
docker compose logs -f --tail=50

# 2. Health de la API
echo -e "\n${BLUE}🏥 Health Check de la API${NC}"
if curl -fsS http://localhost:3000/api/health | jq .; then
    print_status "OK" "API Health Check passed"
else
    print_status "ERROR" "API Health Check failed"
    exit 1
fi

# 3. Capacidades detectadas
echo -e "\n${BLUE}🔧 Capacidades FFmpeg Detectadas${NC}"
if docker exec -it storyclip curl -fsS http://localhost:3000/api/capabilities | jq .; then
    print_status "OK" "Capabilities endpoint working"
else
    print_status "WARN" "Capabilities endpoint not responding"
fi

# 4. FFmpeg dentro del backend
echo -e "\n${BLUE}🎬 FFmpeg en Backend${NC}"
echo "Versión:"
docker exec -it storyclip ffmpeg -version | sed -n '1,12p'

echo -e "\nCodecs disponibles:"
docker exec -it storyclip ffmpeg -hide_banner -codecs | egrep -i 'libsvtav1|libaom|libx26' || true

# Verificar SVT-AV1 específicamente
if docker exec -it storyclip ffmpeg -hide_banner -codecs | grep -qi 'libsvtav1'; then
    print_status "OK" "SVT-AV1 detected in backend"
else
    print_status "WARN" "SVT-AV1 not detected in backend"
fi

# 5. FFmpeg runner aislado
echo -e "\n${BLUE}🎯 FFmpeg Runner Aislado${NC}"
echo "Versión:"
docker exec -it ffmpeg-runner ffmpeg -version | sed -n '1,6p'

# Verificar SVT-AV1 en runner
if docker exec -it ffmpeg-runner ffmpeg -hide_banner -codecs | grep -qi 'libsvtav1'; then
    print_status "OK" "SVT-AV1 detected in runner"
else
    print_status "WARN" "SVT-AV1 not detected in runner"
fi

# 6. Test de render end-to-end
echo -e "\n${BLUE}🧪 Test de Render End-to-End${NC}"
echo "Creando job de prueba..."

# Crear job simple (Stories 9:16 + VS overlay)
JOB_RESPONSE=$(curl -sS -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "preset":"storyclip_social_916",
    "inputs":[{"url":"https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"}],
    "overlays":{"vs":{"enabled":true,"style":"center_glow","label":"VS"}},
    "output":{"container":"mp4","maxDurationSec":15},
    "metadata":{"origin":"postdeploy"}
  }' 2>/dev/null || echo '{"error":"API not responding"}')

echo "Respuesta del job:"
echo "$JOB_RESPONSE" | jq . || echo "$JOB_RESPONSE"

# Extraer job ID si existe
JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId // empty' 2>/dev/null || echo "")

if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
    print_status "OK" "Job creado exitosamente: $JOB_ID"
    
    echo -e "\nEstado del job:"
    sleep 2
    curl -fsS "http://localhost:3000/api/render/$JOB_ID" | jq . || echo "No se pudo obtener estado del job"
else
    print_status "WARN" "No se pudo crear job de prueba"
fi

# 7. Verificación de recursos
echo -e "\n${BLUE}📈 Recursos del Sistema${NC}"
echo "Uso de CPU y memoria:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 8. Verificación de volúmenes
echo -e "\n${BLUE}💾 Volúmenes Montados${NC}"
docker compose exec storyclip ls -la /srv/storyclip/data/ || echo "Directorio de datos no accesible"
docker compose exec storyclip ls -la /srv/storyclip/logs/ || echo "Directorio de logs no accesible"

# 9. Resumen final
echo -e "\n${GREEN}🎉 Validación Completada${NC}"
echo -e "\n${BLUE}📊 Resumen:${NC}"
echo "• Servicios: $(docker compose ps --format 'table {{.Name}}\t{{.Status}}' | tail -n +2 | wc -l) contenedores"
echo "• API Health: $(curl -fsS http://localhost:3000/api/health >/dev/null 2>&1 && echo "OK" || echo "FAIL")"
echo "• SVT-AV1 Backend: $(docker exec -it storyclip ffmpeg -hide_banner -codecs | grep -qi 'libsvtav1' && echo "OK" || echo "FAIL")"
echo "• SVT-AV1 Runner: $(docker exec -it ffmpeg-runner ffmpeg -hide_banner -codecs | grep -qi 'libsvtav1' && echo "OK" || echo "FAIL")"

echo -e "\n${BLUE}🔗 URLs de Acceso:${NC}"
echo "• API: http://localhost:3000"
echo "• Health: http://localhost:3000/api/health"
echo "• Capabilities: http://localhost:3000/api/capabilities"

print_status "OK" "Validación post-deploy completada"











