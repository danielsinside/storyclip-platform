const ffmpegService = require('./utils/ffmpeg');
const path = require('path');
const fs = require('fs-extra');

async function testIndicator() {
  console.log('🧪 Testing clip indicator...');

  // Verificar que existe un video de prueba
  const testVideo = '/srv/storyclip/outputs/uploads/upl_1761816167348_mjgpr6.mp4';

  if (!fs.existsSync(testVideo)) {
    console.error('❌ No se encuentra video de prueba');
    console.log('Por favor usa un uploadId válido de un video procesado');
    process.exit(1);
  }

  const outputDir = '/srv/storyclip/work/test-indicator';
  await fs.ensureDir(outputDir);

  const outputPath = path.join(outputDir, 'test-clip.mp4');

  console.log('📹 Video de entrada:', testVideo);
  console.log('📁 Video de salida:', outputPath);

  try {
    await ffmpegService.createSingleClip(testVideo, outputPath, {
      startTime: 0,
      duration: 3,
      quality: 'medium',
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
      filters: {},
      effects: {
        clipIndicator: {
          position: 'top-right',
          size: 75,
          bgColor: '#000000',
          opacity: 0.7
        }
      },
      overlays: {}
    });

    console.log('✅ Clip generado exitosamente!');
    console.log('📍 Ubicación:', outputPath);

    // Verificar que el archivo existe
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('📊 Tamaño:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    }

  } catch (error) {
    console.error('❌ Error al generar clip:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testIndicator().catch(console.error);
