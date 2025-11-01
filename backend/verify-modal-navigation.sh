#!/bin/bash

# Script para verificar el flujo de navegación del modal de IA

echo "======================================================"
echo "🔍 VERIFICACIÓN DE NAVEGACIÓN Y MODAL DE IA"
echo "======================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Función para verificar archivos
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $description existe${NC}"
        return 0
    else
        echo -e "${RED}❌ $description NO existe${NC}"
        return 1
    fi
}

# Función para verificar contenido
check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}  ✓ $description${NC}"
        return 0
    else
        echo -e "${RED}  ✗ $description${NC}"
        return 1
    fi
}

echo -e "${BLUE}📦 VERIFICANDO COMPONENTES...${NC}"
echo ""

# Verificar AISuggestionsModal
echo "1. AISuggestionsModal.tsx:"
MODAL_FILE="/srv/frontend/src/components/AISuggestionsModal.tsx"
if check_file "$MODAL_FILE" "AISuggestionsModal.tsx"; then
    check_content "$MODAL_FILE" "onApplySuggestion" "Handler para aplicar sugerencia"
    check_content "$MODAL_FILE" "onCloseToManual" "Prop para ir a configuración manual"
    check_content "$MODAL_FILE" "Procesar con esta configuración" "Botón de procesar directo"
    check_content "$MODAL_FILE" "Configurar manualmente" "Botón de configurar manual"
    check_content "$MODAL_FILE" "Analizando tu video con IA" "Animación de análisis"
fi
echo ""

# Verificar Preset.tsx
echo "2. Preset.tsx:"
PRESET_FILE="/srv/frontend/src/pages/Preset.tsx"
if check_file "$PRESET_FILE" "Preset.tsx"; then
    check_content "$PRESET_FILE" "showAIModal" "Estado showAIModal"
    check_content "$PRESET_FILE" "location.state?.showModal" "Detección de state.showModal"
    check_content "$PRESET_FILE" "handleApplyAISuggestion" "Handler de sugerencias IA"
    check_content "$PRESET_FILE" "AISuggestionsModal" "Importación del modal"
fi
echo ""

# Verificar Manual.tsx
echo "3. Manual.tsx:"
MANUAL_FILE="/srv/frontend/src/pages/Manual.tsx"
if check_file "$MANUAL_FILE" "Manual.tsx"; then
    check_content "$MANUAL_FILE" "showModal: true" "Botón Volver con showModal: true"
    check_content "$MANUAL_FILE" "navigate.*preset.*uploadId" "Navegación a preset con uploadId"
    check_content "$MANUAL_FILE" "Volver a sugerencias" "Texto del botón volver"
fi
echo ""

echo "======================================================"
echo -e "${BLUE}🌐 FLUJO DE NAVEGACIÓN ESPERADO:${NC}"
echo "======================================================"
echo ""

echo -e "${YELLOW}1. Upload de Video:${NC}"
echo "   → Usuario sube video en /"
echo "   → Redirección automática a /preset/{uploadId}"
echo ""

echo -e "${YELLOW}2. Modal de IA (automático):${NC}"
echo "   → Modal aparece automáticamente (500ms delay)"
echo "   → Animación de análisis (2.5 segundos)"
echo "   → Muestra 4 sugerencias predefinidas"
echo ""

echo -e "${YELLOW}3. Opciones del Modal:${NC}"
echo "   A) 'Procesar con esta configuración':"
echo "      → Procesa directamente con preset seleccionado"
echo "      → Redirección a /process/{jobId}"
echo ""
echo "   B) 'Configurar manualmente':"
echo "      → Navegación a /manual/{uploadId}"
echo "      → Permite configuración personalizada"
echo ""

echo -e "${YELLOW}4. Desde Configuración Manual:${NC}"
echo "   → Botón 'Volver a sugerencias':"
echo "      → Navega a /preset/{uploadId}"
echo "      → Pasa state.showModal = true"
echo "      → Modal de IA se reabre automáticamente"
echo ""

echo "======================================================"
echo -e "${BLUE}📊 RESUMEN DE ESTADO:${NC}"
echo "======================================================"
echo ""

# Verificar compilación
echo -e "${YELLOW}Build de Producción:${NC}"
if [ -d "/srv/frontend/dist" ]; then
    echo -e "${GREEN}✅ Directorio dist/ existe${NC}"
    LATEST_BUILD=$(find /srv/frontend/dist -name "*.js" -type f -exec stat -c '%Y' {} \; | sort -nr | head -1)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LATEST_BUILD))
    if [ $TIME_DIFF -lt 3600 ]; then
        echo -e "${GREEN}✅ Build reciente (hace menos de 1 hora)${NC}"
    else
        echo -e "${YELLOW}⚠️  Build antiguo (hace más de 1 hora)${NC}"
    fi
else
    echo -e "${RED}❌ Directorio dist/ NO existe${NC}"
fi
echo ""

# Verificar servidor
echo -e "${YELLOW}Estado del Servidor:${NC}"
if pm2 status 2>/dev/null | grep -q "storyclip-backend"; then
    echo -e "${GREEN}✅ Backend ejecutándose en PM2${NC}"
else
    echo -e "${RED}❌ Backend NO está ejecutándose${NC}"
fi

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx activo${NC}"
else
    echo -e "${RED}❌ Nginx NO activo${NC}"
fi
echo ""

echo "======================================================"
echo -e "${BLUE}🧪 URLs PARA PROBAR:${NC}"
echo "======================================================"
echo ""
echo "1. Página principal:"
echo "   https://story.creatorsflow.app"
echo ""
echo "2. Con upload existente (ejemplo):"
echo "   https://story.creatorsflow.app/preset/test-id"
echo ""
echo "3. Manual (ejemplo):"
echo "   https://story.creatorsflow.app/manual/test-id"
echo ""

echo "======================================================"
echo -e "${BLUE}📝 NOTAS IMPORTANTES:${NC}"
echo "======================================================"
echo ""
echo "• El modal aparece automáticamente 500ms después de cargar /preset"
echo "• Si no aparece, limpiar caché del navegador (Ctrl+Shift+R)"
echo "• El estado se preserva usando React Router location.state"
echo "• Las sugerencias están hardcodeadas (no requieren IA real)"
echo ""

echo -e "${GREEN}✨ Verificación completada${NC}"