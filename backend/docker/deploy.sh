#!/bin/bash
set -euo pipefail

echo "🚀 StoryClip Docker Deployment Script"
echo "======================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con colores
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

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    print_status "ERROR" "Docker no está instalado"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    print_status "ERROR" "Docker Compose no está instalado"
    exit 1
fi

print_status "OK" "Docker y Docker Compose disponibles"

# Crear directorios necesarios
mkdir -p /srv/storyclip/data
mkdir -p /srv/storyclip/logs
print_status "OK" "Directorios de datos creados"

# Build de las imágenes
echo -e "\n${BLUE}🔨 Building Docker images...${NC}"
cd /srv/storyclip/docker

# Build sin cache para asegurar build limpio
docker compose build --no-cache

print_status "OK" "Imágenes construidas exitosamente"

# Levantar los servicios
echo -e "\n${BLUE}🚀 Starting services...${NC}"
docker compose up -d

print_status "OK" "Servicios iniciados"

# Esperar a que los servicios estén listos
echo -e "\n${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Verificar health checks
echo -e "\n${BLUE}🏥 Checking service health...${NC}"

# Verificar StoryClip backend
if docker compose ps storyclip | grep -q "healthy"; then
    print_status "OK" "StoryClip backend is healthy"
else
    print_status "WARN" "StoryClip backend health check failed"
fi

# Verificar FFmpeg runner
if docker compose ps ffmpeg-runner | grep -q "healthy"; then
    print_status "OK" "FFmpeg runner is healthy"
else
    print_status "WARN" "FFmpeg runner health check failed"
fi

# Pruebas rápidas
echo -e "\n${BLUE}🧪 Running quick tests...${NC}"

# Test FFmpeg version
echo "FFmpeg version:"
docker exec ffmpeg-runner ffmpeg -version | sed -n '1,4p'

# Test codecs
echo -e "\nCodecs disponibles:"
docker exec ffmpeg-runner ffmpeg -hide_banner -codecs | egrep -i 'libx264|libx265|libaom|svtav1|dav1d' || true

# Test API capabilities
echo -e "\nAPI capabilities:"
if curl -fsS http://localhost:3000/api/capabilities | jq .; then
    print_status "OK" "API capabilities endpoint working"
else
    print_status "WARN" "API capabilities endpoint not responding"
fi

# Mostrar logs
echo -e "\n${BLUE}📋 Service logs:${NC}"
docker compose logs --tail=20

# Mostrar status final
echo -e "\n${GREEN}🎉 Deployment completed!${NC}"
echo -e "\n${BLUE}📊 Service Status:${NC}"
docker compose ps

echo -e "\n${BLUE}🔗 Access URLs:${NC}"
echo "• Backend API: http://localhost:3000"
echo "• Health Check: http://localhost:3000/api/health"
echo "• Capabilities: http://localhost:3000/api/capabilities"

echo -e "\n${BLUE}🛠️  Management Commands:${NC}"
echo "• View logs: docker compose logs -f"
echo "• Stop services: docker compose down"
echo "• Restart: docker compose restart"
echo "• Update: docker compose pull && docker compose up -d"











