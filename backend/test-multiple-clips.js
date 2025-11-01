#!/usr/bin/env node

/**
 * Test para verificar que se envían múltiples clips correctamente en modo manual
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');

const BASE_URL = 'http://localhost:3000';

async function testMultipleClips() {
  console.log('🧪 TEST DE MÚLTIPLES CLIPS EN MODO MANUAL');
  console.log('==========================================');

  try {
    // 1. Usar un video real existente
    const sourceVideo = '/srv/storyclip/work/job_1761674856339_nubrwb3u/source.mp4';

    if (!await fs.pathExists(sourceVideo)) {
      console.error('❌ Video de prueba no existe');
      process.exit(1);
    }

    const testVideo = `/tmp/test_multiple_clips_${Date.now()}.mp4`;
    await fs.copyFile(sourceVideo, testVideo);
    console.log('✅ Video de prueba copiado');

    // 2. Upload del video
    console.log('\n📤 Subiendo video...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testVideo), {
      filename: 'test_multiple.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/videos/upload`, formData, {
      headers: formData.getHeaders(),
      timeout: 10000
    });

    console.log('✅ Upload exitoso');
    console.log(`   Upload ID: ${uploadResponse.data.uploadId}`);

    // 3. Procesar con múltiples clips en modo manual
    console.log('\n🎬 Iniciando procesamiento con 5 clips...');

    // Configuración que simula lo que debería enviar el frontend
    const processBody = {
      uploadId: uploadResponse.data.uploadId,
      mode: 'manual',
      clips: [
        { start: 0, end: 5 },
        { start: 10, end: 15 },
        { start: 20, end: 25 },
        { start: 30, end: 35 },
        { start: 40, end: 45 }
      ],
      maxClips: 5,
      clipDuration: 5,
      filters: {
        brightness: 0,
        contrast: 1,
        saturation: 1
      },
      effects: {},
      overlays: {},
      audio: {},
      cameraMovement: {}
    };

    console.log('📋 Configuración enviada:');
    console.log(`   - Modo: ${processBody.mode}`);
    console.log(`   - Clips configurados: ${processBody.clips.length}`);
    processBody.clips.forEach((clip, i) => {
      console.log(`     ${i + 1}. ${clip.start}s - ${clip.end}s`);
    });

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    const jobId = processResponse.data.jobId;
    console.log(`\n✅ Job creado: ${jobId}`);

    // 4. Monitorear el progreso
    console.log('\n⏳ Monitoreando progreso...');
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        process.stdout.write(`\r⏳ Status: ${job.status} | Progreso: ${job.progress}% | ${job.message || ''}     `);

        if (job.status === 'DONE' || job.status === 'done') {
          console.log('\n\n✅ PROCESAMIENTO COMPLETADO');

          // Verificar cuántos clips se generaron
          const outputDir = `/srv/storyclip/outputs/${jobId}`;
          if (await fs.pathExists(outputDir)) {
            const files = await fs.readdir(outputDir);
            const clips = files.filter(f => f.endsWith('.mp4'));

            console.log(`\n📊 RESULTADO:`);
            console.log(`   Clips solicitados: 5`);
            console.log(`   Clips generados: ${clips.length}`);

            if (clips.length === 5) {
              console.log('   ✅ ÉXITO: Se generaron todos los clips solicitados');

              // Listar los clips
              console.log('\n📹 Clips generados:');
              for (const clip of clips) {
                console.log(`   - ${clip}`);
              }
            } else if (clips.length === 1) {
              console.log('   ❌ ERROR: Solo se generó 1 clip cuando se pidieron 5');
              console.log('   ⚠️  El problema persiste - los múltiples clips no se están procesando');
            } else {
              console.log(`   ⚠️  Se generaron ${clips.length} clips, pero se esperaban 5`);
            }
          } else {
            console.log('   ❌ No se encontró el directorio de salida');
          }

          break;
        }

        if (job.status === 'ERROR' || job.status === 'error') {
          console.log('\n\n❌ ERROR EN EL PROCESAMIENTO');
          console.log(`   Mensaje: ${job.errorMessage || job.message}`);
          break;
        }
      } catch (error) {
        console.log(`\n❌ Error al consultar status: ${error.message}`);
      }
    }

    // Limpiar
    await fs.unlink(testVideo);
    console.log('\n🧹 Archivo de prueba eliminado');

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST');
    console.error(`Mensaje: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
  }
}

// Ejecutar test
testMultipleClips();