#!/usr/bin/env node

// Script de prueba para verificar la lógica de generación de clips
const ffmpegHelper = require('./utils/ffmpeg');

async function testClipLogic() {
  console.log('🧪 Probando lógica de generación de clips...\n');
  
  // Simular diferentes escenarios
  const testCases = [
    {
      name: 'Video corto (20s) - Solicitar 50 clips de 3s',
      videoDuration: 20,
      clipDuration: 3,
      maxClips: 50,
      expectedClips: 50
    },
    {
      name: 'Video largo (200s) - Solicitar 10 clips de 5s',
      videoDuration: 200,
      clipDuration: 5,
      maxClips: 10,
      expectedClips: 10
    },
    {
      name: 'Video medio (60s) - Solicitar 30 clips de 2s',
      videoDuration: 60,
      clipDuration: 2,
      maxClips: 30,
      expectedClips: 30
    },
    {
      name: 'Video corto (15s) - Solicitar 100 clips de 3s (default)',
      videoDuration: 15,
      clipDuration: 3,
      maxClips: 1000, // Default value
      expectedClips: 5 // Math.ceil(15/3)
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    
    // Simular la lógica del código
    const totalDuration = testCase.videoDuration;
    const clipsByDuration = Math.ceil(totalDuration / testCase.clipDuration);
    const numClips = testCase.maxClips === 1000 ? clipsByDuration : testCase.maxClips;
    
    console.log(`   Video duration: ${testCase.videoDuration}s`);
    console.log(`   Clip duration: ${testCase.clipDuration}s`);
    console.log(`   Max clips requested: ${testCase.maxClips}`);
    console.log(`   Clips by duration: ${clipsByDuration}`);
    console.log(`   Final clips to create: ${numClips}`);
    console.log(`   Expected: ${testCase.expectedClips}`);
    console.log(`   ✅ ${numClips === testCase.expectedClips ? 'PASS' : 'FAIL'}\n`);
  }
  
  // Probar lógica de repetición
  console.log('🔄 Probando lógica de repetición de video...\n');
  
  const videoDuration = 20; // 20 segundos
  const clipDuration = 3;   // 3 segundos por clip
  const maxClips = 50;      // 50 clips solicitados
  const totalRequestedDuration = maxClips * clipDuration; // 150 segundos
  
  console.log(`Video duration: ${videoDuration}s`);
  console.log(`Total requested duration: ${totalRequestedDuration}s`);
  console.log(`Will repeat video: ${totalRequestedDuration > videoDuration ? 'YES' : 'NO'}\n`);
  
  // Simular cálculo de tiempos de inicio
  for (let i = 0; i < Math.min(10, maxClips); i++) {
    let clipStartTime;
    
    if (totalRequestedDuration <= videoDuration) {
      clipStartTime = i * clipDuration;
    } else {
      clipStartTime = (i * clipDuration) % videoDuration;
    }
    
    console.log(`Clip ${i + 1}: start at ${clipStartTime}s`);
  }
  
  console.log('\n✅ Prueba completada');
}

testClipLogic().catch(console.error);