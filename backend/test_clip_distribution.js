#!/usr/bin/env node

// Script de prueba para verificar la nueva lógica de distribución de clips
console.log('🧪 Probando nueva lógica de distribución de clips...\n');

function testClipDistribution(videoDuration, clipDuration, maxClips) {
  console.log(`📹 Video: ${videoDuration}s, Clips: ${clipDuration}s, Max: ${maxClips}`);
  
  const MAX_CLIPS = 50;
  const MAX_CLIP_DURATION = 60;
  
  let numClips, clipConfigs;
  
  if (maxClips === 1000) {
    // Modo automático
    const clipsByDuration = Math.ceil(videoDuration / clipDuration);
    numClips = Math.min(clipsByDuration, MAX_CLIPS);
    clipConfigs = Array(numClips).fill({ duration: clipDuration });
  } else {
    // Modo manual
    const requestedClips = Math.min(maxClips, MAX_CLIPS);
    const totalRequestedDuration = requestedClips * clipDuration;
    
    if (totalRequestedDuration <= videoDuration) {
      // Video suficientemente largo: distribuir tiempo restante en clips extendidos
      numClips = requestedClips;
      
      // Calcular tiempo restante
      const remainingDuration = videoDuration - totalRequestedDuration;
      
      if (remainingDuration > 0) {
        // Crear clips estándar y algunos extendidos
        const standardClips = Math.max(1, numClips - 2); // Dejar espacio para 1-2 clips extendidos
        const standardDuration = standardClips * clipDuration;
        const extendedDuration = videoDuration - standardDuration;
        
        clipConfigs = [];
        
        // Clips estándar
        for (let i = 0; i < standardClips; i++) {
          clipConfigs.push({ duration: clipDuration });
        }
        
        // Clips extendidos con tiempo restante
        const extendedClips = numClips - standardClips;
        const durationPerExtended = Math.min(extendedDuration / extendedClips, MAX_CLIP_DURATION);
        
        for (let i = 0; i < extendedClips; i++) {
          clipConfigs.push({ duration: durationPerExtended });
        }
      } else {
        // No hay tiempo restante, todos clips estándar
        clipConfigs = Array(numClips).fill({ duration: clipDuration });
      }
    } else {
      // Video más corto: distribuir tiempo
      const clipsByDuration = Math.ceil(videoDuration / clipDuration);
      numClips = Math.min(requestedClips, clipsByDuration);
      
      // Calcular tiempo restante para clips extendidos
      const standardClips = Math.max(1, numClips - 2);
      const standardDuration = standardClips * clipDuration;
      const remainingDuration = videoDuration - standardDuration;
      
      clipConfigs = [];
      
      // Clips estándar
      for (let i = 0; i < standardClips; i++) {
        clipConfigs.push({ duration: clipDuration });
      }
      
      // Clips extendidos
      if (remainingDuration > 0) {
        const extendedClips = Math.min(2, numClips - standardClips);
        const durationPerExtended = Math.min(remainingDuration / extendedClips, MAX_CLIP_DURATION);
        
        for (let i = 0; i < extendedClips; i++) {
          clipConfigs.push({ duration: durationPerExtended });
        }
      }
      
      numClips = clipConfigs.length;
    }
  }
  
  const totalDuration = clipConfigs.reduce((sum, config) => sum + config.duration, 0);
  
  console.log(`   ✅ Clips generados: ${numClips}`);
  console.log(`   ⏱️  Duración total: ${totalDuration}s`);
  console.log(`   📊 Distribución:`);
  
  clipConfigs.forEach((config, i) => {
    const type = config.duration > clipDuration ? '🔴 EXTENDIDO' : '🟢 ESTÁNDAR';
    console.log(`      Clip ${i+1}: ${config.duration}s ${type}`);
  });
  
  console.log(`   ${numClips <= MAX_CLIPS ? '✅' : '❌'} Límite de clips: ${numClips <= MAX_CLIPS ? 'OK' : 'EXCEDIDO'}`);
  console.log(`   ${clipConfigs.every(c => c.duration <= MAX_CLIP_DURATION) ? '✅' : '❌'} Duración máxima: ${clipConfigs.every(c => c.duration <= MAX_CLIP_DURATION) ? 'OK' : 'EXCEDIDO'}`);
  console.log('');
  
  return { numClips, clipConfigs, totalDuration };
}

// Casos de prueba
const testCases = [
  { name: 'Video corto (120s) - Solicitar 50 clips de 3s', video: 120, clip: 3, max: 50 },
  { name: 'Video medio (200s) - Solicitar 50 clips de 3s', video: 200, clip: 3, max: 50 },
  { name: 'Video largo (300s) - Solicitar 50 clips de 3s', video: 300, clip: 3, max: 50 },
  { name: 'Video muy corto (60s) - Solicitar 50 clips de 3s', video: 60, clip: 3, max: 50 },
  { name: 'Video corto (90s) - Solicitar 30 clips de 3s', video: 90, clip: 3, max: 30 },
  { name: 'Video largo (500s) - Solicitar 100 clips de 3s (default)', video: 500, clip: 3, max: 1000 }
];

testCases.forEach(testCase => {
  console.log(`🧪 ${testCase.name}`);
  testClipDistribution(testCase.video, testCase.clip, testCase.max);
});

console.log('✅ Pruebas completadas');
