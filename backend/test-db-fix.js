#!/usr/bin/env node

/**
 * Script de prueba para verificar que el fix de la base de datos SQLite funciona correctamente
 * Problema original: SQLITE_MISUSE: Database is closed durante el procesamiento
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'http://localhost:3000/api';
const API_KEY = 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3'; // stories tenant

// Colores para la salida
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestVideo() {
  const testVideoPath = '/srv/storyclip/tmp/test_video_db.mp4';

  // Crear un video de prueba usando FFmpeg
  const { execSync } = require('child_process');
  const ffmpegCmd = `ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 \
    -f lavfi -i sine=frequency=1000:duration=10 \
    -c:v libx264 -c:a aac -shortest -y ${testVideoPath}`;

  log('📹 Creando video de prueba...', 'blue');
  execSync(ffmpegCmd, { stdio: 'ignore' });

  return testVideoPath;
}

async function testVideoProcessing() {
  log('=== PRUEBA DE FIX DE BASE DE DATOS SQLITE ===', 'yellow');

  try {
    // 1. Verificar salud del servidor
    log('\n1️⃣  Verificando salud del servidor...', 'blue');
    const healthResponse = await axios.get(`${API_BASE}/health/detailed`);

    if (healthResponse.data.database.status === 'connected') {
      log('✅ Base de datos conectada correctamente', 'green');
    } else {
      log('❌ Base de datos no está conectada', 'red');
      return false;
    }

    // 2. Crear video de prueba
    log('\n2️⃣  Preparando video de prueba...', 'blue');
    const testVideoPath = await createTestVideo();
    const videoBuffer = await fs.readFile(testVideoPath);
    log(`✅ Video de prueba creado: ${testVideoPath}`, 'green');

    // 3. Subir el video
    log('\n3️⃣  Subiendo video al servidor...', 'blue');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', videoBuffer, {
      filename: 'test_video.mp4',
      contentType: 'video/mp4'
    });

    const uploadResponse = await axios.post(`${API_BASE}/videos/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'x-api-key': API_KEY
      }
    });

    if (!uploadResponse.data.url) {
      throw new Error('No se obtuvo URL del video subido');
    }

    const videoUrl = uploadResponse.data.url;
    log(`✅ Video subido exitosamente: ${videoUrl}`, 'green');

    // 4. Iniciar procesamiento
    log('\n4️⃣  Iniciando procesamiento del video...', 'blue');
    const processResponse = await axios.post(`${API_BASE}/process`, {
      videoUrl: videoUrl,
      distribution: JSON.stringify({
        type: 'fixed_count',
        count: 3
      }),
      filters: JSON.stringify({
        colorspace: 'bt709',
        sar: '1:1',
        max_muxing_queue_size: 9999
      })
    }, {
      headers: {
        'x-api-key': API_KEY
      }
    });

    const jobId = processResponse.data.jobId;
    log(`✅ Procesamiento iniciado - Job ID: ${jobId}`, 'green');

    // 5. Monitorear el progreso del job
    log('\n5️⃣  Monitoreando progreso del procesamiento...', 'blue');
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos máximo
    let lastStatus = null;
    let lastProgress = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo

      try {
        const statusResponse = await axios.get(`${API_BASE}/jobs/${jobId}/status`, {
          headers: {
            'x-api-key': API_KEY
          }
        });
        const status = statusResponse.data;

        if (status.status !== lastStatus || status.progress !== lastProgress) {
          lastStatus = status.status;
          lastProgress = status.progress;
          process.stdout.write(`\r📊 Estado: ${status.status} | Progreso: ${status.progress}% `);
        }

        if (status.status === 'done') {
          log('\n✅ Procesamiento completado exitosamente!', 'green');
          log(`🎬 Clips generados: ${status.outputUrls ? status.outputUrls.length : 0}`, 'green');

          // Verificar que los clips existan
          if (status.outputUrls && status.outputUrls.length > 0) {
            log('\n📋 URLs de los clips generados:', 'blue');
            status.outputUrls.forEach((url, index) => {
              log(`   Clip ${index + 1}: ${url}`, 'green');
            });
          }

          // Limpiar
          await fs.remove(testVideoPath);

          return true;
        }

        if (status.status === 'error') {
          log(`\n❌ Error en el procesamiento: ${status.message}`, 'red');

          // Verificar si el error es relacionado con la base de datos
          if (status.message && status.message.includes('database')) {
            log('⚠️  El error parece estar relacionado con la base de datos', 'yellow');
            log('❌ El fix NO resolvió el problema completamente', 'red');
          }

          return false;
        }

      } catch (error) {
        log(`\n⚠️  Error al obtener estado: ${error.message}`, 'yellow');
      }

      attempts++;
    }

    log('\n⏱️  Timeout: El procesamiento está tardando demasiado', 'yellow');
    return false;

  } catch (error) {
    log(`\n❌ Error durante la prueba: ${error.message}`, 'red');

    // Analizar el tipo de error
    if (error.message.includes('SQLITE_MISUSE') || error.message.includes('Database is closed')) {
      log('🔴 ERROR CRÍTICO: El problema de la base de datos persiste', 'red');
      log('   El fix NO resolvió el problema', 'red');
    } else if (error.message.includes('ECONNREFUSED')) {
      log('⚠️  El servidor no está respondiendo', 'yellow');
    }

    if (error.response) {
      log(`   Respuesta del servidor: ${JSON.stringify(error.response.data)}`, 'red');
    }

    return false;
  }
}

// Función para verificar logs del servidor en busca de errores de DB
async function checkServerLogs() {
  log('\n6️⃣  Verificando logs del servidor...', 'blue');

  try {
    const { execSync } = require('child_process');
    const logs = execSync('pm2 logs storyclip --lines 50 --nostream 2>&1 | grep -E "SQLITE_MISUSE|Database is closed|database" || true', { encoding: 'utf8' });

    if (logs.includes('SQLITE_MISUSE') || logs.includes('Database is closed')) {
      log('⚠️  Se encontraron errores de base de datos en los logs recientes', 'yellow');
      console.log(logs);
      return false;
    } else {
      log('✅ No se encontraron errores de base de datos en los logs recientes', 'green');
      return true;
    }
  } catch (error) {
    log('⚠️  No se pudieron verificar los logs', 'yellow');
    return true;
  }
}

// Ejecutar las pruebas
async function runTests() {
  log('\n🚀 Iniciando pruebas del fix de base de datos...', 'yellow');
  log('================================================\n', 'yellow');

  const testResult = await testVideoProcessing();
  const logsClean = await checkServerLogs();

  log('\n================================================', 'yellow');
  log('📊 RESUMEN DE RESULTADOS:', 'yellow');
  log('================================================', 'yellow');

  if (testResult && logsClean) {
    log('✅ TODAS LAS PRUEBAS PASARON', 'green');
    log('✅ El fix de la base de datos funciona correctamente', 'green');
    log('✅ No se detectaron errores SQLITE_MISUSE', 'green');
    log('\n🎉 ¡El problema ha sido resuelto exitosamente!', 'green');
    process.exit(0);
  } else {
    log('❌ ALGUNAS PRUEBAS FALLARON', 'red');

    if (!testResult) {
      log('❌ El procesamiento de video falló', 'red');
    }

    if (!logsClean) {
      log('❌ Se encontraron errores de base de datos en los logs', 'red');
    }

    log('\n⚠️  El problema podría no estar completamente resuelto', 'yellow');
    log('   Revisa los logs para más detalles: pm2 logs storyclip', 'yellow');

    process.exit(1);
  }
}

// Manejar interrupciones
process.on('SIGINT', () => {
  log('\n\n⚠️  Prueba interrumpida por el usuario', 'yellow');
  process.exit(1);
});

// Ejecutar
runTests().catch(error => {
  log(`\n💥 Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});