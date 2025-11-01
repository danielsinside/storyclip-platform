#!/bin/bash
set -euo pipefail

echo "📊 StoryClip Monitoring Dashboard"
echo "================================="

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

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos de Monitoreo:"
    echo "  status           - Estado general del sistema"
    echo "  resources        - Uso de recursos (CPU, RAM, disco)"
    echo "  health           - Health checks detallados"
    echo "  logs             - Logs recientes con filtros"
    echo "  metrics          - Métricas de rendimiento"
    echo "  alerts           - Verificar alertas y problemas"
    echo "  watch            - Monitoreo en tiempo real"
    echo "  help             - Mostrar esta ayuda"
}

# 1. Estado general
monitor_status() {
    echo -e "\n${BLUE}📊 Estado General del Sistema${NC}"
    
    echo -e "\n${BLUE}🐳 Contenedores:${NC}"
    docker compose ps
    
    echo -e "\n${BLUE}🔗 Puertos:${NC}"
    netstat -tlnp | grep :3000 || echo "Puerto 3000 no está en uso"
    
    echo -e "\n${BLUE}📁 Volúmenes:${NC}"
    docker volume ls | grep storyclip || echo "No hay volúmenes de StoryClip"
}

# 2. Recursos del sistema
monitor_resources() {
    echo -e "\n${BLUE}📈 Uso de Recursos${NC}"
    
    echo -e "\n${BLUE}💻 CPU y Memoria (Contenedores):${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    echo -e "\n${BLUE}💾 Espacio en Disco:${NC}"
    df -h /srv/storyclip/ 2>/dev/null || echo "Directorio no accesible"
    
    echo -e "\n${BLUE}🧠 Memoria del Sistema:${NC}"
    free -h
    
    echo -e "\n${BLUE}⚡ Carga del Sistema:${NC}"
    uptime
}

# 3. Health checks detallados
monitor_health() {
    echo -e "\n${BLUE}🏥 Health Checks Detallados${NC}"
    
    echo -e "\n${BLUE}🔗 API Health:${NC}"
    if curl -fsS http://localhost:3000/api/health | jq .; then
        print_status "OK" "API Health Check passed"
    else
        print_status "ERROR" "API Health Check failed"
    fi
    
    echo -e "\n${BLUE}🔧 API Capabilities:${NC}"
    if curl -fsS http://localhost:3000/api/capabilities | jq .; then
        print_status "OK" "API Capabilities working"
    else
        print_status "ERROR" "API Capabilities failed"
    fi
    
    echo -e "\n${BLUE}🎬 FFmpeg Health:${NC}"
    if docker exec -it storyclip ffmpeg -version | head -1; then
        print_status "OK" "FFmpeg working in backend"
    else
        print_status "ERROR" "FFmpeg not working in backend"
    fi
    
    if docker exec -it ffmpeg-runner ffmpeg -version | head -1; then
        print_status "OK" "FFmpeg working in runner"
    else
        print_status "ERROR" "FFmpeg not working in runner"
    fi
}

# 4. Logs con filtros
monitor_logs() {
    echo -e "\n${BLUE}📋 Logs Recientes${NC}"
    
    echo -e "\n${BLUE}📝 Logs del Backend (últimas 20 líneas):${NC}"
    docker compose logs storyclip --tail=20
    
    echo -e "\n${BLUE}🎬 Logs del FFmpeg Runner:${NC}"
    docker compose logs ffmpeg-runner --tail=10
    
    echo -e "\n${BLUE}🚨 Errores Recientes:${NC}"
    docker compose logs --tail=100 | grep -i error || echo "No hay errores recientes"
    
    echo -e "\n${BLUE}⚠️  Warnings Recientes:${NC}"
    docker compose logs --tail=100 | grep -i warn || echo "No hay warnings recientes"
}

# 5. Métricas de rendimiento
monitor_metrics() {
    echo -e "\n${BLUE}📊 Métricas de Rendimiento${NC}"
    
    echo -e "\n${BLUE}🎯 Jobs Procesados (últimas 24h):${NC}"
    # Aquí podrías agregar métricas de tu base de datos o logs
    echo "• Jobs creados: $(grep -c 'job created' /srv/storyclip/logs/*.log 2>/dev/null || echo '0')"
    echo "• Jobs completados: $(grep -c 'job completed' /srv/storyclip/logs/*.log 2>/dev/null || echo '0')"
    echo "• Jobs fallidos: $(grep -c 'job failed' /srv/storyclip/logs/*.log 2>/dev/null || echo '0')"
    
    echo -e "\n${BLUE}⏱️  Tiempos de Procesamiento:${NC}"
    echo "• H.264 promedio: ~2.2s (benchmark)"
    echo "• HEVC promedio: ~9.9s (benchmark)"
    echo "• AV1-SVT promedio: ~10.0s (benchmark)"
    
    echo -e "\n${BLUE}📈 Throughput Estimado:${NC}"
    echo "• H.264: ~4.4 videos/minuto"
    echo "• HEVC/AV1: ~1 video/minuto"
}

# 6. Alertas y problemas
monitor_alerts() {
    echo -e "\n${BLUE}🚨 Verificación de Alertas${NC}"
    
    # Verificar contenedores caídos
    if docker compose ps | grep -q "Exited"; then
        print_status "ERROR" "Hay contenedores caídos"
        docker compose ps | grep "Exited"
    else
        print_status "OK" "Todos los contenedores están corriendo"
    fi
    
    # Verificar uso alto de CPU
    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" storyclip | sed 's/%//')
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        print_status "WARN" "CPU usage alto: ${CPU_USAGE}%"
    else
        print_status "OK" "CPU usage normal: ${CPU_USAGE}%"
    fi
    
    # Verificar espacio en disco
    DISK_USAGE=$(df /srv/storyclip | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 80 ]; then
        print_status "WARN" "Espacio en disco alto: ${DISK_USAGE}%"
    else
        print_status "OK" "Espacio en disco normal: ${DISK_USAGE}%"
    fi
    
    # Verificar SVT-AV1
    if docker exec -it storyclip ffmpeg -hide_banner -codecs | grep -qi 'libsvtav1'; then
        print_status "OK" "SVT-AV1 disponible"
    else
        print_status "ERROR" "SVT-AV1 no detectado"
    fi
}

# 7. Monitoreo en tiempo real
monitor_watch() {
    echo -e "\n${BLUE}👀 Monitoreo en Tiempo Real${NC}"
    echo "Presiona Ctrl+C para salir"
    echo ""
    
    while true; do
        clear
        echo "📊 StoryClip Live Monitor - $(date)"
        echo "=================================="
        
        # Estado de contenedores
        echo -e "\n🐳 Contenedores:"
        docker compose ps
        
        # Recursos
        echo -e "\n📈 Recursos:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
        
        # Health check
        echo -e "\n🏥 Health:"
        if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
            echo "✅ API OK"
        else
            echo "❌ API FAIL"
        fi
        
        sleep 5
    done
}

# Procesar argumentos
case "${1:-}" in
    status)
        monitor_status
        ;;
    resources)
        monitor_resources
        ;;
    health)
        monitor_health
        ;;
    logs)
        monitor_logs
        ;;
    metrics)
        monitor_metrics
        ;;
    alerts)
        monitor_alerts
        ;;
    watch)
        monitor_watch
        ;;
    help)
        show_help
        ;;
    "")
        print_status "ERROR" "Comando requerido"
        show_help
        exit 1
        ;;
    *)
        print_status "ERROR" "Comando desconocido: $1"
        show_help
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 Monitoreo completado${NC}"











