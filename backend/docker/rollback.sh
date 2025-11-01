#!/bin/bash
set -euo pipefail

echo "🔄 StoryClip Rollback Script"
echo "============================"

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
    echo "Uso: $0 [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  --tag TAG        Rollback a una versión específica (ej: v1.0.0)"
    echo "  --previous       Rollback a la versión anterior"
    echo "  --list           Listar versiones disponibles"
    echo "  --help           Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 --tag v1.0.0"
    echo "  $0 --previous"
    echo "  $0 --list"
}

# Función para listar versiones disponibles
list_versions() {
    echo -e "${BLUE}📋 Versiones disponibles:${NC}"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep storyclip || echo "No hay imágenes de StoryClip disponibles"
}

# Función para rollback a versión específica
rollback_to_tag() {
    local tag=$1
    echo -e "${BLUE}🔄 Rolling back to tag: $tag${NC}"
    
    # Verificar que la imagen existe
    if ! docker images | grep -q "storyclip.*$tag"; then
        print_status "ERROR" "Tag $tag no encontrado"
        echo "Usa --list para ver versiones disponibles"
        exit 1
    fi
    
    # Parar servicios actuales
    print_status "INFO" "Stopping current services..."
    docker compose down
    
    # Actualizar docker-compose.yml con el tag específico
    sed -i "s|image: storyclip/backend:.*|image: storyclip/backend:$tag|g" docker-compose.yml
    sed -i "s|image: storyclip/ffmpeg:.*|image: storyclip/ffmpeg:$tag|g" docker-compose.yml
    
    # Levantar con la versión específica
    print_status "INFO" "Starting services with tag $tag..."
    docker compose up -d
    
    # Verificar que los servicios estén funcionando
    sleep 10
    if docker compose ps | grep -q "Up"; then
        print_status "OK" "Rollback completado exitosamente"
    else
        print_status "ERROR" "Rollback falló"
        exit 1
    fi
}

# Función para rollback a versión anterior
rollback_previous() {
    echo -e "${BLUE}🔄 Rolling back to previous version...${NC}"
    
    # Obtener la versión anterior (asumiendo que usamos tags semánticos)
    local current_tag=$(docker images --format "{{.Tag}}" storyclip/backend | head -1)
    echo "Current tag: $current_tag"
    
    # Aquí podrías implementar lógica para encontrar la versión anterior
    # Por ahora, simplemente hacemos rollback a 'latest'
    rollback_to_tag "latest"
}

# Procesar argumentos
case "${1:-}" in
    --tag)
        if [ -z "${2:-}" ]; then
            print_status "ERROR" "Tag requerido"
            show_help
            exit 1
        fi
        rollback_to_tag "$2"
        ;;
    --previous)
        rollback_previous
        ;;
    --list)
        list_versions
        ;;
    --help)
        show_help
        ;;
    "")
        print_status "ERROR" "Opción requerida"
        show_help
        exit 1
        ;;
    *)
        print_status "ERROR" "Opción desconocida: $1"
        show_help
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 Rollback process completed!${NC}"
echo -e "\n${BLUE}📊 Current Status:${NC}"
docker compose ps











