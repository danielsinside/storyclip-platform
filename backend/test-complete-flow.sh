#!/bin/bash

echo "=== TEST COMPLETO DE UPLOAD Y PROCESAMIENTO ==="

# Crear video de prueba
echo "1. Creando video de prueba..."
ffmpeg -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -c:v libx264 -preset ultrafast -y /tmp/test_flow.mp4 2>/dev/null

# Upload
echo "2. Subiendo video..."
UPLOAD_RESPONSE=$(curl -X POST http://localhost:3000/api/videos/upload \
  -F "file=@/tmp/test_flow.mp4" \
  -s)

echo "   Respuesta: $UPLOAD_RESPONSE"

# Extraer uploadId
UPLOAD_ID=$(echo $UPLOAD_RESPONSE | python3 -c "import json,sys; print(json.load(sys.stdin)['uploadId'])")
VIDEO_URL=$(echo $UPLOAD_RESPONSE | python3 -c "import json,sys; print(json.load(sys.stdin)['videoUrl'])")

echo "   Upload ID: $UPLOAD_ID"
echo "   Video URL: $VIDEO_URL"

# Procesar
echo "3. Iniciando procesamiento..."
PROCESS_RESPONSE=$(curl -X POST http://localhost:3000/api/process-video \
  -H "Content-Type: application/json" \
  -d "{\"uploadId\":\"$UPLOAD_ID\",\"mode\":\"auto\",\"clipDuration\":1,\"maxClips\":2}" \
  -s)

echo "   Respuesta: $PROCESS_RESPONSE"

# Extraer jobId
JOB_ID=$(echo $PROCESS_RESPONSE | python3 -c "import json,sys; print(json.load(sys.stdin).get('jobId','NOT_FOUND'))")
echo "   Job ID: $JOB_ID"

if [ "$JOB_ID" != "NOT_FOUND" ]; then
  echo "4. Verificando estado del job..."

  for i in {1..10}; do
    sleep 2
    STATUS_RESPONSE=$(curl -s "http://localhost:3000/api/jobs/$JOB_ID/status")
    STATUS=$(echo $STATUS_RESPONSE | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"Status: {d.get('status','?')} Progress: {d.get('progress','?')}%\")" 2>/dev/null || echo "Error parsing status")
    echo "   Intento $i: $STATUS"

    # Check if done
    if echo $STATUS_RESPONSE | grep -q '"status":"DONE"'; then
      echo "   ✅ Procesamiento completado!"
      break
    fi
    if echo $STATUS_RESPONSE | grep -q '"status":"ERROR"'; then
      echo "   ❌ Error en procesamiento"
      echo "   Detalles: $STATUS_RESPONSE"
      break
    fi
  done
else
  echo "   ❌ No se pudo obtener Job ID"
fi

echo "=== FIN DEL TEST ==="