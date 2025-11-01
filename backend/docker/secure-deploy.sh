#!/bin/bash
set -euo pipefail

echo "🔒 Deploy seguro de StoryClip en producción..."

# 1. Verificar que no hay endpoint dev activo
if [ "$NODE_ENV" = "production" ]; then
    echo "✅ Producción detectada - endpoint dev deshabilitado"
    export ENABLE_DEV_METRICS=0
else
    echo "⚠️  Desarrollo detectado - endpoint dev habilitado"
    export ENABLE_DEV_METRICS=1
fi

# 2. Verificar que Slack webhook está configurado
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
    echo "❌ Error: SLACK_WEBHOOK_URL no configurado"
    exit 1
fi

# 3. Rotar token dev si es necesario
if [ "$NODE_ENV" = "production" ]; then
    NEW_TOKEN="prod-token-$(date +%s)"
    echo "{\"token\":\"$NEW_TOKEN\",\"svt_av1_available\":null,\"queue_depth\":null}" > config/dev-metrics.json
    echo "✅ Token dev rotado para producción"
fi

# 4. Verificar espacio en disco
DISK_USAGE=$(df -h /srv/storyclip/data | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️  Uso de disco alto: ${DISK_USAGE}%"
    echo "Considera limpiar archivos antiguos o aumentar espacio"
fi

echo "🚀 Deploy seguro completado"
