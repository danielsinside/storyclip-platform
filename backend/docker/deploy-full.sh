#!/bin/bash
set -euo pipefail

echo "🚀 Desplegando StoryClip Completo (Backend + Observabilidad)"
echo "============================================================"

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

# 1. Desplegar backend principal
print_status "INFO" "Desplegando backend principal..."
./deploy.sh

# 2. Esperar a que el backend esté listo
print_status "INFO" "Esperando a que el backend esté listo..."
sleep 10

# 3. Verificar que el backend esté funcionando
if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
    print_status "OK" "Backend principal funcionando"
else
    print_status "ERROR" "Backend principal no está funcionando"
    exit 1
fi

# 4. Desplegar stack de observabilidad
print_status "INFO" "Desplegando stack de observabilidad..."
./deploy-observability.sh

# 5. Ejecutar smoke tests
print_status "INFO" "Ejecutando smoke tests..."
./test-observability.sh

# 6. Resumen final
echo -e "\n${GREEN}🎉 Despliegue Completo Exitoso${NC}"
echo -e "\n${BLUE}📊 URLs de Acceso:${NC}"
echo "• Backend API: http://localhost:3000"
echo "• Backend Health: http://localhost:3000/api/health"
echo "• Backend Metrics: http://localhost:3000/api/metrics"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:3001 (admin/admin)"
echo "• Alertmanager: http://localhost:9093"
echo "• cAdvisor: http://localhost:8085"

echo -e "\n${BLUE}🔍 Comandos de Monitoreo:${NC}"
echo "• Estado general: docker compose ps"
echo "• Logs backend: docker compose logs -f storyclip"
echo "• Logs observabilidad: docker compose -f docker-compose.observability.yml logs -f"
echo "• Validación: ./validate.sh"
echo "• Monitoreo: ./monitor.sh watch"

print_status "OK" "Despliegue completo finalizado exitosamente"











