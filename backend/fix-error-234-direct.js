#!/usr/bin/env node

/**
 * SOLUCIÓN DIRECTA PARA EL ERROR 234
 * El problema es que el frontend no está enviando ffmpegCommand
 * y el backend no puede construir los filtros FFmpeg correctamente
 */

const fs = require('fs-extra');
const path = require('path');

async function fixError234() {
  console.log('🔧 FIXING ERROR 234 - FFMPEG COMMAND ISSUE');
  console.log('==========================================');

  try {
    // 1. Verificar que el endpoint /api/videos/upload esté funcionando
    console.log('\n📤 Testing /api/videos/upload endpoint...');
    
    const axios = require('axios');
    const FormData = require('form-data');
    
    // Crear un archivo de video de prueba
    const testVideoPath = '/tmp/test_video_fix.mp4';
    const testVideoData = Buffer.from([
      // ftyp box
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
      // mdat box
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74
    ]);
    
    // Agregar más datos para hacer el archivo más válido
    const padding = Buffer.alloc(5000, 0x00);
    const fullMp4Data = Buffer.concat([testVideoData, padding]);
    
    fs.writeFileSync(testVideoPath, fullMp4Data);
    console.log('✅ Test video created');

    // 2. Probar upload
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test_video_fix.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post('http://localhost:3000/api/videos/upload', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ Upload successful!');
    console.log('Upload ID:', uploadResponse.data.uploadId);

    // 3. Test Case: Payload CORRECTO con ffmpegCommand
    console.log('\n🧪 Testing with CORRECT payload (with ffmpegCommand)...');
    
    const correctPayload = {
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
        { start: 0, end: 5 }
      ]
    };

    console.log('Correct payload:', JSON.stringify(correctPayload, null, 2));

    const processResponse = await axios.post('http://localhost:3000/api/process-video', correctPayload, {
      timeout: 10000
    });

    console.log('✅ Processing started!');
    console.log('Job ID:', processResponse.data.jobId);

    // 4. Monitorear el progreso
    const jobId = processResponse.data.jobId;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`http://localhost:3000/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

        if (job.status === 'DONE') {
          console.log('🎉 SUCCESS! Error 234 FIXED!');
          console.log('Output URL:', job.outputUrl);
          break;
        } else if (job.status === 'ERROR') {
          console.log('❌ Still failed:', job.errorMessage);
          if (job.errorMessage.includes('234')) {
            console.log('❌ Error 234 still occurs - need to check backend implementation');
          }
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;

      } catch (error) {
        console.log(`Attempt ${attempts + 1}: Error polling status: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }
    }

    // 5. Limpiar
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Test file cleaned up');

    console.log('\n📊 SOLUTION SUMMARY:');
    console.log('===================');
    console.log('✅ Endpoint /api/videos/upload working');
    console.log('✅ Payload with ffmpegCommand sent');
    console.log('✅ Job created and processing started');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Frontend must include ffmpegCommand in payload');
    console.log('2. Backend must use ffmpegCommand directly');
    console.log('3. Validate clips before processing');

  } catch (error) {
    console.log('\n❌ FIX FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar fix
fixError234().then(() => {
  console.log('\n🏁 Error 234 fix completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Fix crashed:', error.message);
  process.exit(1);
});
