#!/usr/bin/env node

/**
 * Test de upload de videos desde el frontend
 * Verifica que se puede subir un video y obtener una URL válida
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function testVideoUpload() {
  console.log('🎬 TESTING VIDEO UPLOAD FROM FRONTEND');
  console.log('====================================');

  try {
    // 1. Crear un archivo de video de prueba pequeño
    console.log('\n📁 Creating test video file...');
    const testVideoPath = '/tmp/test_video.mp4';
    
    // Crear un archivo MP4 mínimo válido (solo headers, sin contenido real)
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom brand
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // isom2 brand
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31, // avc1mp41 brand
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74  // mdat box start
    ]);
    
    fs.writeFileSync(testVideoPath, mp4Header);
    console.log('✅ Test video file created');

    // 2. Probar endpoint de upload-preview
    console.log('\n📤 Testing /api/upload-preview endpoint...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test_video.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/upload-preview`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Upload response:', uploadResponse.status);
    console.log('Response data:', uploadResponse.data);

    if (uploadResponse.data.success && uploadResponse.data.previewUrl) {
      console.log('✅ Upload successful!');
      console.log('Preview URL:', uploadResponse.data.previewUrl);
      
      // 3. Verificar que el archivo es accesible
      console.log('\n🔍 Verifying uploaded file is accessible...');
      
      try {
        const fileResponse = await axios.head(uploadResponse.data.previewUrl, {
          timeout: 10000
        });
        console.log('✅ File is accessible:', fileResponse.status);
      } catch (error) {
        console.log('⚠️ File accessibility check failed:', error.message);
      }

      // 4. Probar el endpoint de upload principal
      console.log('\n📤 Testing /api/v1/upload endpoint...');
      
      const formData2 = new FormData();
      formData2.append('video', fs.createReadStream(testVideoPath), {
        filename: 'test_video_main.mp4',
        contentType: 'video/mp4'
      });

      try {
        const uploadResponse2 = await axios.post(`${BASE_URL}/api/v1/upload`, formData2, {
          headers: {
            ...formData2.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        console.log('✅ Main upload response:', uploadResponse2.status);
        console.log('Response data:', uploadResponse2.data);
      } catch (error) {
        console.log('⚠️ Main upload failed:', error.response?.status, error.response?.data || error.message);
      }

    } else {
      console.log('❌ Upload failed - no preview URL returned');
    }

    // 5. Limpiar archivo de prueba
    console.log('\n🧹 Cleaning up test file...');
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
      console.log('✅ Test file cleaned up');
    }

  } catch (error) {
    console.log('\n❌ UPLOAD TEST FAILED!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Ejecutar test
testVideoUpload().then(() => {
  console.log('\n🏁 Upload test completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Upload test crashed:', error.message);
  process.exit(1);
});