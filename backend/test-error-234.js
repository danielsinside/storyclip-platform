#!/usr/bin/env node

/**
 * Test para diagnosticar el error 234 de FFmpeg
 * Error: Error opening output file clip_001.mp4
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testFFmpegError234() {
  console.log('🔍 DIAGNOSING FFMPEG ERROR 234');
  console.log('==============================');

  try {
    // 1. Crear un archivo de video válido más grande
    console.log('\n📁 Creating valid test video...');
    const testVideoPath = '/tmp/valid_test.mp4';
    
    // Crear un archivo MP4 más completo (1KB mínimo)
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom brand
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // isom2 brand
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31, // avc1mp41 brand
    ]);
    
    // Agregar más datos para hacer el archivo más válido
    const padding = Buffer.alloc(1000, 0x00); // 1KB de padding
    const mp4Data = Buffer.concat([mp4Header, padding]);
    
    fs.writeFileSync(testVideoPath, mp4Data);
    console.log('✅ Test video created (1KB)');

    // 2. Probar el endpoint correcto /api/videos/upload
    console.log('\n📤 Testing /api/videos/upload...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'valid_test.mp4',
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
    console.log('Video URL:', uploadResponse.data.videoUrl);

    // 3. Procesar el video para reproducir el error 234
    console.log('\n⚙️ Processing video to reproduce error 234...');
    
    const processBody = {
      uploadId: uploadResponse.data.uploadId,
      effects: {
        horizontalFlip: true
      },
      clips: [
        { start: 0, end: 5 }
      ]
    };

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    console.log('✅ Processing started!');
    console.log('Job ID:', processResponse.data.jobId);

    // 4. Monitorear el progreso para ver el error
    console.log('\n⏳ Monitoring for error 234...');
    const jobId = processResponse.data.jobId;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

        if (job.status === 'ERROR') {
          console.log('\n❌ ERROR 234 REPRODUCED!');
          console.log('Error message:', job.errorMessage);
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

    // 5. Verificar directorios de trabajo
    console.log('\n🔍 Checking work directories...');
    const workDir = '/srv/storyclip/work';
    if (fs.existsSync(workDir)) {
      const jobs = fs.readdirSync(workDir);
      console.log('Work directory exists, jobs:', jobs.length);
      
      if (jobs.length > 0) {
        const latestJob = jobs[jobs.length - 1];
        const jobPath = `${workDir}/${latestJob}`;
        console.log('Latest job:', latestJob);
        
        if (fs.existsSync(jobPath)) {
          const files = fs.readdirSync(jobPath);
          console.log('Files in job directory:', files);
          
          // Verificar permisos
          const stats = fs.statSync(jobPath);
          console.log('Job directory permissions:', stats.mode.toString(8));
        }
      }
    } else {
      console.log('❌ Work directory does not exist!');
    }

    // 6. Limpiar
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Test file cleaned up');

  } catch (error) {
    console.log('\n❌ DIAGNOSIS FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar diagnóstico
testFFmpegError234().then(() => {
  console.log('\n🏁 Error 234 diagnosis completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Diagnosis crashed:', error.message);
  process.exit(1);
});
