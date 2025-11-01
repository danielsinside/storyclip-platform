#!/bin/bash
set -euo pipefail

echo "🚨 StoryClip Emergency Runbook"
echo "=============================="

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
    echo "Comandos de Emergencia:"
    echo "  container-down    - Contenedor caído"
    echo "  health-red        - Health check rojo"
    echo "  ffmpeg-missing    - FFmpeg/SVT-AV1 no detectado"
    echo "  rollback-now      - Rollback inmediato"
    echo "  full-restart      - Reinicio completo"
    echo "  diagnose          - Diagnóstico completo"
    echo "  help              - Mostrar esta ayuda"
}

# 1. Contenedor caído
fix_container_down() {
    echo -e "\n${BLUE}🔧 Solucionando: Contenedor caído${NC}"
    
    print_status "INFO" "Verificando estado de contenedores..."
    docker compose ps
    
    print_status "INFO" "Revisando logs del contenedor..."
    docker compose logs storyclip --tail=200
    
    print_status "INFO" "Reiniciando contenedor..."
    docker compose restart storyclip
    
    sleep 10
    
    if docker compose ps | grep -q "Up"; then
        print_status "OK" "Contenedor reiniciado exitosamente"
    else
        print_status "ERROR" "No se pudo reiniciar el contenedor"
        print_status "INFO" "Intentando rebuild completo..."
        docker compose down
        docker compose build --no-cache
        docker compose up -d
    fi
}

# 2. Health check rojo
fix_health_red() {
    echo -e "\n${BLUE}🔧 Solucionando: Health check rojo${NC}"
    
    print_status "INFO" "Verificando health de la API..."
    curl -fsS http://localhost:3000/api/health | jq . || echo "Health check falló"
    
    print_status "INFO" "Verificando capabilities..."
    curl -fsS http://localhost:3000/api/capabilities | jq . || echo "Capabilities falló"
    
    print_status "INFO" "Revisando logs de la aplicación..."
    docker compose logs storyclip --tail=100
    
    print_status "INFO" "Verificando si PM2 está corriendo..."
    docker exec -it storyclip pm2 status || echo "PM2 no está corriendo"
    
    print_status "INFO" "Revisando logs de server.js..."
    docker exec -it storyclip cat /srv/storyclip/logs/server.log 2>/dev/null || echo "No hay logs de server.js"
    
    print_status "INFO" "Reiniciando aplicación..."
    docker compose restart storyclip
}

# 3. FFmpeg/SVT-AV1 no detectado
fix_ffmpeg_missing() {
    echo -e "\n${BLUE}🔧 Solucionando: FFmpeg/SVT-AV1 no detectado${NC}"
    
    print_status "INFO" "Verificando FFmpeg en backend..."
    docker exec -it storyclip ffmpeg -hide_banner -codecs | grep -i svtav1 || echo "SVT-AV1 no detectado en backend"
    
    print_status "INFO" "Verificando FFmpeg en runner..."
    docker exec -it ffmpeg-runner ffmpeg -hide_banner -codecs | grep -i svtav1 || echo "SVT-AV1 no detectado en runner"
    
    print_status "INFO" "Reconstruyendo imágenes..."
    docker compose down
    docker compose build --no-cache
    docker compose up -d
    
    sleep 15
    
    print_status "INFO" "Verificando después del rebuild..."
    docker exec -it storyclip ffmpeg -hide_banner -codecs | grep -i svtav1 && print_status "OK" "SVT-AV1 detectado" || print_status "ERROR" "SVT-AV1 aún no detectado"
}

# 4. Rollback inmediato
rollback_immediate() {
    echo -e "\n${BLUE}🔧 Ejecutando: Rollback inmediato${NC}"
    
    print_status "INFO" "Ejecutando rollback a versión anterior..."
    ./rollback.sh --previous
    
    sleep 10
    
    print_status "INFO" "Verificando estado después del rollback..."
    docker compose ps
}

# 5. Reinicio completo
full_restart() {
    echo -e "\n${BLUE}🔧 Ejecutando: Reinicio completo${NC}"
    
    print_status "INFO" "Parando todos los servicios..."
    docker compose down
    
    print_status "INFO" "Limpiando contenedores huérfanos..."
    docker system prune -f
    
    print_status "INFO" "Reiniciando servicios..."
    docker compose up -d
    
    sleep 15
    
    print_status "INFO" "Verificando estado final..."
    docker compose ps
}

# 6. Diagnóstico completo
full_diagnose() {
    echo -e "\n${BLUE}🔍 Diagnóstico Completo${NC}"
    
    echo -e "\n${BLUE}📊 Estado de Contenedores:${NC}"
    docker compose ps
    
    echo -e "\n${BLUE}📋 Logs Recientes:${NC}"
    docker compose logs --tail=50
    
    echo -e "\n${BLUE}🏥 Health Checks:${NC}"
    curl -fsS http://localhost:3000/api/health | jq . || echo "Health check falló"
    
    echo -e "\n${BLUE}🔧 Capacidades:${NC}"
    curl -fsS http://localhost:3000/api/capabilities | jq . || echo "Capabilities falló"
    
    echo -e "\n${BLUE}🎬 FFmpeg Backend:${NC}"
    docker exec -it storyclip ffmpeg -version | head -4
    
    echo -e "\n${BLUE}🎯 FFmpeg Runner:${NC}"
    docker exec -it ffmpeg-runner ffmpeg -version | head -4
    
    echo -e "\n${BLUE}📈 Recursos:${NC}"
    docker stats --no-stream
    
    echo -e "\n${BLUE}💾 Espacio en Disco:${NC}"
    df -h /srv/storyclip/
    
    echo -e "\n${BLUE}🔗 Conexiones de Red:${NC}"
    netstat -tlnp | grep :3000 || echo "Puerto 3000 no está en uso"
}

# Procesar argumentos
case "${1:-}" in
    container-down)
        fix_container_down
        ;;
    health-red)
        fix_health_red
        ;;
    ffmpeg-missing)
        fix_ffmpeg_missing
        ;;
    rollback-now)
        rollback_immediate
        ;;
    full-restart)
        full_restart
        ;;
    diagnose)
        full_diagnose
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

echo -e "\n${GREEN}🎉 Proceso de emergencia completado${NC}"











