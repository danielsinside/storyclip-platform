#!/usr/bin/env node

/**
 * Test para reproducir el error de FFmpeg código 234
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testFFmpegError() {
  console.log('🔍 TESTING FFMPEG ERROR REPRODUCTION');
  console.log('====================================');

  try {
    // Usar una URL de video simple
    const processBody = {
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      effects: {
        horizontalFlip: true
      },
      clips: [
        { start: 0, end: 5 }
      ]
    };

    console.log('\n⚙️ Processing video to reproduce error...');

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    console.log('✅ Processing started!');
    console.log('Job ID:', processResponse.data.jobId);

    // Polling rápido para ver el error
    const jobId = processResponse.data.jobId;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

        if (job.status === 'ERROR') {
          console.log('\n❌ ERROR REPRODUCED!');
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
    console.log('\n❌ TEST FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar test
testFFmpegError().then(() => {
  console.log('\n🏁 Error reproduction test finished');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Test crashed:', error.message);
  process.exit(1);
});
