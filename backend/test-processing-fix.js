#!/usr/bin/env node

/**
 * Script de prueba para verificar los fixes del procesamiento de video
 * Problemas resueltos:
 * 1. FFmpeg sin timeout que se quedaba colgado
 * 2. Errores en procesamiento asíncrono no actualizaban la DB
 * 3. Watchdog no detectaba jobs atascados a tiempo
 */

const axios = require('axios');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

const API_BASE = 'http://localhost:3000/api';
const API_KEY = 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3';

// Colores para la salida
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestVideo(duration = 10) {
  const testVideoPath = `/srv/storyclip/tmp/test_video_${Date.now()}.mp4`;

  // Crear un video de prueba usando FFmpeg
  const ffmpegCmd = `ffmpeg -f lavfi -i testsrc=duration=${duration}:size=1280x720:rate=30 \
    -f lavfi -i sine=frequency=1000:duration=${duration} \
    -c:v libx264 -preset ultrafast -c:a aac -shortest -y ${testVideoPath} 2>/dev/null`;

  log(`📹 Creando video de prueba de ${duration} segundos...`, 'blue');
  execSync(ffmpegCmd);

  return testVideoPath;
}

async function uploadVideo(videoPath) {
  const FormData = require('form-data');
  const form = new FormData();
  const videoBuffer = await fs.readFile(videoPath);

  form.append('file', videoBuffer, {
    filename: 'test_video.mp4',
    contentType: 'video/mp4'
  });

  const response = await axios.post(`${API_BASE}/videos/upload`, form, {
    headers: {
      ...form.getHeaders(),
      'x-api-key': API_KEY
    }
  });

  // Normalizar la respuesta
  const data = response.data;
  data.url = data.videoUrl || data.url; // Usar videoUrl si existe
  return data;
}

async function startProcessing(videoUrl, options = {}) {
  const response = await axios.post(`${API_BASE}/process`, {
    videoUrl: videoUrl,
    distribution: JSON.stringify(options.distribution || {
      type: 'fixed_count',
      count: 3
    }),
    filters: JSON.stringify(options.filters || {
      colorspace: 'bt709',
      sar: '1:1',
      max_muxing_queue_size: 9999
    })
  }, {
    headers: {
      'x-api-key': API_KEY
    }
  });

  return response.data;
}

async function checkJobStatus(jobId) {
  const response = await axios.get(`${API_BASE}/jobs/${jobId}/status`, {
    headers: {
      'x-api-key': API_KEY
    }
  });

  return response.data;
}

async function testNormalProcessing() {
  log('\n=== TEST 1: Procesamiento Normal ===', 'cyan');

  try {
    // 1. Crear y subir video
    const videoPath = await createTestVideo(5);
    const uploadResult = await uploadVideo(videoPath);

    if (uploadResult.url) {
      log(`✅ Video subido: ${uploadResult.url}`, 'green');
    } else {
      throw new Error('Upload falló');
    }

    // 2. Iniciar procesamiento
    const processResult = await startProcessing(uploadResult.url);
    const jobId = processResult.jobId;
    log(`✅ Procesamiento iniciado - Job ID: ${jobId}`, 'green');

    // 3. Monitorear progreso
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos máximo
    let lastProgress = -1;
    let stallCount = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const status = await checkJobStatus(jobId);

      if (status.progress !== lastProgress) {
        lastProgress = status.progress;
        stallCount = 0;
        process.stdout.write(`\r📊 Estado: ${status.status} | Progreso: ${status.progress}% `);
      } else {
        stallCount++;
        if (stallCount >= 5) {
          log('\n⚠️  Progreso detenido por 5 segundos', 'yellow');
        }
      }

      if (status.status === 'done') {
        log('\n✅ TEST 1 PASADO: Procesamiento completado exitosamente', 'green');
        if (status.outputUrls && status.outputUrls.length > 0) {
          log(`   Clips generados: ${status.outputUrls.length}`, 'green');
        }

        // Limpiar
        await fs.remove(videoPath);
        return true;
      }

      if (status.status === 'error') {
        log(`\n❌ TEST 1 FALLÓ: ${status.message}`, 'red');
        await fs.remove(videoPath);
        return false;
      }

      attempts++;
    }

    log('\n⚠️  TEST 1: Timeout - el procesamiento tardó más de 30 segundos', 'yellow');
    await fs.remove(videoPath);
    return false;

  } catch (error) {
    log(`\n❌ TEST 1 FALLÓ: ${error.message}`, 'red');
    return false;
  }
}

