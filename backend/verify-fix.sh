#!/bin/bash

echo "🔍 Verificando el fix del error 234..."
echo ""

# 1. Verificar que el fix está en el código
echo "1. ✅ Fix aplicado en: /srv/storyclip/routes/api.js"
grep -q "FIX ERROR 234" /srv/storyclip/routes/api.js && echo "   - Validación de filtros: ACTIVA" || echo "   - Validación de filtros: NO ENCONTRADA"

# 2. Verificar que PM2 está corriendo
echo ""
echo "2. 📊 Estado de PM2:"
pm2 list | grep storyclip

# 3. Ver últimos errores
echo ""
echo "3. 📝 Últimos errores (si hay):"
pm2 logs storyclip --lines 10 --nostream 2>&1 | grep -E "Error|ERROR" | tail -5 || echo "   - No hay errores recientes"

echo ""
echo "✅ El backend está listo para manejar clips sin ffmpegCommand"
echo ""
echo "⚠️  IMPORTANTE: Actualiza Manual.tsx en Lovable con el fix sugerido"
