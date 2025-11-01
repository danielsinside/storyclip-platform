#!/usr/bin/env node

/**
 * Script de prueba para verificar que el backend usa ffmpegCommand del frontend
 */

const logger = require('./utils/logger');

// Simular el payload del frontend con ffmpegCommand
const mockPayload = {
  effects: {
    color: {
      filterType: "vivid",
      intensity: 50,
      ffmpegCommand: "eq=saturation=1.750:contrast=1.002",
      ffmpegValues: {
        saturation: 1.75,
        contrast: 1.002,
        cssPreview: "saturate(175%) contrast(120%)"
      }
    },
    horizontalFlip: true,
    clipIndicator: {
      type: "temporal",
      position: "top-right",
      size: 80,
      textColor: "#FFFFFF",
      bgColor: "#FF6347",
      opacity: 0.8,
      style: "rounded"
    }
  }
};

// Importar las funciones del backend
const { normalizeEffects, buildVisualVF } = require('./utils/ffmpeg');

console.log('🧪 TESTING FFMPEG COMMAND USAGE');
console.log('================================');

// Simular el procesamiento del backend
const clip = { 
  effects: {
    horizontalFlip: mockPayload.effects.horizontalFlip,
    color: mockPayload.effects.color,
    clipIndicator: mockPayload.effects.clipIndicator
  }
};
const body = { filters: {} };

console.log('\n📥 Input payload:');
console.log(JSON.stringify(mockPayload, null, 2));

console.log('\n🔄 Normalizing effects...');
const normalizedEffects = normalizeEffects(clip, body);
console.log('Normalized effects:', JSON.stringify(normalizedEffects, null, 2));

console.log('\n⚙️ Building FFmpeg filters...');
const vfResult = buildVisualVF(normalizedEffects);
console.log('Final -vf command:', vfResult);

console.log('\n✅ Expected result:');
console.log('Should contain: eq=saturation=1.750:contrast=1.002');
console.log('Should contain: hflip');
console.log('Should contain: drawbox for indicator');

console.log('\n🔍 Analysis:');
if (vfResult.includes('eq=saturation=1.750:contrast=1.002')) {
  console.log('✅ SUCCESS: Backend is using frontend ffmpegCommand');
} else {
  console.log('❌ FAILURE: Backend is NOT using frontend ffmpegCommand');
  console.log('Current result:', vfResult);
}

if (vfResult.includes('hflip')) {
  console.log('✅ SUCCESS: Horizontal flip is applied');
} else {
  console.log('❌ FAILURE: Horizontal flip is missing');
}

if (vfResult.includes('drawbox')) {
  console.log('✅ SUCCESS: Clip indicator is applied');
} else {
  console.log('❌ FAILURE: Clip indicator is missing');
}
