#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'https://story.creatorsflow.app/api';

async function testMultipleClips() {
  try {
    console.log('🎬 Testing multiple clips processing...\n');

    // Simular un uploadId existente
    const uploadId = 'test_upload_' + Date.now();

    // Crear request con 5 clips de 3 segundos cada uno
    const processRequest = {
      uploadId: uploadId,
      mode: 'manual',
      clips: [
        { start: 0, end: 3 },
        { start: 3, end: 6 },
        { start: 6, end: 9 },
        { start: 9, end: 12 },
        { start: 12, end: 15 }
      ],
      filters: {},
      effects: {
        mirrorHorizontal: false
      }
    };

    console.log('📤 Sending process request:');
    console.log('   Mode: manual');
    console.log('   Clips: 5 clips of 3 seconds each');
    console.log('   Clips array:', processRequest.clips);
    console.log('');

    // Enviar request de procesamiento
    const response = await axios.post(`${API_BASE}/process-video`, processRequest);

    const { jobId } = response.data;
    console.log(`✅ Job started: ${jobId}\n`);

    // Hacer polling del estado
    console.log('📊 Polling job status...');

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos

      const statusResponse = await axios.get(`${API_BASE}/jobs/${jobId}/status`);
      const status = statusResponse.data;

      console.log(`   [${attempts + 1}/${maxAttempts}] Status: ${status.status}, Progress: ${status.progress}%, Message: ${status.message || ''}`);

      if (status.status === 'done' || status.status === 'completed') {
        console.log('\n✅ Processing completed!');
        console.log('📋 Results:');
        console.log('   Total clips:', status.metadata?.totalClips || 'Unknown');
        console.log('   Outputs array length:', status.outputs?.length || 0);

        if (status.outputs && status.outputs.length > 0) {
          console.log('   Generated clips:');
          status.outputs.forEach(output => {
            console.log(`     - Clip ${output.index}: ${output.url} (${output.durationSeconds}s)`);
          });
        } else {
          console.log('   ⚠️ No outputs array found in response!');
        }

        console.log('\n📄 Full response:');
        console.log(JSON.stringify(status, null, 2));
        break;
      }

      if (status.status === 'error') {
        console.error('\n❌ Processing failed:', status.errorMessage || 'Unknown error');
        console.log('Full response:', JSON.stringify(status, null, 2));
        break;
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('\n⏱️ Timeout: Job did not complete in time');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Ejecutar prueba
testMultipleClips();