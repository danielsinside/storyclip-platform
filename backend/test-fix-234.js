#!/usr/bin/env node

/**
 * Test para validar que el fix del error 234 funciona correctamente
 */

const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('./utils/ffmpeg');

async function testFix234() {
  console.log('🧪 TEST: VALIDACIÓN DEL FIX ERROR 234');
  console.log('======================================');

  try {
    // 1. Usar un video de prueba existente
    const testVideos = [
      '/srv/storyclip/work/job_1761680103688_x3ksl2vi/source.mp4',
      '/srv/storyclip/work/job_1761679353489_l4f75ybr/source.mp4',
      '/srv/storyclip/work/job_1761676310763_1n4v885n/source.mp4'
    ];

    let inputPath = null;
    for (const video of testVideos) {
      if (await fs.pathExists(video)) {
        inputPath = video;
        break;
      }
    }

    if (!inputPath) {
      console.log('❌ No se encontró ningún video de prueba');
      process.exit(1);
    }

    console.log(`✅ Video de prueba encontrado: ${inputPath}`);

    // 2. Crear directorio temporal para el test
    const testDir = `/tmp/test_fix_234_${Date.now()}`;
    await fs.ensureDir(testDir);
    console.log(`✅ Directorio de prueba creado: ${testDir}`);

    // 3. Intentar crear un clip con el fix aplicado
    console.log('\n🎬 Creando clip de prueba con filtros...');

    const outputPath = path.join(testDir, 'clip_test.mp4');

    await ffmpeg.createSingleClip(inputPath, outputPath, {
      startTime: 0,
      duration: 5,
      quality: 'high',
      aspectRatio: '9:16',
      resolution: '720x1280',
      fps: 30,
      videoBitrate: '2000k',
      audioBitrate: '128k',
      preset: 'fast',
      crf: 23,
      format: 'mp4',
      videoCodec: 'libx264',
      audioCodec: 'aac',
      clip: { index: 1, startTime: 0, duration: 5 },
      body: { filters: {}, effects: {}, overlays: {} },
      jobId: 'test_fix_234',
      clipIndex: 0
    });

    // 4. Verificar que el archivo se creó
    if (await fs.pathExists(outputPath)) {
      const stats = await fs.stat(outputPath);
      console.log(`\n✅ ÉXITO: Clip creado correctamente`);
      console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Ruta: ${outputPath}`);

      // Limpiar
      await fs.remove(testDir);
      console.log(`\n🧹 Directorio de prueba eliminado`);

      console.log(`\n✨ TEST EXITOSO ✨`);
      console.log(`==================`);
      console.log(`✅ Error 234 SOLUCIONADO`);
      console.log(`✅ Los clips se pueden crear correctamente`);
      console.log(`✅ El sistema de procesamiento está funcionando`);

      process.exit(0);
    } else {
      console.log(`\n❌ ERROR: No se creó el archivo de salida`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ ERROR EN EL TEST`);
    console.error(`Mensaje: ${error.message}`);

    if (error.message.includes('234')) {
      console.error(`\n⚠️  ERROR 234 PERSISTE - El fix no funcionó`);
    }

    process.exit(1);
  }
}

// Ejecutar test
testFix234();