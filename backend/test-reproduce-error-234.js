#!/usr/bin/env node

/**
 * Script para reproducir el error 234 con fluent-ffmpeg
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');

async function reproduceError234() {
  console.log('🔬 REPRODUCIENDO ERROR 234');
  console.log('==========================');

  const testJobDir = '/srv/storyclip/work/job_1761594833007_38dmyk1z';
  const inputPath = path.join(testJobDir, 'source.mp4');
  const outputPath = path.join(testJobDir, 'clip_001.mp4');

  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);

  // Verificar que el input existe
  if (!await fs.pathExists(inputPath)) {
    console.error(`❌ Input file does not exist: ${inputPath}`);
    return;
  }

  console.log(`✅ Input file exists`);

  // Verificar que el directorio de salida es escribible
  if (!await fs.pathExists(testJobDir)) {
    console.error(`❌ Output directory does not exist: ${testJobDir}`);
    return;
  }

  console.log(`✅ Output directory exists`);

  // Construir los filtros exactamente como lo hace el código
  const width = 1080;
  const height = 1920;

  // CASO 1: Con comillas dobles (como en línea 468 de ffmpeg.js)
  const vfFinal = `scale=${width}:${height}:force_original_aspect_ratio=crop,crop=${width}:${height},format=yuv420p`;

  console.log(`\nCASO 1: Con comillas dobles en -vf`);
  console.log(`vfFinal: ${vfFinal}`);

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
          `-vf "${vfFinal}"`,  // CON COMILLAS DOBLES
          `-preset fast`,
          `-crf 23`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (cmd) => {
          console.log(`\nComando FFmpeg ejecutado:\n${cmd}\n`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\rProcesando: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ CASO 1 EXITOSO - Con comillas dobles funciona');
          resolve();
        })
        .on('error', (err) => {
          console.log(`\n❌ CASO 1 FALLÓ - Error: ${err.message}`);
          reject(err);
        });

      command.save(outputPath);
    });
  } catch (error) {
    console.error(`Error en CASO 1:`, error.message);
  }

  // Limpiar archivo de prueba si se creó
  if (await fs.pathExists(outputPath)) {
    await fs.unlink(outputPath);
    console.log(`Archivo de prueba eliminado`);
  }

  // CASO 2: Sin comillas (como en línea 543 de ffmpeg.js)
  console.log(`\n\nCASO 2: Sin comillas en -vf`);
  console.log(`vfFinal: ${vfFinal}`);

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
          `-vf ${vfFinal}`,  // SIN COMILLAS
          `-preset fast`,
          `-crf 23`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (cmd) => {
          console.log(`\nComando FFmpeg ejecutado:\n${cmd}\n`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\rProcesando: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ CASO 2 EXITOSO - Sin comillas funciona');
          resolve();
        })
        .on('error', (err) => {
          console.log(`\n❌ CASO 2 FALLÓ - Error: ${err.message}`);
          reject(err);
        });

      command.save(outputPath);
    });
  } catch (error) {
    console.error(`Error en CASO 2:`, error.message);
  }

  // Limpiar archivo de prueba si se creó
  if (await fs.pathExists(outputPath)) {
    await fs.unlink(outputPath);
    console.log(`Archivo de prueba eliminado`);
  }

  // CASO 3: Usando el método correcto de fluent-ffmpeg
  console.log(`\n\nCASO 3: Usando .videoFilters() en lugar de outputOptions`);
  console.log(`vfFinal: ${vfFinal}`);

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
        .videoFilters(vfFinal)  // USAR videoFilters() en lugar de outputOptions
        .outputOptions([
          `-preset fast`,
          `-crf 23`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (cmd) => {
          console.log(`\nComando FFmpeg ejecutado:\n${cmd}\n`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\rProcesando: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ CASO 3 EXITOSO - videoFilters() funciona');
          resolve();
        })
        .on('error', (err) => {
          console.log(`\n❌ CASO 3 FALLÓ - Error: ${err.message}`);
          reject(err);
        });

      command.save(outputPath);
    });
  } catch (error) {
    console.error(`Error en CASO 3:`, error.message);
  }

  // Limpiar archivo de prueba si se creó
  if (await fs.pathExists(outputPath)) {
    await fs.unlink(outputPath);
    console.log(`Archivo de prueba eliminado`);
  }

  console.log(`\n\n🏁 DIAGNÓSTICO COMPLETO`);
}

reproduceError234().then(() => {
  console.log('\nScript completado');
  process.exit(0);
}).catch(error => {
  console.error('\nScript falló:', error.message);
  process.exit(1);
});
