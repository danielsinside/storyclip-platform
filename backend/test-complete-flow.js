#!/usr/bin/env node

/**
 * Test completo del flujo: Upload → Configurar → Procesar → Error 234
 * Reproduce exactamente el flujo que describe el usuario
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testCompleteFlow() {
  console.log('🎬 TESTING COMPLETE FLOW: Upload → Configurar → Procesar');
  console.log('=======================================================');

  let uploadId = null;
  let jobId = null;

  try {
    // PASO 1: Upload del video (crea uploadId)
    console.log('\n📤 PASO 1: Upload del video...');
    
    // Crear un archivo de video válido
    const testVideoPath = '/tmp/test_complete_flow.mp4';
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
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test_complete_flow.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/videos/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    if (uploadResponse.data.success) {
      uploadId = uploadResponse.data.uploadId;
      console.log('✅ Upload exitoso!');
      console.log(`📋 uploadId: ${uploadId}`);
      console.log(`📋 videoUrl: ${uploadResponse.data.videoUrl}`);
      console.log(`📋 Estado: uploaded (en espera)`);
    } else {
      throw new Error(`Upload falló: ${uploadResponse.data.error}`);
    }

    // PASO 2: Configurar efectos (video sigue en "espera")
    console.log('\n⚙️ PASO 2: Configurar efectos...');
    console.log('📋 El video está en "espera" - NO hay jobId todavía');
    console.log('📋 uploadId sigue siendo:', uploadId);
    
    // Simular configuración de efectos
    const effects = {
      horizontalFlip: true,
      filter: {
        type: 'cinematic',
        intensity: 75
        // ❌ SIN ffmpegCommand - esto causará error 234
      }
    };
    
    const clips = [
      { start: 0, end: 5 },
      { start: 10, end: 15 }
    ];
    
    console.log('📋 Efectos configurados:', JSON.stringify(effects, null, 2));
    console.log('📋 Clips configurados:', JSON.stringify(clips, null, 2));

    // PASO 3: Click "Procesar" (crea jobId)
    console.log('\n🚀 PASO 3: Click "Procesar" - Creando job...');
    
    const processBody = {
      uploadId: uploadId,
      effects: effects,
      clips: clips
    };

    console.log('📋 Payload enviado:', JSON.stringify(processBody, null, 2));

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    if (processResponse.status === 202 && processResponse.data.success) {
      jobId = processResponse.data.jobId;
      console.log('✅ Job creado exitosamente!');
      console.log(`📋 jobId: ${jobId}`);
      console.log(`📋 Estado inicial: ${processResponse.data.status}`);
      console.log('📋 Ahora SÍ hay jobId - iniciando procesamiento');
    } else {
      throw new Error(`Creación de job falló: ${processResponse.status} - ${JSON.stringify(processResponse.data)}`);
    }

    // PASO 4: FFmpeg procesa (aquí ocurre el error 234)
    console.log('\n⚙️ PASO 4: FFmpeg procesando...');
    console.log('📋 Monitoreando progreso del job...');
    
    let attempts = 0;
    const maxAttempts = 15;
    let finalStatus = 'unknown';

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        console.log(`📋 Intento ${attempts}: Estado = ${job.status}, Progreso = ${job.progress}%`);

        if (job.status === 'DONE') {
          console.log('🎉 ¡SUCCESS! Procesamiento completado!');
          console.log(`📋 Output URL: ${job.outputUrl}`);
          finalStatus = 'success';
          break;
        } else if (job.status === 'ERROR') {
          console.log('❌ ERROR 234 REPRODUCIDO!');
          console.log(`📋 Error message: ${job.errorMessage}`);
          
          if (job.errorMessage.includes('234')) {
            console.log('✅ CONFIRMADO: Error 234 causado por falta de ffmpegCommand');
            console.log('📋 El problema es que el frontend no envía ffmpegCommand');
          }
          
          finalStatus = 'error';
          break;
        } else if (job.status === 'RUNNING') {
          console.log(`📋 Procesando... ${job.message || ''}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.log(`📋 Intento ${attempts}: Error polling status: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (finalStatus === 'unknown') {
      console.log('⏰ Timeout esperando procesamiento');
    }

    // PASO 5: Análisis del resultado
    console.log('\n📊 ANÁLISIS DEL RESULTADO:');
    console.log('==========================');
    console.log(`📋 uploadId: ${uploadId} (creado en upload)`);
    console.log(`📋 jobId: ${jobId} (creado en procesamiento)`);
    console.log(`📋 Estado final: ${finalStatus}`);
    
    if (finalStatus === 'error') {
      console.log('\n🔍 DIAGNÓSTICO DEL ERROR 234:');
      console.log('==============================');
      console.log('❌ El problema NO es:');
      console.log('   - Permisos de directorios');
      console.log('   - Configuración de FFmpeg');
      console.log('   - Sintaxis de comandos');
      console.log('   - Endpoints del backend');
      console.log('');
      console.log('✅ El problema ES:');
      console.log('   - Falta ffmpegCommand en el payload');
      console.log('   - Backend no puede construir filtros FFmpeg');
      console.log('   - FFmpeg falla al crear archivos de salida');
    }

    // Limpiar
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Archivo de prueba limpiado');

  } catch (error) {
    console.log('\n❌ TEST FALLÓ!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Ejecutar test
testCompleteFlow().then(() => {
  console.log('\n🏁 Test del flujo completo terminado');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Test crashed:', error.message);
  process.exit(1);
});