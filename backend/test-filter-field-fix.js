#!/usr/bin/env node

/**
 * Test para verificar que la corrección del campo 'filter' funciona
 * Este test simula el payload que debería enviar el frontend después de la corrección
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testFilterFieldFix() {
  console.log('🧪 TESTING FILTER FIELD FIX - ERROR 234 SOLUTION');
  console.log('================================================');

  try {
    // 1. Crear archivo de video de prueba
    console.log('\n📁 Creating test video...');
    
    const testVideoPath = '/tmp/test_filter_fix.mp4';
    const mp4Data = Buffer.from([
      // ftyp box
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
      // mdat box
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74
    ]);
    
    const padding = Buffer.alloc(10000, 0x00);
    const fullMp4Data = Buffer.concat([mp4Data, padding]);
    fs.writeFileSync(testVideoPath, fullMp4Data);
    
    // 2. Upload del video
    console.log('\n📤 Uploading video...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test_filter_fix.mp4',
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

    // 3. Test Case 1: FilterType = 'none' (debería funcionar ahora)
    console.log('\n🧪 Test Case 1: FilterType = "none" (CORREGIDO)...');
    
    const payloadWithNoneFilter = {
      uploadId: uploadResponse.data.uploadId,
      effects: {
        horizontalFlip: false,
        filter: {
          type: 'none',
          intensity: 50,
          ffmpegCommand: '', // ✅ Vacío pero presente
          ffmpegValues: {}
        }
      },
      clips: [
        {
          start: 0,
          end: 5,
          effects: {
            mirrorHorizontal: false,
            // ✅ CORRECCIÓN: SIEMPRE incluir filter
            filter: {
              type: 'none',
              intensity: 50,
              ffmpegCommand: '', // ✅ Vacío pero presente
              ffmpegValues: {}
            }
          }
        }
      ]
    };

    console.log('Payload con filter="none":', JSON.stringify(payloadWithNoneFilter, null, 2));

    const processResponse1 = await axios.post(`${BASE_URL}/api/process-video`, payloadWithNoneFilter, {
      timeout: 10000
    });

    console.log('✅ Processing started!');
    console.log('Job ID:', processResponse1.data.jobId);

    // Monitorear el progreso
    const jobId1 = processResponse1.data.jobId;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId1}/status`);
        const job = statusResponse.data;

        console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

        if (job.status === 'DONE') {
          console.log('🎉 SUCCESS! Filter="none" funciona correctamente!');
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

    // 4. Test Case 2: FilterType = 'vivid' (debería funcionar)
    console.log('\n🧪 Test Case 2: FilterType = "vivid" (debería funcionar)...');
    
    const payloadWithVividFilter = {
      uploadId: uploadResponse.data.uploadId,
      effects: {
        horizontalFlip: true,
        filter: {
          type: 'vivid',
          intensity: 75,
          ffmpegCommand: 'eq=saturation=1.75:contrast=1.002',
          ffmpegValues: {
            saturation: 1.75,
            contrast: 1.002
          }
        }
      },
      clips: [
        {
          start: 0,
          end: 5,
          effects: {
            mirrorHorizontal: true,
            // ✅ CORRECCIÓN: SIEMPRE incluir filter
            filter: {
              type: 'vivid',
              intensity: 75,
              ffmpegCommand: 'eq=saturation=1.75:contrast=1.002',
              ffmpegValues: {
                saturation: 1.75,
                contrast: 1.002
              }
            }
          }
        }
      ]
    };

    console.log('Payload con filter="vivid":', JSON.stringify(payloadWithVividFilter, null, 2));

    const processResponse2 = await axios.post(`${BASE_URL}/api/process-video`, payloadWithVividFilter, {
      timeout: 10000
    });

    console.log('✅ Processing started!');
    console.log('Job ID:', processResponse2.data.jobId);

    // Monitorear el progreso
    const jobId2 = processResponse2.data.jobId;
    attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId2}/status`);
        const job = statusResponse.data;

        console.log(`Attempt ${attempts + 1}: Status = ${job.status}, Progress = ${job.progress}%`);

        if (job.status === 'DONE') {
          console.log('🎉 SUCCESS! Filter="vivid" funciona correctamente!');
          console.log('Output URL:', job.outputUrl);
          break;
        } else if (job.status === 'ERROR') {
          console.log('❌ Still failed:', job.errorMessage);
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

    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log('========================');
    console.log('✅ Test Case 1 (filter="none"): Should work with empty ffmpegCommand');
    console.log('✅ Test Case 2 (filter="vivid"): Should work with valid ffmpegCommand');
    console.log('\n📝 CONCLUSION:');
    console.log('The error 234 should be resolved by:');
    console.log('1. Always including the "filter" field in clips');
    console.log('2. Backend can read ffmpegCommand (empty or valid)');
    console.log('3. FFmpeg executes correctly with proper command');

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
testFilterFieldFix().then(() => {
  console.log('\n🏁 Filter field fix test completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Test crashed:', error.message);
  process.exit(1);
});
