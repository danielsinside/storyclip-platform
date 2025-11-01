#!/usr/bin/env node

/**
 * Script de prueba para verificar el mapeo de parámetros de duración
 */

const fs = require('fs-extra');
const path = require('path');

// Simular datos del frontend
const frontendOptions = {
  slicing: {
    clip_duration_seconds: 1.5,
    clips_total: 30,
    start_time: 0
  },
  quality: 'high'
};

console.log('🔍 Frontend Options:', JSON.stringify(frontendOptions, null, 2));

// Simular mapeo del backend
const processingOptions = {
  jobId: 'test-job-123',
  clipDuration: frontendOptions?.slicing?.clip_duration_seconds || frontendOptions?.clipDuration || 3,
  maxClips: frontendOptions?.slicing?.clips_total || frontendOptions?.maxClips || 50,
  quality: frontendOptions?.quality || 'high',
  startTime: frontendOptions?.slicing?.start_time || frontendOptions?.startTime || 0
};

console.log('🎯 Backend Processing Options:', JSON.stringify(processingOptions, null, 2));

// Verificar que el mapeo es correcto
const expectedDuration = 1.5;
const actualDuration = processingOptions.clipDuration;

console.log('\n✅ Verificación:');
console.log(`   Duración esperada: ${expectedDuration}s`);
console.log(`   Duración mapeada: ${actualDuration}s`);
console.log(`   ✅ Mapeo correcto: ${actualDuration === expectedDuration ? 'SÍ' : 'NO'}`);

// Probar diferentes escenarios
const testCases = [
  {
    name: 'Frontend con slicing.clip_duration_seconds',
    input: { slicing: { clip_duration_seconds: 2.5 } },
    expected: 2.5
  },
  {
    name: 'Frontend con clipDuration directo',
    input: { clipDuration: 4.0 },
    expected: 4.0
  },
  {
    name: 'Sin parámetros (debería usar default)',
    input: {},
    expected: 3
  },
  {
    name: 'Slicing con valor 0 (debería usar default)',
    input: { slicing: { clip_duration_seconds: 0 } },
    expected: 3
  }
];

console.log('\n🧪 Casos de prueba:');
testCases.forEach((testCase, index) => {
  const mapped = testCase.input?.slicing?.clip_duration_seconds || 
                 testCase.input?.clipDuration || 3;
  const passed = mapped === testCase.expected;
  
  console.log(`   ${index + 1}. ${testCase.name}`);
  console.log(`      Input: ${JSON.stringify(testCase.input)}`);
  console.log(`      Expected: ${testCase.expected}s`);
  console.log(`      Got: ${mapped}s`);
  console.log(`      ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log('🎉 Prueba de mapeo completada');
