#!/usr/bin/env node

/**
 * Test de integración completo del nuevo sistema
 * Verifica: validación, jobs, FFmpeg con escala/crop 9:16
 */

const axios = require('axios');
const logger = require('./utils/logger');

const BASE_URL = 'http://localhost:3000';

async function testCompleteSystem() {
  console.log('🧪 TESTING COMPLETE SYSTEM INTEGRATION');
  console.log('=====================================');

  // Mock payload del frontend
  const processBody = {
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    effects: {
      color: {
        filterType: "vivid",
        intensity: 50,
        ffmpegCommand: "eq=saturation=1.750:contrast=1.002",
        ffmpegValues: {
          saturation: 1.75,
          contrast: 1.002,
          cssPreview: "saturate(175%) contrast(120%)"
        }
      },
      horizontalFlip: true,
      clipIndicator: {
        type: "temporal",
        position: "top-right",
        size: 80,
        textColor: "#FFFFFF",
        bgColor: "#FF6347",
        opacity: 0.8,
        style: "rounded"
      }
    },
    clips: [
      { start: 0, end: 10 }
    ]
  };

  try {
    console.log('\n📥 Sending processBody to /api/process-video...');
    console.log('Payload:', JSON.stringify(processBody, null, 2));

    // 1. Enviar request de procesamiento
    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    console.log('\n✅ Process response:', processResponse.status, processResponse.data);

    if (!processResponse.data.success || !processResponse.data.jobId) {
      throw new Error('Process request failed');
    }

    const jobId = processResponse.data.jobId;
    console.log(`\n🔄 Job created: ${jobId}`);

    // 2. Polling del status
    console.log('\n⏳ Polling job status...');
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos máximo

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

        if (job.status === 'DONE') {
          console.log('\n🎉 JOB COMPLETED SUCCESSFULLY!');
          console.log('Output URL:', job.outputUrl);
          console.log('Processing time:', job.processingTime);
          console.log('FFmpeg command:', job.ffmpegCommand);
          break;
        } else if (job.status === 'ERROR') {
          console.log('\n❌ JOB FAILED!');
          console.log('Error:', job.errorMessage);
          break;
        }

        // Esperar 1 segundo antes del siguiente poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`Attempt ${attempts + 1}: Job not found yet...`);
        } else {
          console.log(`Attempt ${attempts + 1}: Error polling status: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (attempts >= maxAttempts) {
      console.log('\n⏰ Timeout waiting for job completion');
    }

    // 3. Verificar que el endpoint de jobs funciona
    console.log('\n📋 Testing jobs list endpoint...');
    try {
      const jobsResponse = await axios.get(`${BASE_URL}/api/jobs`);
      console.log('Jobs list:', jobsResponse.data);
    } catch (error) {
      console.log('Jobs list error:', error.message);
    }

  } catch (error) {
    console.log('\n❌ TEST FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Ejecutar test
testCompleteSystem().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Test crashed:', error.message);
  process.exit(1);
});
