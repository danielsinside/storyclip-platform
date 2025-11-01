#!/bin/bash

echo "🧪 Testing API metadata response..."
echo ""

# Crear un job de prueba usando el servicio directamente
JOB_ID=$(node -e "
const jobManager = require('./services/job-manager.service');
const testMetadata = {
  totalClips: 50,
  clips: Array.from({ length: 50 }, (_, i) => ({
    id: \`clip_\${String(i + 1).padStart(3, '0')}\`,
    filename: \`clip_\${String(i + 1).padStart(3, '0')}.mp4\`
  }))
};
const job = jobManager.createJob({ test: 'data' });
jobManager.completeJob(job.id, '/test/clip_001.mp4', null, null, testMetadata, testMetadata.clips);
console.log(job.id);
")

echo "✅ Created test job: $JOB_ID"
echo ""

# Consultar el API
echo "📡 Calling API: GET /api/jobs/$JOB_ID/status"
echo ""

RESPONSE=$(curl -s "http://localhost:3000/api/jobs/$JOB_ID/status")

echo "📋 API Response:"
echo "$RESPONSE" | python3 -m json.tool

# Verificar que contiene metadata
HAS_METADATA=$(echo "$RESPONSE" | grep -c "metadata")
CLIPS_COUNT=$(echo "$RESPONSE" | grep -o '"totalClips":[0-9]*' | grep -o '[0-9]*')

echo ""
if [ "$HAS_METADATA" -gt 0 ] && [ "$CLIPS_COUNT" = "50" ]; then
  echo "✅ SUCCESS: API response includes metadata with $CLIPS_COUNT clips!"
  echo "   Frontend will now show all clips immediately"
else
  echo "❌ FAILED: API response missing metadata"
  echo "   Has metadata: $HAS_METADATA"
  echo "   Clips count: $CLIPS_COUNT"
fi
