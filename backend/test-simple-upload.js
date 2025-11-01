#!/usr/bin/env node

/**
 * Test simple de upload de videos
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testSimpleUpload() {
  console.log('🎬 TESTING SIMPLE VIDEO UPLOAD');
  console.log('==============================');

  try {
    // 1. Crear un archivo de video de prueba muy pequeño
    console.log('\n📁 Creating minimal test video...');
    const testVideoPath = '/tmp/minimal_test.mp4';
    
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

    // 2. Probar endpoint de upload-preview
    console.log('\n📤 Testing /api/upload-preview...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/upload-preview`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Upload successful!');
    console.log('Status:', uploadResponse.status);
    console.log('Response:', JSON.stringify(uploadResponse.data, null, 2));

    // 3. Limpiar
    fs.unlinkSync(testVideoPath);
    console.log('✅ Test file cleaned up');

  } catch (error) {
    console.log('\n❌ UPLOAD TEST FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar test
testSimpleUpload().then(() => {
  console.log('\n🏁 Upload test completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Test crashed:', error.message);
  process.exit(1);
});
