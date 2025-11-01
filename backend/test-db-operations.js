#!/usr/bin/env node

/**
 * Prueba directa de operaciones de base de datos con reconexión automática
 */

const db = require('./database/db');
const { v4: uuidv4 } = require('uuid');

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

async function testDatabaseOperations() {
  log('\n🔧 PRUEBA DE OPERACIONES DE BASE DE DATOS CON RECONEXIÓN', 'yellow');
  log('========================================================\n', 'yellow');

  try {
    // 1. Inicializar base de datos
    log('1️⃣  Inicializando base de datos...', 'blue');
    await db.init();
    log('✅ Base de datos inicializada correctamente\n', 'green');

    // 2. Crear un job de prueba
    const jobId = uuidv4();
    log('2️⃣  Creando job de prueba...', 'blue');
    await db.run(
      `INSERT INTO jobs (job_id, path, status, progress, created_at) VALUES (?, ?, ?, ?, ?)`,
      [jobId, 'api', 'queued', 0, new Date().toISOString()]
    );
    log(`✅ Job creado: ${jobId}\n`, 'green');

    // 3. Actualizar el job varias veces (simulando procesamiento)
    log('3️⃣  Simulando procesamiento con múltiples actualizaciones...', 'blue');
    for (let i = 1; i <= 5; i++) {
      await db.run(
        `UPDATE jobs SET progress = ?, status = ? WHERE job_id = ?`,
        [i * 20, 'processing', jobId]
      );
      process.stdout.write(`\r   Progreso: ${i * 20}%`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    log('\n✅ Actualizaciones completadas\n', 'green');

    // 4. Simular cierre de conexión
    log('4️⃣  Simulando pérdida de conexión...', 'blue');
    await db.close();
    log('⚠️  Conexión cerrada manualmente\n', 'yellow');

    // 5. Intentar operación después del cierre (debe reconectar automáticamente)
    log('5️⃣  Intentando operación después del cierre...', 'blue');
    const job = await db.get(
      `SELECT * FROM jobs WHERE job_id = ?`,
      [jobId]
    );

    if (job) {
      log('✅ Reconexión automática exitosa!', 'green');
      log(`   Job recuperado: ${job.job_id}`, 'green');
      log(`   Estado: ${job.status}`, 'green');
      log(`   Progreso: ${job.progress}%\n`, 'green');
    }

    // 6. Operaciones concurrentes
    log('6️⃣  Probando operaciones concurrentes...', 'blue');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        db.run(
          `UPDATE jobs SET progress = ? WHERE job_id = ?`,
          [100, jobId]
        )
      );
    }
    await Promise.all(promises);
    log('✅ 10 operaciones concurrentes completadas exitosamente\n', 'green');

    // 7. Limpiar
    log('7️⃣  Limpiando datos de prueba...', 'blue');
    await db.run(`DELETE FROM jobs WHERE job_id = ?`, [jobId]);
    log('✅ Datos de prueba eliminados\n', 'green');

    return true;

  } catch (error) {
    log(`\n❌ Error durante las pruebas: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

// Función para simular procesamiento en background (como en el endpoint real)
async function testBackgroundProcessing() {
  log('\n📦 PRUEBA DE PROCESAMIENTO EN BACKGROUND', 'yellow');
  log('=========================================\n', 'yellow');

  const jobId = uuidv4();

  try {
    // Simular respuesta inmediata del endpoint
    log('1️⃣  Respondiendo inmediatamente (como el endpoint /api/process)...', 'blue');

    // Iniciar procesamiento en background
    setImmediate(async () => {
      log('2️⃣  Iniciando procesamiento asíncrono en background...', 'blue');

      try {
        // Crear job
        await db.run(
          `INSERT INTO jobs (job_id, path, status, progress, created_at) VALUES (?, ?, ?, ?, ?)`,
          [jobId, 'api', 'processing', 0, new Date().toISOString()]
        );

        // Simular procesamiento largo
        for (let i = 1; i <= 10; i++) {
          await db.run(
            `UPDATE jobs SET progress = ? WHERE job_id = ?`,
            [i * 10, jobId]
          );
          process.stdout.write(`\r   Progreso background: ${i * 10}%`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Marcar como completado
        await db.run(
          `UPDATE jobs SET status = ?, progress = ? WHERE job_id = ?`,
          ['done', 100, jobId]
        );

        log('\n✅ Procesamiento en background completado exitosamente', 'green');

      } catch (error) {
        log(`\n❌ Error en procesamiento background: ${error.message}`, 'red');

        if (error.message.includes('SQLITE_MISUSE') || error.message.includes('Database is closed')) {
          log('🔴 ERROR CRÍTICO: El problema de la base de datos persiste!', 'red');
        }
      }
    });

    // Simular que el endpoint ya respondió
    log('✅ Respuesta enviada al cliente (HTTP 202)\n', 'green');

    // Esperar a que termine el procesamiento en background
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verificar resultado final
    log('\n3️⃣  Verificando resultado final...', 'blue');
    const finalJob = await db.get(
      `SELECT * FROM jobs WHERE job_id = ?`,
      [jobId]
    );

    if (finalJob && finalJob.status === 'done' && finalJob.progress === 100) {
      log('✅ Job procesado correctamente en background', 'green');

      // Limpiar
      await db.run(`DELETE FROM jobs WHERE job_id = ?`, [jobId]);
      return true;
    } else {
      log('❌ El job no se procesó correctamente', 'red');
      return false;
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    return false;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  log('\n🚀 INICIANDO SUITE DE PRUEBAS DE BASE DE DATOS', 'yellow');
  log('==============================================', 'yellow');

  const test1 = await testDatabaseOperations();
  const test2 = await testBackgroundProcessing();

  log('\n==============================================', 'yellow');
  log('📊 RESUMEN DE RESULTADOS', 'yellow');
  log('==============================================', 'yellow');

  if (test1 && test2) {
    log('✅ TODAS LAS PRUEBAS PASARON', 'green');
    log('✅ La reconexión automática funciona correctamente', 'green');
    log('✅ El procesamiento en background es estable', 'green');
    log('\n🎉 ¡El fix de la base de datos SQLite está funcionando!', 'green');
    process.exit(0);
  } else {
    log('❌ ALGUNAS PRUEBAS FALLARON', 'red');

    if (!test1) {
      log('❌ Falló la prueba de operaciones básicas', 'red');
    }

    if (!test2) {
      log('❌ Falló la prueba de procesamiento en background', 'red');
    }

    log('\n⚠️  Revisa los errores anteriores para más detalles', 'yellow');
    process.exit(1);
  }
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  log(`\n💥 Error no manejado: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

// Ejecutar
runAllTests();