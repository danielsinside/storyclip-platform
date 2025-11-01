const http = require('http');
const jobManager = require('./services/job-manager.service');

// Crear job con metadata
const testMetadata = {
  totalClips: 50,
  clips: Array.from({ length: 50 }, (_, i) => ({ id: `clip_${i+1}` }))
};

const job = jobManager.createJob({});
jobManager.completeJob(job.id, '/test/clip_001.mp4', null, null, testMetadata, testMetadata.clips);

console.log('✅ Created job:', job.id);
console.log('');

// Consultar API
const req = http.get(`http://localhost:3000/api/jobs/${job.id}/status`, (res) => {
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
      process.exit(0);
    } else {
      console.log('❌ FAILED: Metadata missing or incorrect');
      console.log(JSON.stringify(response, null, 2));
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
