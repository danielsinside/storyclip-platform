const http = require('http');
const { initJob, updateJob, getJob } = require('./utils/jobs');

// Crear job usando el STORE CORRECTO que usa robust-routes
const jobId = `upl_${Date.now()}_test123`;

const testMetadata = {
  totalClips: 50,
  clips: Array.from({ length: 50 }, (_, i) => ({ id: `clip_${i+1}`, filename: `clip_${i+1}.mp4` }))
};

// Inicializar job
initJob(jobId, testMetadata);

// Actualizar como completado
updateJob(jobId, {
  status: 'done',
  progress: 100,
  outputUrl: '/test/clip_001.mp4',
  metadata: testMetadata,
  outputs: testMetadata.clips,
  message: 'Test completado con 50 clips'
});

console.log('✅ Created job in correct store:', jobId);
console.log('');

// Verificar que esté en el store
const storedJob = getJob(jobId);
console.log('📦 Stored job:');
console.log('   Status:', storedJob.status);
console.log('   Has metadata:', !!storedJob.metadata);
console.log('   Total clips in metadata:', storedJob.metadata?.totalClips);
console.log('');

// Consultar API
const req = http.get(`http://localhost:3000/api/jobs/${jobId}/status`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('📡 API Response:');
    console.log('   Status:', response.status);
    console.log('   Has metadata:', !!response.metadata);
    console.log('   Total clips:', response.metadata?.totalClips || 0);
    console.log('');

    if (response.metadata && response.metadata.totalClips === 50) {
      console.log('✅ SUCCESS: API returns metadata with 50 clips!');
      console.log('   Frontend will now show all 50 clips immediately on first load');
      process.exit(0);
    } else {
      console.log('❌ FAILED: Metadata missing or incorrect');
      console.log('Full response:', JSON.stringify(response, null, 2));
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
