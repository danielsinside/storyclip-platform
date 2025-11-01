#!/usr/bin/env node

/**
 * Test de procesamiento real end-to-end
 */

const path = require('path');
const fs = require('fs-extra');
const uploadsRepo = require('./services/uploads.repository');
const robustProcessing = require('./services/robust-processing.service');

async function testRealProcessing() {
  console.log('🧪 TEST DE PROCESAMIENTO REAL END-TO-END');
  console.log('==========================================');

  try {
    // 1. Preparar archivo de prueba
    const sourceFile = '/srv/storyclip/outputs/uploads/upl_1761607753397_5hzjc8.mp4';

    if (!await fs.pathExists(sourceFile)) {
      console.error(`❌ Archivo fuente no existe: ${sourceFile}`);
      process.exit(1);
    }

    console.log(`✅ Archivo fuente encontrado: ${sourceFile}`);
    const stats = await fs.stat(sourceFile);
    console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // 2. Registrar upload en el repositorio
    const uploadId = `test_upl_${Date.now()}`;
    uploadsRepo.set(uploadId, {
      path: sourceFile,
      size: stats.size,
      createdAt: Date.now()
    });

    console.log(`\n✅ Upload registrado: ${uploadId}`);

    // 3. Iniciar procesamiento con 3 clips pequeños
    console.log(`\n🎬 Iniciando procesamiento...`);
    console.log(`   Modo: manual`);
    console.log(`   Clips: 3 (5 segundos cada uno)`);

    const result = await robustProcessing.startProcess({
      uploadId,
      mode: 'manual',
      clips: [
        { start: 0, end: 5 },
        { start: 6, end: 11 },
        { start: 12, end: 17 }
      ],
      filters: {},
      effects: {
        filter: {
          type: 'none',
          intensity: 50
        }
      },
      overlays: {},
      audio: {},
      cameraMovement: {},
      metadata: {},
      userId: null
    });

    console.log(`\n✅ Procesamiento iniciado:`);
    console.log(`   Job ID: ${result.jobId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);

    // 4. Monitorear el progreso
    console.log(`\n⏳ Monitoreando progreso del job...`);

    let attempts = 0;
    const maxAttempts = 60; // 60 segundos

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const status = await robustProcessing.getJobStatus(result.jobId);

      if (!status) {
        console.log(`\n❌ No se pudo obtener el status del job`);
        break;
      }

      process.stdout.write(`\r⏳ Progreso: ${status.progress}% - ${status.message || status.status}      `);

      if (status.status === 'done') {
        console.log(`\n\n✅ JOB COMPLETADO EXITOSAMENTE`);
        console.log(`   Total clips: ${status.totalClips}`);
        console.log(`   Tiempo: ${attempts} segundos`);

        if (status.result && status.result.artifacts) {
          console.log(`\n📹 Clips generados:`);
          status.result.artifacts.forEach((artifact, idx) => {
            console.log(`   ${idx + 1}. ${artifact.filename}`);
            console.log(`      URL: ${artifact.url}`);
            console.log(`      Tamaño: ${(artifact.size / 1024 / 1024).toFixed(2)} MB`);
          });
        }

        console.log(`\n✨ TEST EXITOSO ✨`);
        console.log(`================`);
        console.log(`✅ El sistema de procesamiento funciona correctamente`);
        console.log(`✅ No se produjo error 234`);
        console.log(`✅ Todos los clips se generaron exitosamente`);

        process.exit(0);
      }

      if (status.status === 'error') {
        console.log(`\n\n❌ JOB FALLÓ`);
        console.log(`   Error: ${status.message}`);

        // Mostrar últimas líneas de logs
        console.log(`\n📝 Últimos logs del error:`);
        const { execSync } = require('child_process');
        try {
          const logs = execSync(`pm2 logs storyclip --lines 20 --nostream`, { encoding: 'utf8' });
          console.log(logs);
        } catch (e) {
          console.log('No se pudieron leer los logs');
        }

        process.exit(1);
      }
    }

    if (attempts >= maxAttempts) {
      console.log(`\n\n⏱️  TIMEOUT: El job no completó en ${maxAttempts} segundos`);
      console.log(`   Última información disponible:`);
      const finalStatus = await robustProcessing.getJobStatus(result.jobId);
      console.log(`   Status: ${finalStatus.status}`);
      console.log(`   Progreso: ${finalStatus.progress}%`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ ERROR EN EL TEST`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Ejecutar test
testRealProcessing();
