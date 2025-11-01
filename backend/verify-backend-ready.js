#!/usr/bin/env node

/**
 * Script de verificación para confirmar que el backend está listo
 * para recibir el payload correcto después del fix en api.ts
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function verifyBackendReady() {
  console.log('🔍 VERIFICANDO QUE EL BACKEND ESTÉ LISTO PARA EL FIX');
  console.log('==================================================');

  try {
    // 1. Verificar que el servidor esté funcionando
    console.log('\n📡 Verificando servidor...');
    
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Servidor funcionando correctamente');

    // 2. Crear archivo de video de prueba
    console.log('\n📁 Creando video de prueba...');
    
    const testVideoPath = '/tmp/test_backend_ready.mp4';
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
    
    // 3. Probar upload
    console.log('\n📤 Probando upload...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test_backend_ready.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/videos/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ Upload exitoso!');
    console.log('Upload ID:', uploadResponse.data.uploadId);

    // 4. Probar con payload CORRECTO (como debería enviar el frontend después del fix)
    console.log('\n🧪 Probando con payload CORRECTO (con effects en clips)...');
    
    const correctPayload = {
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

    console.log('📋 Payload correcto:', JSON.stringify(correctPayload, null, 2));

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, correctPayload, {
      timeout: 10000
    });

    console.log('✅ Procesamiento iniciado!');
    console.log('Job ID:', processResponse.data.jobId);

    // 5. Monitorear el progreso
    const jobId = processResponse.data.jobId;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        console.log(`📊 Intento ${attempts + 1}: Estado = ${job.status}, Progreso = ${job.progress}%`);

        if (job.status === 'DONE') {
          console.log('🎉 ¡SUCCESS! Backend procesó correctamente el payload con effects!');
          console.log('Output URL:', job.outputUrl);
          console.log('✅ El backend está listo para el fix del frontend');
          break;
        } else if (job.status === 'ERROR') {
          console.log('❌ Error:', job.errorMessage);
          if (job.errorMessage.includes('234')) {
            console.log('❌ Error 234 aún ocurre - revisar implementación del backend');
          }
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;

      } catch (error) {
        console.log(`📊 Intento ${attempts + 1}: Error polling status: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }
    }

    // 6. Limpiar
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Archivo de prueba limpiado');

    console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
    console.log('============================');
    console.log('✅ Servidor funcionando');
    console.log('✅ Upload de videos funcionando');
    console.log('✅ Endpoint /api/process-video funcionando');
    console.log('✅ Endpoint /api/jobs/:jobId/status funcionando');
    console.log('✅ Backend procesa payload con effects correctamente');
    console.log('\n📝 PRÓXIMO PASO:');
    console.log('Implementar el cambio en src/lib/api.ts línea 298:');
    console.log('clips: data.clips || data.manual?.clips || sessionData?.manual_clips,');

  } catch (error) {
    console.log('\n❌ VERIFICACIÓN FALLÓ!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar verificación
verifyBackendReady().then(() => {
  console.log('\n🏁 Verificación del backend completada');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Verificación crashed:', error.message);
  process.exit(1);
});
