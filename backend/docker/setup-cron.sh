#!/bin/bash
set -euo pipefail

echo "⏰ Configurando Cron Jobs para StoryClip"
echo "======================================"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Crear el cron job para mantenimiento diario
print_status "INFO" "Configurando cron job para mantenimiento diario..."

# Agregar el cron job (mantenimiento a las 4 AM)
(crontab -l 2>/dev/null; echo "0 4 * * * /usr/local/bin/storyclip_daily_maint.sh >> /var/log/storyclip_maint.log 2>&1") | crontab -

print_status "OK" "Cron job configurado para ejecutarse diariamente a las 4:00 AM"

# Verificar que el cron job se agregó correctamente
print_status "INFO" "Cron jobs actuales:"
crontab -l | grep storyclip || echo "No se encontraron cron jobs de StoryClip"

# Crear directorio de logs si no existe
mkdir -p /var/log
touch /var/log/storyclip_maint.log
chmod 644 /var/log/storyclip_maint.log

print_status "OK" "Directorio de logs configurado: /var/log/storyclip_maint.log"

# Verificar que el servicio cron esté corriendo
if systemctl is-active --quiet cron; then
    print_status "OK" "Servicio cron está activo"
else
    print_status "INFO" "Iniciando servicio cron..."
    systemctl start cron
    systemctl enable cron
fi

# Mostrar información sobre el cron job
echo -e "\n${BLUE}📋 Información del Cron Job:${NC}"
echo "• Comando: /usr/local/bin/storyclip_daily_maint.sh"
echo "• Horario: 0 4 * * * (diariamente a las 4:00 AM)"
echo "• Log: /var/log/storyclip_maint.log"
echo "• Estado: $(systemctl is-active cron)"

print_status "OK" "Configuración de cron completada"











