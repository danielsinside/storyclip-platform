// Test simple para verificar el procesamiento
const http = require('http');

const testData = {
  uploadId: 'test_fix_' + Date.now(),
  mode: 'manual',
  videoUrl: 'https://story.creatorsflow.app/test/sample.mp4',
  clips: [
    {
      start: 0,
      end: 5,
      effects: {
        filter: {
          type: 'none',
          intensity: 0,
          // Sin ffmpegCommand - esto debería causar error 234 si no está el fix
        }
      }
    }
  ],
  metadata: {
    title: 'Test Fix Error 234'
  }
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/process-video',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE:', data);
    
    // Verificar logs después
    console.log('\n📝 Ejecuta este comando para ver los logs:');
    console.log('pm2 logs storyclip --lines 50 | grep FILTER-FIX');
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(postData);
req.end();
