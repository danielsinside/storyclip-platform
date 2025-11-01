#!/bin/bash
set -euo pipefail

echo "🧪 Smoke Tests de Observabilidad StoryClip"
echo "==========================================="

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

# 1. Verificar que /api/metrics responde
print_status "INFO" "Verificando endpoint de métricas del backend..."
if curl -fsS http://localhost:3000/api/metrics | head -10 >/dev/null 2>&1; then
    print_status "OK" "Endpoint /api/metrics responde correctamente"
    
    # Mostrar algunas métricas
    echo -e "\n${BLUE}📊 Métricas del Backend:${NC}"
    curl -fsS http://localhost:3000/api/metrics | head -20
else
    print_status "ERROR" "Endpoint /api/metrics no responde"
    exit 1
fi

# 2. Verificar que Prometheus esté scrapeando
print_status "INFO" "Verificando que Prometheus esté scrapeando métricas..."
if curl -fsS 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job=="storyclip-backend")' >/dev/null 2>&1; then
    print_status "OK" "Prometheus está scrapeando el backend"
    
    # Mostrar targets
    echo -e "\n${BLUE}🎯 Targets de Prometheus:${NC}"
    curl -fsS 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[].labels.job'
else
    print_status "WARN" "Prometheus no está scrapeando el backend correctamente"
fi

# 3. Verificar series de métricas
print_status "INFO" "Verificando series de métricas en Prometheus..."
if curl -fsS 'http://localhost:9090/api/v1/series?match[]=storyclip_jobs_created_total' | jq '.data | length' | grep -q '[1-9]'; then
    print_status "OK" "Métricas de StoryClip detectadas en Prometheus"
    
    # Mostrar series disponibles
    echo -e "\n${BLUE}📈 Series de Métricas Disponibles:${NC}"
    curl -fsS 'http://localhost:9090/api/v1/series?match[]=storyclip_*' | jq '.data[]' | head -10
else
    print_status "WARN" "Métricas de StoryClip no detectadas. Ejecuta algunos jobs para generar métricas."
fi

# 4. Verificar Grafana
print_status "INFO" "Verificando Grafana..."
if curl -fsS http://localhost:3001/api/health >/dev/null 2>&1; then
    print_status "OK" "Grafana está corriendo en http://localhost:3001"
else
    print_status "WARN" "Grafana no responde en puerto 3001"
fi

# 5. Verificar Alertmanager
print_status "INFO" "Verificando Alertmanager..."
if curl -fsS http://localhost:9093/-/healthy >/dev/null 2>&1; then
    print_status "OK" "Alertmanager está corriendo en http://localhost:9093"
else
    print_status "WARN" "Alertmanager no responde en puerto 9093"
fi

# 6. Verificar cAdvisor
print_status "INFO" "Verificando cAdvisor..."
if curl -fsS http://localhost:8085/healthz >/dev/null 2>&1; then
    print_status "OK" "cAdvisor está corriendo en http://localhost:8085"
else
    print_status "WARN" "cAdvisor no responde en puerto 8085"
fi

# 7. Test de alertas (simular backend caído)
print_status "INFO" "Probando sistema de alertas..."
echo "Para probar alertas:"
echo "1. Para el contenedor del backend: docker stop storyclip"
echo "2. Espera 2 minutos para que se dispare la alerta 'BackendDown'"
echo "3. Verifica en Alertmanager: http://localhost:9093"
echo "4. Reinicia el backend: docker start storyclip"

# 8. Test de métricas con job de prueba
print_status "INFO" "Creando job de prueba para generar métricas..."
JOB_RESPONSE=$(curl -sS -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "preset":"storyclip_social_916",
    "inputs":[{"url":"https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"}],
    "overlays":{"vs":{"enabled":true,"style":"center_glow","label":"VS"}},
    "output":{"container":"mp4","maxDurationSec":15},
    "metadata":{"origin":"smoke_test"}
  }' 2>/dev/null || echo '{"error":"API not responding"}')

echo "Respuesta del job de prueba:"
echo "$JOB_RESPONSE" | jq . || echo "$JOB_RESPONSE"

# Extraer job ID si existe
JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId // empty' 2>/dev/null || echo "")

if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
    print_status "OK" "Job de prueba creado: $JOB_ID"
    
    # Esperar un poco y verificar métricas
    sleep 5
    print_status "INFO" "Verificando métricas después del job de prueba..."
    
    if curl -fsS 'http://localhost:9090/api/v1/query?query=storyclip_jobs_created_total' | jq '.data.result | length' | grep -q '[1-9]'; then
        print_status "OK" "Métricas de jobs detectadas en Prometheus"
    else
        print_status "WARN" "Métricas de jobs no detectadas aún"
    fi
else
    print_status "WARN" "No se pudo crear job de prueba"
fi

# 9. Resumen final
echo -e "\n${GREEN}🎉 Smoke Tests Completados${NC}"
echo -e "\n${BLUE}📊 URLs de Verificación:${NC}"
echo "• Backend métricas: http://localhost:3000/api/metrics"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:3001 (admin/admin)"
echo "• Alertmanager: http://localhost:9093"
echo "• cAdvisor: http://localhost:8085"

echo -e "\n${BLUE}🔍 Comandos de Verificación:${NC}"
echo "• Ver targets: curl -fsS 'http://localhost:9090/api/v1/targets' | jq"
echo "• Ver series: curl -fsS 'http://localhost:9090/api/v1/series?match[]=storyclip_*' | jq"
echo "• Ver métricas: curl -fsS http://localhost:3000/api/metrics | head"

print_status "OK" "Smoke tests de observabilidad completados"