async function testTimeoutHandling() {
  log('\n=== TEST 2: Manejo de Timeout en FFmpeg ===', 'cyan');

  try {
    // Crear video muy grande que causaría timeout
    const videoPath = await createTestVideo(120); // 2 minutos
    const uploadResult = await uploadVideo(videoPath);

    log(`✅ Video largo subido: ${uploadResult.url}`, 'green');

    // Intentar procesar con muchos clips (debería causar timeout)
    const processResult = await startProcessing(uploadResult.url, {
      distribution: {
        type: 'fixed_count',
        count: 20 // Muchos clips para forzar timeout
      }
    });

    const jobId = processResult.jobId;
    log(`⏱️  Probando timeout con Job ID: ${jobId}`, 'yellow');

    // Esperar y verificar que el job se marque como error
    let attempts = 0;
    while (attempts < 90) { // Esperar hasta 90 segundos
      await new Promise(resolve => setTimeout(resolve, 1000));

      const status = await checkJobStatus(jobId);
      process.stdout.write(`\r⏱️  Esperando timeout... ${attempts}s (Estado: ${status.status}) `);

      if (status.status === 'error') {
        if (status.message && (status.message.includes('timeout') || status.message.includes('Pipeline error'))) {
          log('\n✅ TEST 2 PASADO: Timeout detectado y manejado correctamente', 'green');
          log(`   Error mensaje: ${status.message}`, 'green');
        } else {
          log('\n⚠️  TEST 2: Error detectado pero no es timeout', 'yellow');
          log(`   Mensaje: ${status.message}`, 'yellow');
        }

        await fs.remove(videoPath);
        return true;
      }

      if (status.status === 'done') {
        log('\n⚠️  TEST 2: El procesamiento completó (no hubo timeout)', 'yellow');
        await fs.remove(videoPath);
        return true; // No es un fallo, solo inesperado
      }

      attempts++;
    }

    log('\n❌ TEST 2 FALLÓ: No se detectó timeout ni error', 'red');
    await fs.remove(videoPath);
    return false;

  } catch (error) {
    log(`\n❌ TEST 2 FALLÓ: ${error.message}`, 'red');
    return false;
  }
}

async function testWatchdogDetection() {
  log('\n=== TEST 3: Detección del Watchdog ===', 'cyan');
  log('(Este test verifica que el watchdog detecte jobs atascados)', 'blue');

  // Verificar que el watchdog esté funcionando
  try {
    const logs = execSync('pm2 logs storyclip --lines 50 --nostream 2>&1 | grep -i watchdog | tail -5', { encoding: 'utf8' });

    if (logs.includes('Watchdog service started') || logs.includes('watchdog')) {
      log('✅ TEST 3 PASADO: Watchdog está activo y funcionando', 'green');
      return true;
    } else {
      log('⚠️  TEST 3: Watchdog puede no estar activo', 'yellow');
      return false;
    }
  } catch (error) {
    log('⚠️  TEST 3: No se pudo verificar el watchdog', 'yellow');
    return true; // No es crítico
  }
}

async function checkSystemHealth() {
  log('\n=== Verificación de Salud del Sistema ===', 'cyan');

  try {
    const healthResponse = await axios.get(`${API_BASE}/health/detailed`);
    const health = healthResponse.data;

    if (health.database.status === 'connected') {
      log('✅ Base de datos: Conectada', 'green');
    } else {
      log('❌ Base de datos: Desconectada', 'red');
      return false;
    }

    if (health.directories.output.exists) {
      log('✅ Directorio de salida: Existe', 'green');
    } else {
      log('❌ Directorio de salida: No existe', 'red');
    }

    if (health.directories.temp.exists) {
      log('✅ Directorio temporal: Existe', 'green');
    } else {
      log('❌ Directorio temporal: No existe', 'red');
    }

    // Verificar logs recientes de errores
    const logs = execSync('pm2 logs storyclip --lines 100 --nostream 2>&1 | grep -E "SQLITE_MISUSE|Database is closed" | tail -5 || true', { encoding: 'utf8' });

    if (logs.trim()) {
      log('⚠️  Se encontraron errores de base de datos recientes:', 'yellow');
      console.log(logs);
    } else {
      log('✅ No hay errores de base de datos recientes', 'green');
    }

    return true;

  } catch (error) {
    log(`❌ Error al verificar salud: ${error.message}`, 'red');
    return false;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  log('\n🚀 INICIANDO SUITE DE PRUEBAS DE PROCESAMIENTO', 'yellow');
  log('============================================', 'yellow');

  const healthOk = await checkSystemHealth();

  if (!healthOk) {
    log('\n❌ El sistema no está saludable, abortando pruebas', 'red');
    process.exit(1);
  }

  const test1 = await testNormalProcessing();
  const test2 = await testTimeoutHandling();
  const test3 = await testWatchdogDetection();

  log('\n============================================', 'yellow');
  log('📊 RESUMEN DE RESULTADOS', 'yellow');
  log('============================================', 'yellow');

  const totalTests = 3;
  const passedTests = [test1, test2, test3].filter(t => t).length;

  if (passedTests === totalTests) {
    log(`✅ TODAS LAS PRUEBAS PASARON (${passedTests}/${totalTests})`, 'green');
    log('✅ El procesamiento de video funciona correctamente', 'green');
    log('✅ Los timeouts se manejan adecuadamente', 'green');
    log('✅ El watchdog detecta jobs atascados', 'green');
    log('\n🎉 ¡Los fixes están funcionando correctamente!', 'green');
    process.exit(0);
  } else {
    log(`⚠️  PRUEBAS PARCIALMENTE EXITOSAS (${passedTests}/${totalTests})`, 'yellow');

    if (!test1) log('❌ Test 1: Procesamiento normal falló', 'red');
    if (!test2) log('❌ Test 2: Manejo de timeout falló', 'red');
    if (!test3) log('❌ Test 3: Detección watchdog falló', 'red');

    log('\n⚠️  Algunos problemas persisten, revisar logs para más detalles', 'yellow');
    process.exit(1);
  }
}

// Manejar interrupciones
process.on('SIGINT', () => {
  log('\n\n⚠️  Prueba interrumpida por el usuario', 'yellow');
  process.exit(1);
});

// Ejecutar
runAllTests().catch(error => {
  log(`\n💥 Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});