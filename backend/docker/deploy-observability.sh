#!/bin/bash
set -euo pipefail

echo "📊 Desplegando Stack de Observabilidad StoryClip"
echo "==============================================="

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

# 1. Verificar que el backend esté corriendo
print_status "INFO" "Verificando que el backend esté corriendo..."
if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
    print_status "OK" "Backend está corriendo"
else
    print_status "ERROR" "Backend no está corriendo. Inicia primero el backend con ./deploy.sh"
    exit 1
fi

# 2. Verificar que /api/metrics esté disponible
print_status "INFO" "Verificando endpoint de métricas..."
if curl -fsS http://localhost:3000/api/metrics | head -5 >/dev/null 2>&1; then
    print_status "OK" "Endpoint /api/metrics disponible"
else
    print_status "WARN" "Endpoint /api/metrics no disponible. Verificando implementación..."
fi

# 3. Crear directorios necesarios
print_status "INFO" "Creando directorios de observabilidad..."
mkdir -p /srv/storyclip/docker/observability/{grafana/{datasources,dashboards/json},prometheus,alertmanager}

# 4. Desplegar stack de observabilidad
print_status "INFO" "Desplegando stack de observabilidad..."
cd /srv/storyclip/docker

# Detener servicios existentes si los hay
docker compose -f docker-compose.observability.yml down 2>/dev/null || true

# Levantar servicios de observabilidad
docker compose -f docker-compose.observability.yml up -d

# 5. Esperar a que los servicios estén listos
print_status "INFO" "Esperando a que los servicios estén listos..."
sleep 15

# 6. Verificar estado de servicios
print_status "INFO" "Verificando estado de servicios..."
docker compose -f docker-compose.observability.yml ps

# 7. Verificar endpoints
print_status "INFO" "Verificando endpoints de observabilidad..."

# Prometheus
if curl -fsS http://localhost:9090/-/healthy >/dev/null 2>&1; then
    print_status "OK" "Prometheus: http://localhost:9090"
else
    print_status "WARN" "Prometheus no responde en puerto 9090"
fi

# Grafana
if curl -fsS http://localhost:3001/api/health >/dev/null 2>&1; then
    print_status "OK" "Grafana: http://localhost:3001 (admin/admin)"
else
    print_status "WARN" "Grafana no responde en puerto 3001"
fi

# Alertmanager
if curl -fsS http://localhost:9093/-/healthy >/dev/null 2>&1; then
    print_status "OK" "Alertmanager: http://localhost:9093"
else
    print_status "WARN" "Alertmanager no responde en puerto 9093"
fi

# cAdvisor
if curl -fsS http://localhost:8085/healthz >/dev/null 2>&1; then
    print_status "OK" "cAdvisor: http://localhost:8085"
else
    print_status "WARN" "cAdvisor no responde en puerto 8085"
fi

# 8. Verificar que Prometheus esté scrapeando métricas
print_status "INFO" "Verificando que Prometheus esté scrapeando métricas..."
sleep 10

if curl -fsS 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job=="storyclip-backend")' >/dev/null 2>&1; then
    print_status "OK" "Prometheus está scrapeando el backend"
else
    print_status "WARN" "Prometheus no está scrapeando el backend correctamente"
fi

# 9. Verificar métricas específicas
print_status "INFO" "Verificando métricas de StoryClip..."
if curl -fsS 'http://localhost:9090/api/v1/series?match[]=storyclip_jobs_created_total' | jq '.data | length' | grep -q '[1-9]'; then
    print_status "OK" "Métricas de StoryClip detectadas en Prometheus"
else
    print_status "WARN" "Métricas de StoryClip no detectadas. Ejecuta algunos jobs para generar métricas."
fi

# 10. Resumen final
echo -e "\n${GREEN}🎉 Stack de Observabilidad Desplegado${NC}"
echo -e "\n${BLUE}📊 URLs de Acceso:${NC}"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:3001 (admin/admin)"
echo "• Alertmanager: http://localhost:9093"
echo "• cAdvisor: http://localhost:8085"
echo "• Node Exporter: http://localhost:9100"

echo -e "\n${BLUE}🔍 Verificaciones:${NC}"
echo "• Backend métricas: http://localhost:3000/api/metrics"
echo "• Prometheus targets: http://localhost:9090/targets"
echo "• Grafana dashboards: http://localhost:3001/dashboards"

echo -e "\n${BLUE}📋 Próximos Pasos:${NC}"
echo "1. Abre Grafana en http://localhost:3001"
echo "2. Login con admin/admin"
echo "3. Ve al dashboard 'StoryClip – Overview'"
echo "4. Ejecuta algunos jobs para ver métricas en tiempo real"

print_status "OK" "Stack de observabilidad desplegado exitosamente"











