#!/bin/bash

echo "=== TEST DE VELOCIDAD DE UPLOAD ==="

# Crear archivos de prueba de diferentes tamaños
echo "Creando archivos de prueba..."
dd if=/dev/urandom of=/tmp/test_1mb.mp4 bs=1M count=1 2>/dev/null
dd if=/dev/urandom of=/tmp/test_10mb.mp4 bs=1M count=10 2>/dev/null
dd if=/dev/urandom of=/tmp/test_50mb.mp4 bs=1M count=50 2>/dev/null

# Función para medir velocidad de upload
test_upload() {
    local FILE=$1
    local SIZE=$2

    echo -e "\n📊 Probando upload de $SIZE..."

    START=$(date +%s%N)

    RESPONSE=$(curl -X POST http://localhost:3000/api/videos/upload \
        -F "file=@$FILE" \
        -w "\n%{time_total}s %{speed_upload} bytes/sec" \
        -s -o /tmp/upload_response.json)

    END=$(date +%s%N)
    DURATION=$((($END - $START) / 1000000))

    # Extraer velocidad
    SPEED=$(echo $RESPONSE | awk '{print $2}')
    TIME=$(echo $RESPONSE | awk '{print $1}')

    # Convertir a MB/s
    SPEED_MB=$(echo "scale=2; $SPEED / 1048576" | bc 2>/dev/null || echo "N/A")

    echo "  ⏱️  Tiempo: ${TIME}"
    echo "  🚀 Velocidad: ${SPEED_MB} MB/s"
    echo "  📈 Duración total: ${DURATION}ms"

    # Verificar respuesta
    if [ -f /tmp/upload_response.json ]; then
        SUCCESS=$(grep -o '"success":true' /tmp/upload_response.json)
        if [ "$SUCCESS" ]; then
            echo "  ✅ Upload exitoso"
        else
            echo "  ❌ Upload falló"
            cat /tmp/upload_response.json
        fi
    fi
}

# Ejecutar pruebas
test_upload "/tmp/test_1mb.mp4" "1MB"
test_upload "/tmp/test_10mb.mp4" "10MB"
test_upload "/tmp/test_50mb.mp4" "50MB"

# Limpiar
rm -f /tmp/test_*.mp4 /tmp/upload_response.json

echo -e "\n=== OPTIMIZACIONES APLICADAS ==="
echo "✅ Nginx client_body_buffer_size: 10M (antes 512k)"
echo "✅ Nginx proxy_request_buffering: off (streaming directo)"
echo "✅ Nginx proxy buffers optimizados"
echo "✅ Directorio temporal dedicado: /tmp/nginx_uploads"
echo ""
echo "Estas optimizaciones deberían mejorar significativamente"
echo "la velocidad de upload para archivos grandes."