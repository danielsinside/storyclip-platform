#!/usr/bin/env node

/**
 * Test específico para diagnosticar el error 234
 * El problema es que FFmpeg no puede crear el archivo de salida
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

async function diagnoseError234() {
  console.log('🔍 DIAGNOSING ERROR 234 - FFMPEG OUTPUT FILE ISSUE');
  console.log('================================================');

  try {
    // 1. Verificar directorios de trabajo
    console.log('\n📁 Checking work directories...');
    
    const workDir = '/srv/storyclip/work';
    const testJobId = 'test_job_234_debug';
    const testJobDir = path.join(workDir, testJobId);
    
    // Crear directorio de prueba
    await fs.ensureDir(testJobDir);
    console.log(`✅ Created test job directory: ${testJobDir}`);
    
    // Verificar permisos
    const stats = await fs.stat(testJobDir);
    console.log(`✅ Directory permissions: ${stats.mode.toString(8)}`);
    
    // 2. Crear un archivo de video de prueba válido
    console.log('\n🎬 Creating test video file...');
    
    const testVideoPath = path.join(testJobDir, 'source.mp4');
    
    // Crear un archivo MP4 más completo usando FFmpeg
    const ffmpegCommand = [
      'ffmpeg', '-y',
      '-f', 'lavfi',
      '-i', 'color=c=black:s=1280x720:d=5',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-pix_fmt', 'yuv420p',
      testVideoPath
    ];
    
    console.log('FFmpeg command:', ffmpegCommand.join(' '));
    
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegCommand.slice(1));
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Test video created successfully');
          resolve();
        } else {
          console.log(`❌ FFmpeg failed with code ${code}`);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.log(`❌ FFmpeg error: ${error.message}`);
        reject(error);
      });
    });
    
    // Verificar que el archivo se creó
    if (await fs.pathExists(testVideoPath)) {
      const videoStats = await fs.stat(testVideoPath);
      console.log(`✅ Test video exists: ${videoStats.size} bytes`);
    } else {
      throw new Error('Test video was not created');
    }
    
    // 3. Probar comando FFmpeg que está fallando
    console.log('\n⚙️ Testing FFmpeg command that fails...');
    
    const outputPath = path.join(testJobDir, 'clip_001.mp4');
    console.log(`Output path: ${outputPath}`);
    
    // Comando FFmpeg que debería funcionar
    const testCommand = [
      'ffmpeg', '-y',
      '-i', testVideoPath,
      '-ss', '0',
      '-t', '5',
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=crop,crop=1080:1920,format=yuv420p',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputPath
    ];
    
    console.log('Test FFmpeg command:', testCommand.join(' '));
    
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', testCommand.slice(1));
      
      let stdout = '';
      let stderr = '';
      
      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFmpeg command succeeded!');
          resolve();
        } else {
          console.log(`❌ FFmpeg failed with code ${code}`);
          console.log('STDOUT:', stdout);
          console.log('STDERR:', stderr);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.log(`❌ FFmpeg error: ${error.message}`);
        reject(error);
      });
    });
    
    // Verificar que el archivo de salida se creó
    if (await fs.pathExists(outputPath)) {
      const outputStats = await fs.stat(outputPath);
      console.log(`✅ Output file created: ${outputStats.size} bytes`);
    } else {
      throw new Error('Output file was not created');
    }
    
    // 4. Probar comando con efectos (que puede estar fallando)
    console.log('\n🎨 Testing FFmpeg with effects...');
    
    const outputPathWithEffects = path.join(testJobDir, 'clip_002.mp4');
    
    // Comando con efectos que puede estar causando el error
    const effectsCommand = [
      'ffmpeg', '-y',
      '-i', testVideoPath,
      '-ss', '0',
      '-t', '5',
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=crop,crop=1080:1920,hflip,eq=saturation=1.5:brightness=0.1:contrast=1.1,format=yuv420p',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputPathWithEffects
    ];
    
    console.log('Effects FFmpeg command:', effectsCommand.join(' '));
    
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', effectsCommand.slice(1));
      
      let stdout = '';
      let stderr = '';
      
      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFmpeg with effects succeeded!');
          resolve();
        } else {
          console.log(`❌ FFmpeg with effects failed with code ${code}`);
          console.log('STDOUT:', stdout);
          console.log('STDERR:', stderr);
          reject(new Error(`FFmpeg with effects failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.log(`❌ FFmpeg error: ${error.message}`);
        reject(error);
      });
    });
    
    // Verificar que el archivo con efectos se creó
    if (await fs.pathExists(outputPathWithEffects)) {
      const effectsStats = await fs.stat(outputPathWithEffects);
      console.log(`✅ Output with effects created: ${effectsStats.size} bytes`);
    } else {
      throw new Error('Output with effects was not created');
    }
    
    // 5. Limpiar
    await fs.remove(testJobDir);
    console.log('\n✅ Test directory cleaned up');
    
    console.log('\n🎉 DIAGNOSIS COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ All FFmpeg commands work correctly');
    console.log('✅ Directories and permissions are correct');
    console.log('✅ Video processing with effects works');
    console.log('\n📝 CONCLUSION:');
    console.log('The error 234 is NOT caused by:');
    console.log('- Directory permissions');
    console.log('- FFmpeg command syntax');
    console.log('- File path issues');
    console.log('\nThe error 234 is likely caused by:');
    console.log('- Backend not executing FFmpeg correctly');
    console.log('- Missing ffmpegCommand in the payload');
    console.log('- Invalid clip ranges');

  } catch (error) {
    console.log('\n❌ DIAGNOSIS FAILED!');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Ejecutar diagnóstico
diagnoseError234().then(() => {
  console.log('\n🏁 Error 234 diagnosis completed');
  process.exit(0);
}).catch(error => {
  console.log('\n💥 Diagnosis crashed:', error.message);
  process.exit(1);
});
