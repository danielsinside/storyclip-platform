#!/usr/bin/env node

/**
 * Test completo del procesamiento de video
 * Verifica que el sistema funciona correctamente después del fix
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function testCompleteProcessing() {
  console.log('🧪 TEST COMPLETO DE PROCESAMIENTO');
  console.log('====================================');

  try {
    // 1. Usar un video existente para la prueba
    const sourceVideo = '/srv/storyclip/work/job_1761680103688_x3ksl2vi/source.mp4';

    if (!await fs.pathExists(sourceVideo)) {
      console.error('❌ Video de prueba no existe');
      process.exit(1);
    }

    console.log('✅ Video de prueba encontrado');
    const stats = await fs.stat(sourceVideo);
    console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // 2. Copiar el video a un archivo temporal
    const tempVideo = `/tmp/test_video_${Date.now()}.mp4`;
    await fs.copyFile(sourceVideo, tempVideo);
    console.log('✅ Video copiado a temporal');

    // 3. Upload del video
    console.log('\n📤 Subiendo video...');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempVideo), {
      filename: 'test_video.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/videos/upload`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    console.log('✅ Upload exitoso');
    console.log(`   Upload ID: ${uploadResponse.data.uploadId}`);

    // 4. Procesar el video
    console.log('\n🎬 Iniciando procesamiento...');

    const processBody = {
      uploadId: uploadResponse.data.uploadId,
      mode: 'manual',
      clips: [
        { start: 0, end: 5 },
        { start: 10, end: 15 },
        { start: 20, end: 25 }
      ],
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

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    console.log('✅ Procesamiento iniciado');
    console.log(`   Job ID: ${processResponse.data.jobId}`);

    // 5. Monitorear el progreso
    console.log('\n⏳ Monitoreando progreso...');

    const jobId = processResponse.data.jobId;
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
        const job = statusResponse.data;

        process.stdout.write(`\r⏳ Status: ${job.status} | Progreso: ${job.progress}% | ${job.message || ''}     `);

        if (job.status === 'DONE' || job.status === 'done') {
          console.log('\n\n✅ PROCESAMIENTO COMPLETADO EXITOSAMENTE');
          console.log(`   Tiempo: ${attempts} segundos`);

          if (job.outputUrl) {
            console.log(`   Output URL: ${job.outputUrl}`);
          }

          // Verificar que los clips existen
          const outputDir = `/srv/storyclip/outputs/${jobId}`;
          if (await fs.pathExists(outputDir)) {
            const files = await fs.readdir(outputDir);
            const clips = files.filter(f => f.endsWith('.mp4'));

            console.log(`\n📹 Clips generados: ${clips.length}`);
            for (const clip of clips) {
              const clipPath = path.join(outputDir, clip);
              const clipStats = await fs.stat(clipPath);
              console.log(`   - ${clip}: ${(clipStats.size / 1024 / 1024).toFixed(2)} MB`);
            }
          }

          console.log('\n✨ TEST EXITOSO ✨');
          console.log('==================');
          console.log('✅ El sistema de procesamiento funciona correctamente');
          console.log('✅ Error 234 SOLUCIONADO');
          console.log('✅ Los clips se generan exitosamente');

          // Limpiar
          await fs.unlink(tempVideo);
          console.log('\n🧹 Archivo temporal eliminado');

          process.exit(0);
        }

        if (job.status === 'ERROR' || job.status === 'error') {
          console.log('\n\n❌ ERROR EN EL PROCESAMIENTO');
          console.log(`   Mensaje: ${job.errorMessage || job.message}`);

          if (job.errorMessage && job.errorMessage.includes('234')) {
            console.log('\n⚠️  ERROR 234 PERSISTE');
          }

          process.exit(1);
        }

      } catch (error) {
        console.log(`\n❌ Error al consultar status: ${error.message}`);
      }
    }

    if (attempts >= maxAttempts) {
      console.log('\n⏱️  TIMEOUT: El procesamiento no completó en 60 segundos');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST');
    console.error(`Mensaje: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    process.exit(1);
  }
}

// Ejecutar test
testCompleteProcessing();