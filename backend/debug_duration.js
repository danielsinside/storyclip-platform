#!/usr/bin/env node

/**
 * Script de debug para verificar el flujo de duración
 */

const logger = require('./utils/logger');

// Simular el flujo completo
function debugDurationFlow() {
  console.log('🔍 Debug del flujo de duración\n');

  // 1. Frontend envía
  const frontendRequest = {
    slicing: {
      clip_duration_seconds: 1.5,
      clips_total: 10
    }
  };
  console.log('1️⃣ Frontend Request:', JSON.stringify(frontendRequest, null, 2));

  // 2. Handler mapea
  const options = frontendRequest;
  const processingOptions = {
    jobId: 'test-job-123',
    clipDuration: options?.slicing?.clip_duration_seconds || options?.clipDuration || 3,
    maxClips: options?.slicing?.clips_total || options?.maxClips || 50,
    quality: options?.quality || 'high',
    startTime: options?.slicing?.start_time || options?.startTime || 0
  };
  console.log('2️⃣ Processing Options:', JSON.stringify(processingOptions, null, 2));

  // 3. FFmpeg recibe
  const ffmpegOptions = {
    clipDuration: processingOptions.clipDuration,
    maxClips: processingOptions.maxClips,
    quality: processingOptions.quality,
    startTime: processingOptions.startTime
  };
  console.log('3️⃣ FFmpeg Options:', JSON.stringify(ffmpegOptions, null, 2));

  // 4. Simular creación de clips
  const clipConfigs = Array(3).fill({ duration: ffmpegOptions.clipDuration });
  console.log('4️⃣ Clip Configs:', JSON.stringify(clipConfigs, null, 2));

  // 5. Simular createSingleClip
  clipConfigs.forEach((config, index) => {
    const singleClipOptions = {
      startTime: index * config.duration,
      duration: config.duration,
      quality: ffmpegOptions.quality
    };
    console.log(`5️⃣ Clip ${index + 1} Options:`, JSON.stringify(singleClipOptions, null, 2));
  });

  console.log('\n✅ Flujo de debug completado');
}

debugDurationFlow();
