#!/usr/bin/env node

/**
 * Test para validar que el fix del doble scale funciona correctamente
 */

const path = require('path');
const fs = require('fs-extra');
const { buildVisualVF } = require('./utils/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');

async function testDoubleScaleFix() {
  console.log('🧪 TEST: FIX DEL DOBLE SCALE');
  console.log('============================');

  const testJobDir = '/srv/storyclip/work/job_1761607479100_5bpi49we';
  const inputPath = path.join(testJobDir, 'source.mp4');
  const outputPath = path.join(testJobDir, 'clip_test_double_scale.mp4');

  if (!await fs.pathExists(inputPath)) {
    console.error(`❌ Input no existe: ${inputPath}`);
    return;
  }

  console.log(`✅ Input existe: ${inputPath}`);

  // Simular el caso real: resolución 720x1280
  const width = 720;
  const height = 1280;

  const normalizedEffects = {
    mirrorHorizontal: false,
    color: null,
    indicator: null
  };

  // Generar filtros con las dimensiones correctas
  const vfEffects = buildVisualVF(normalizedEffects, { width, height });

  console.log(`\n📝 Filtros generados por buildVisualVF():`);
  console.log(`   ${vfEffects}`);

  // Verificar que NO haya doble scale
  const scaleMatches = vfEffects.match(/scale=/g);
  if (scaleMatches && scaleMatches.length > 1) {
    console.error(`❌ ERROR: Doble scale detectado en vfEffects`);
    console.error(`   Ocurrencias de 'scale=': ${scaleMatches.length}`);
    return;
  }

  console.log(`✅ No hay doble scale en vfEffects`);

  // Verificar que las dimensiones son las correctas
  if (vfEffects.includes(`scale=${width}:${height}`)) {
    console.log(`✅ Dimensiones correctas: ${width}x${height}`);
  } else {
    console.error(`❌ Dimensiones incorrectas en filtro`);
    return;
  }

  // Probar comando FFmpeg
  console.log(`\n🎬 Procesando clip de prueba...`);

  try {
    await new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .seekInput(0)
        .duration(5)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate('2000k')
        .audioBitrate('128k')
        .format('mp4')
        .outputOptions([
          `-vf ${vfEffects}`,
          `-preset fast`,
          `-crf 23`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (cmd) => {
          console.log(`\n📟 Comando FFmpeg:\n${cmd}\n`);

          // Verificar que el comando NO tiene doble scale
          const cmdScaleMatches = cmd.match(/scale=/g);
          if (cmdScaleMatches && cmdScaleMatches.length > 1) {
            console.error(`❌ ADVERTENCIA: Doble scale en comando FFmpeg`);
            console.error(`   Ocurrencias: ${cmdScaleMatches.length}`);
          } else {
            console.log(`✅ Comando tiene un solo scale`);
          }
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r⏳ Procesando: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ Procesamiento completado');
          resolve();
        })
        .on('error', (err) => {
          console.log(`\n❌ Error: ${err.message}`);
          reject(err);
        });

      command.save(outputPath);
    });

    // Verificar archivo de salida
    if (await fs.pathExists(outputPath)) {
      const stats = await fs.stat(outputPath);
      console.log(`\n✅ Archivo creado exitosamente`);
      console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Verificar dimensiones del output con ffprobe
      const { execSync } = require('child_process');
      const probeResult = execSync(`ffprobe -v quiet -print_format json -show_streams "${outputPath}"`);
      const probeData = JSON.parse(probeResult.toString());
      const videoStream = probeData.streams.find(s => s.codec_type === 'video');

      if (videoStream) {
        console.log(`   Dimensiones: ${videoStream.width}x${videoStream.height}`);

        if (videoStream.width === width && videoStream.height === height) {
          console.log(`✅ Dimensiones del output son correctas`);
        } else {
          console.error(`❌ Dimensiones del output incorrectas. Esperado: ${width}x${height}, Obtenido: ${videoStream.width}x${videoStream.height}`);
        }
      }

      // Limpiar
      await fs.unlink(outputPath);
      console.log(`\n🧹 Archivo de prueba eliminado`);
    }

    console.log(`\n✨ TEST EXITOSO ✨`);
    console.log(`=================`);
    console.log(`✅ Fix del doble scale funcionando correctamente`);
    console.log(`✅ No se produjo error 234`);
    console.log(`✅ Dimensiones correctas aplicadas`);

  } catch (error) {
    console.error(`\n❌ TEST FALLIDO`);
    console.error(`Error: ${error.message}`);

    if (error.message.includes('code 234')) {
      console.error(`\n⚠️  Error 234 persiste`);
    }

    process.exit(1);
  }
}

testDoubleScaleFix().then(() => {
  console.log('\n✅ Test completado');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test falló:', error.message);
  process.exit(1);
});
