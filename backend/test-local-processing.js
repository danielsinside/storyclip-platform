#!/usr/bin/env node

/**
 * Test completo: Upload + Procesamiento con archivo local
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testLocalUploadAndProcessing() {
  console.log('🎬 TESTING LOCAL UPLOAD + PROCESSING');
  console.log('====================================');

  try {
    // 1. Crear archivo de video de prueba
    console.log('\n📁 Creating test video...');
    const testVideoPath = '/tmp/local_test.mp4';
    
    // Crear un archivo MP4 mínimo válido
    const mp4Data = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom brand
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // isom2 brand
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31, // avc1mp41 brand
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74  // mdat box start
    ]);
    
    fs.writeFileSync(testVideoPath, mp4Data);
    console.log('✅ Test video created');

    // 2. Upload del video
    console.log('\n📤 Step 1: Uploading video...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'local_test.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/upload-preview`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ Upload successful!');
    console.log('Upload ID:', uploadResponse.data.uploadId);

    // 3. Procesar el video con efectos
    console.log('\n⚙️ Step 2: Processing video with effects...');
    
    const processBody = {
      uploadId: uploadResponse.data.uploadId,
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
        { start: 0, end: 5 }
      ]
    };

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    console.log('✅ Processing started!');
    console.log('Job ID:', processResponse.data.jobId);
    console.log('Status:', processResponse.data.status);

    // 4. Polling del status
    console.log('\n⏳ Step 3: Polling job status...');
    const jobId = processResponse.data.jobId;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

        if (job.status === 'DONE') {
          console.log('\n🎉 PROCESSING COMPLETED!');
          console.log('Output URL:', job.outputUrl);
          console.log('Processing time:', job.processingTime);
          console.log('FFmpeg command:', job.ffmpegCommand);
          break;
        } else if (job.status === 'ERROR') {
          console.log('\n❌ PROCESSING FAILED!');
          console.log('Error:', job.errorMessage);
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

    if (attempts >= maxAttempts) {
      console.log('\n⏰ Timeout waiting for processing completion');
    }

    // 5. Limpiar
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Test file cleaned up');

  } catch (error) {
    console.log('\n❌ LOCAL UPLOAD + PROCESSING TEST FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar test
testLocalUploadAndProcessing().then(() => {
  console.log('\n🏁 Local upload + processing test finished');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Test crashed:', error.message);
  process.exit(1);
});
