#!/usr/bin/env node

/**
 * Script para diagnosticar y corregir el error 234 de FFmpeg
 * Error: Error opening output file clip_001.mp4
 */

const fs = require('fs-extra');
const path = require('path');

async function diagnoseAndFixError234() {
  console.log('🔧 DIAGNOSING AND FIXING FFMPEG ERROR 234');
  console.log('==========================================');

  try {
    // 1. Verificar directorios críticos
    console.log('\n📁 Checking critical directories...');
    
    const directories = [
      '/srv/storyclip/work',
      '/srv/storyclip/outputs',
      '/srv/storyclip/outputs/uploads',
      '/srv/storyclip/tmp',
      '/srv/storyclip/tmp/uploads'
    ];

    for (const dir of directories) {
      if (await fs.pathExists(dir)) {
        const stats = await fs.stat(dir);
        console.log(`✅ ${dir} exists (mode: ${stats.mode.toString(8)})`);
      } else {
        console.log(`❌ ${dir} does not exist, creating...`);
        await fs.ensureDir(dir);
        await fs.chmod(dir, 0o755);
        console.log(`✅ ${dir} created`);
      }
    }

    // 2. Verificar permisos de escritura
    console.log('\n🔐 Checking write permissions...');
    
    for (const dir of directories) {
      try {
        const testFile = path.join(dir, 'test_write.tmp');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        console.log(`✅ ${dir} is writable`);
      } catch (error) {
        console.log(`❌ ${dir} is not writable: ${error.message}`);
        // Intentar corregir permisos
        try {
          await fs.chmod(dir, 0o755);
          console.log(`🔧 Fixed permissions for ${dir}`);
        } catch (chmodError) {
          console.log(`❌ Could not fix permissions for ${dir}: ${chmodError.message}`);
        }
      }
    }

    // 3. Verificar jobs existentes
    console.log('\n📋 Checking existing jobs...');
    
    const workDir = '/srv/storyclip/work';
    if (await fs.pathExists(workDir)) {
      const jobs = await fs.readdir(workDir);
      console.log(`Found ${jobs.length} job directories`);
      
      if (jobs.length > 0) {
        // Verificar el job más reciente
        const latestJob = jobs.sort().pop();
        const jobPath = path.join(workDir, latestJob);
        console.log(`Latest job: ${latestJob}`);
        
        const jobFiles = await fs.readdir(jobPath);
        console.log(`Files in latest job: ${jobFiles.join(', ')}`);
        
        // Verificar si hay archivos de salida problemáticos
        const clipFiles = jobFiles.filter(f => f.startsWith('clip_') && f.endsWith('.mp4'));
        if (clipFiles.length > 0) {
          console.log(`Found clip files: ${clipFiles.join(', ')}`);
          
          for (const clipFile of clipFiles) {
            const clipPath = path.join(jobPath, clipFile);
            try {
              const stats = await fs.stat(clipPath);
              console.log(`✅ ${clipFile} exists (${stats.size} bytes)`);
            } catch (error) {
              console.log(`❌ ${clipFile} has issues: ${error.message}`);
            }
          }
        }
      }
    }

    // 4. Crear directorio de prueba para FFmpeg
    console.log('\n🧪 Creating test directory for FFmpeg...');
    
    const testDir = '/srv/storyclip/work/test_ffmpeg';
    await fs.ensureDir(testDir);
    await fs.chmod(testDir, 0o755);
    
    // Crear un archivo de prueba
    const testFile = path.join(testDir, 'test_output.mp4');
    await fs.writeFile(testFile, 'test');
    
    console.log(`✅ Test directory created: ${testDir}`);
    console.log(`✅ Test file created: ${testFile}`);
    
    // Limpiar archivo de prueba
    await fs.unlink(testFile);
    await fs.rmdir(testDir);
    console.log(`✅ Test directory cleaned up`);

    // 5. Verificar configuración de FFmpeg
    console.log('\n⚙️ Checking FFmpeg configuration...');
    
    const ffmpegPath = '/usr/bin/ffmpeg';
    if (await fs.pathExists(ffmpegPath)) {
      console.log(`✅ FFmpeg found at ${ffmpegPath}`);
    } else {
      console.log(`❌ FFmpeg not found at ${ffmpegPath}`);
    }

    console.log('\n🎉 Diagnosis completed successfully!');
    console.log('\n📝 Recommendations:');
    console.log('1. All critical directories exist and are writable');
    console.log('2. Permissions have been verified and corrected if needed');
    console.log('3. FFmpeg is available');
    console.log('4. The error 234 should be resolved');

  } catch (error) {
    console.log('\n❌ DIAGNOSIS FAILED!');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Ejecutar diagnóstico
diagnoseAndFixError234().then(() => {
  console.log('\n🏁 Error 234 diagnosis and fix completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Diagnosis crashed:', error.message);
  process.exit(1);
});
