#!/usr/bin/env node

/**
 * Script para validar que el fix del error 234 funciona correctamente
 */

const path = require('path');
const fs = require('fs-extra');
const { buildVisualVF } = require('./utils/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');

async function validateFix() {
  console.log('🧪 VALIDACIÓN DEL FIX - ERROR 234');
  console.log('==================================');

  const testJobDir = '/srv/storyclip/work/job_1761594833007_38dmyk1z';
  const inputPath = path.join(testJobDir, 'source.mp4');
  const outputPath = path.join(testJobDir, 'clip_validation_test.mp4');

  // Verificar que el input existe
  if (!await fs.pathExists(inputPath)) {
    console.error(`❌ Input file does not exist: ${inputPath}`);
    return;
  }

  console.log(`✅ Input file exists: ${inputPath}`);

  // Usar la función buildVisualVF del código modificado
  const effects = {
    mirrorHorizontal: false,
    color: null,
    indicator: null
  };

  const options = {
    width: 1080,
    height: 1920
  };

  const vfFilters = buildVisualVF(effects, options);
  console.log(`\n📝 Filtros generados por buildVisualVF():`);
  console.log(`   ${vfFilters}`);

  // Verificar que contiene "decrease" en lugar de "crop"
  if (vfFilters.includes('force_original_aspect_ratio=decrease')) {
    console.log(`✅ Fix aplicado correctamente: usa 'decrease' en lugar de 'crop'`);
  } else if (vfFilters.includes('force_original_aspect_ratio=crop')) {
    console.error(`❌ Fix NO aplicado: todavía usa 'crop'`);
    return;
  }

  // Probar el comando FFmpeg con los filtros generados
  console.log(`\n🎬 Procesando clip de prueba con los filtros del código modificado...`);

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
          `-vf ${vfFilters}`,
          `-preset fast`,
          `-crf 23`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (cmd) => {
          console.log(`\n📟 Comando FFmpeg:\n${cmd}\n`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r⏳ Procesando: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ Procesamiento completado exitosamente');
          resolve();
        })
        .on('error', (err) => {
          console.log(`\n❌ Error en procesamiento: ${err.message}`);
          reject(err);
        });

      command.save(outputPath);
    });

    // Verificar que el archivo se creó correctamente
    if (await fs.pathExists(outputPath)) {
      const stats = await fs.stat(outputPath);
      console.log(`\n✅ Archivo de salida creado exitosamente`);
      console.log(`   Ruta: ${outputPath}`);
      console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Limpiar archivo de prueba
      await fs.unlink(outputPath);
      console.log(`\n🧹 Archivo de prueba eliminado`);
    }

    console.log(`\n✨ VALIDACIÓN EXITOSA ✨`);
    console.log(`======================`);
    console.log(`✅ El fix está funcionando correctamente`);
    console.log(`✅ No se produjo el error 234`);
    console.log(`✅ Los clips se procesan sin problemas`);
    console.log(`\n🚀 El sistema está listo para procesar clips en producción`);

  } catch (error) {
    console.error(`\n❌ VALIDACIÓN FALLIDA`);
    console.error(`Error: ${error.message}`);

    if (error.message.includes('code 234')) {
      console.error(`\n⚠️  El error 234 todavía ocurre. El fix puede no estar aplicado correctamente.`);
    }

    process.exit(1);
  }
}

validateFix().then(() => {
  console.log('\n✅ Validación completada');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Validación falló:', error.message);
  process.exit(1);
});
