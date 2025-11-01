#!/usr/bin/env node

/**
 * Test para reproducir el error 234 y verificar el payload
 * Basado en el análisis del problema real
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testError234Reproduction() {
  console.log('🔍 REPRODUCING ERROR 234 - PAYLOAD ANALYSIS');
  console.log('============================================');

  try {
    // 1. Crear un archivo de video válido
    console.log('\n📁 Creating valid test video...');
    const testVideoPath = '/tmp/test_video_234.mp4';
    
    // Crear un archivo MP4 más completo (simulando un video real)
    const mp4Data = Buffer.from([
      // ftyp box
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
      // mdat box start
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74
    ]);
    
    // Agregar más datos para hacer el archivo más válido (10KB)
    const padding = Buffer.alloc(10000, 0x00);
    const fullMp4Data = Buffer.concat([mp4Data, padding]);
    
    fs.writeFileSync(testVideoPath, fullMp4Data);
    console.log('✅ Test video created (10KB)');

    // 2. Upload del video
    console.log('\n📤 Uploading video...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test_video_234.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/videos/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ Upload successful!');
    console.log('Upload ID:', uploadResponse.data.uploadId);

    // 3. Test Case 1: Payload SIN ffmpegCommand (debería fallar con 234)
    console.log('\n🧪 Test Case 1: Payload WITHOUT ffmpegCommand...');
    
    const processBodyWithoutFFmpeg = {
      uploadId: uploadResponse.data.uploadId,
      effects: {
        horizontalFlip: true,
        filter: {
          type: 'cinematic',
          intensity: 75
          // ❌ SIN ffmpegCommand - esto debería causar error 234
        }
      },
      clips: [
        { start: 0, end: 5 },
        { start: 10, end: 15 }
      ]
    };

    console.log('Payload sin ffmpegCommand:', JSON.stringify(processBodyWithoutFFmpeg, null, 2));

    try {
      const processResponse1 = await axios.post(`${BASE_URL}/api/process-video`, processBodyWithoutFFmpeg, {
        timeout: 10000
      });

      console.log('Job ID:', processResponse1.data.jobId);
      
      // Monitorear el error
      const jobId1 = processResponse1.data.jobId;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId1}/status`);
          const job = statusResponse.data;

          console.log(`Attempt ${attempts + 1}: Status = ${job.status}`);

          if (job.status === 'ERROR') {
            console.log('❌ ERROR 234 REPRODUCED!');
            console.log('Error message:', job.errorMessage);
            if (job.errorMessage.includes('234')) {
              console.log('✅ CONFIRMED: Error 234 caused by missing ffmpegCommand');
            }
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;

        } catch (error) {
          console.log(`Attempt ${attempts + 1}: Error polling status: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }

    } catch (error) {
      console.log('❌ Test Case 1 failed:', error.message);
    }

    // 4. Test Case 2: Payload CON ffmpegCommand (debería funcionar)
    console.log('\n🧪 Test Case 2: Payload WITH ffmpegCommand...');
    
    const processBodyWithFFmpeg = {
      uploadId: uploadResponse.data.uploadId,
      effects: {
        horizontalFlip: true,
        filter: {
          type: 'cinematic',
          intensity: 75,
          ffmpegCommand: 'eq=saturation=1.5:brightness=0.1:contrast=1.1'
          // ✅ CON ffmpegCommand - esto debería funcionar
        }
      },
      clips: [
        { start: 0, end: 5 },
        { start: 10, end: 15 }
      ]
    };

    console.log('Payload con ffmpegCommand:', JSON.stringify(processBodyWithFFmpeg, null, 2));

    try {
      const processResponse2 = await axios.post(`${BASE_URL}/api/process-video`, processBodyWithFFmpeg, {
        timeout: 10000
      });

      console.log('Job ID:', processResponse2.data.jobId);
      
      // Monitorear el éxito
      const jobId2 = processResponse2.data.jobId;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId2}/status`);
          const job = statusResponse.data;

          console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

          if (job.status === 'DONE') {
            console.log('✅ SUCCESS WITH ffmpegCommand!');
            console.log('Output URL:', job.outputUrl);
            break;
          } else if (job.status === 'ERROR') {
            console.log('❌ Still failed with ffmpegCommand:', job.errorMessage);
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;

        } catch (error) {
          console.log(`Attempt ${attempts + 1}: Error polling status: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }

    } catch (error) {
      console.log('❌ Test Case 2 failed:', error.message);
    }

    // 5. Test Case 3: Clips inválidos (end > duration)
    console.log('\n🧪 Test Case 3: Invalid clips (end > duration)...');
    
    const processBodyInvalidClips = {
      uploadId: uploadResponse.data.uploadId,
      effects: {
        horizontalFlip: true,
        filter: {
          type: 'cinematic',
          intensity: 75,
          ffmpegCommand: 'eq=saturation=1.5:brightness=0.1:contrast=1.1'
        }
      },
      clips: [
        { start: 0, end: 5 },
        { start: 10, end: 1000 } // ❌ end > duration - esto debería causar error
      ]
    };

    console.log('Payload con clips inválidos:', JSON.stringify(processBodyInvalidClips, null, 2));

    try {
      const processResponse3 = await axios.post(`${BASE_URL}/api/process-video`, processBodyInvalidClips, {
        timeout: 10000
      });

      console.log('Job ID:', processResponse3.data.jobId);
      
      // Monitorear el error
      const jobId3 = processResponse3.data.jobId;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId3}/status`);
          const job = statusResponse.data;

          console.log(`Attempt ${attempts + 1}: Status = ${job.status}`);

          if (job.status === 'ERROR') {
            console.log('❌ ERROR with invalid clips!');
            console.log('Error message:', job.errorMessage);
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;

        } catch (error) {
          console.log(`Attempt ${attempts + 1}: Error polling status: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }

    } catch (error) {
      console.log('❌ Test Case 3 failed:', error.message);
    }

    // 6. Limpiar
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Test file cleaned up');

    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log('====================');
    console.log('1. Test Case 1 (sin ffmpegCommand): Should reproduce error 234');
    console.log('2. Test Case 2 (con ffmpegCommand): Should work correctly');
    console.log('3. Test Case 3 (clips inválidos): Should show validation error');
    console.log('\nThis confirms if the issue is missing ffmpegCommand or invalid clips.');

  } catch (error) {
    console.log('\n❌ TEST FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar test
testError234Reproduction().then(() => {
  console.log('\n🏁 Error 234 reproduction test completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Test crashed:', error.message);
  process.exit(1);
});
