#!/usr/bin/env node

/**
 * Test de sincronización de jobs entre jobManager y API
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');

const BASE_URL = 'http://localhost:3000';

async function testJobSync() {
  console.log('🧪 TEST DE SINCRONIZACIÓN DE JOBS');
  console.log('====================================');

  try {
    // 1. Listar jobs actuales
    console.log('\n📋 Listando jobs existentes...');
    const listResponse = await axios.get(`${BASE_URL}/api/jobs`);
    console.log(`   Jobs en sistema: ${listResponse.data.total}`);

    // 2. Crear un video de prueba pequeño
    const testVideo = `/tmp/test_job_sync_${Date.now()}.mp4`;
    const mp4Data = Buffer.alloc(10000, 0x00); // 10KB dummy video
    await fs.writeFile(testVideo, mp4Data);
    console.log('\n✅ Video de prueba creado');

    // 3. Upload
    console.log('\n📤 Subiendo video...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testVideo), {
      filename: 'test_sync.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${BASE_URL}/api/videos/upload`, formData, {
      headers: formData.getHeaders(),
      timeout: 10000
    });

    console.log('✅ Upload exitoso');
    console.log(`   Upload ID: ${uploadResponse.data.uploadId}`);

    // 4. Iniciar procesamiento
    console.log('\n🎬 Iniciando procesamiento...');
    const processBody = {
      uploadId: uploadResponse.data.uploadId,
      mode: 'manual',
      clips: [{ start: 0, end: 5 }]
    };

    const processResponse = await axios.post(`${BASE_URL}/api/process-video`, processBody, {
      timeout: 10000
    });

    const jobId = processResponse.data.jobId;
    console.log(`✅ Job creado: ${jobId}`);

    // 5. Esperar un momento para que se registre
    await new Promise(resolve => setTimeout(resolve, 500));

    // 6. Verificar que el job existe en el sistema
    console.log('\n🔍 Verificando job en el sistema...');

    // Verificar en /api/jobs
    const allJobsResponse = await axios.get(`${BASE_URL}/api/jobs`);
    const foundInList = allJobsResponse.data.jobs.some(j => j.id === jobId);
    console.log(`   En /api/jobs: ${foundInList ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);

    // Verificar en /api/jobs/:jobId/status
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}/status`);
      console.log(`   En /api/jobs/${jobId}/status: ✅ ENCONTRADO`);
      console.log(`     Status: ${statusResponse.data.status}`);
      console.log(`     Progress: ${statusResponse.data.progress}%`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   En /api/jobs/${jobId}/status: ❌ NO ENCONTRADO (404)`);
        console.log(`     Error: ${error.response.data.message}`);
      } else {
        console.log(`   En /api/jobs/${jobId}/status: ❌ ERROR`);
        console.log(`     Error: ${error.message}`);
      }
    }

    // Limpiar
    await fs.unlink(testVideo);
    console.log('\n🧹 Archivo de prueba eliminado');

    // Resultado
    console.log('\n📊 DIAGNÓSTICO:');
    if (foundInList) {
      console.log('✅ Jobs se están registrando correctamente en jobManager');
      console.log('✅ El endpoint /api/jobs funciona');
    } else {
      console.log('❌ Jobs NO se están registrando en jobManager');
      console.log('⚠️  Posible problema en robust-processing.service.js línea 145');
    }

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
testJobSync();
