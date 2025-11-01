const { buildVisualVF } = require('./utils/ffmpeg');

console.log('🔍 VERIFICACIÓN DEL FIX');
console.log('======================\n');

const effects = { mirrorHorizontal: false, color: null };

// Test con diferentes dimensiones
const tests = [
  { width: 720, height: 1280, name: '720x1280 (resolución del request)' },
  { width: 1080, height: 1920, name: '1080x1920 (full HD)' }
];

let allPassed = true;

tests.forEach(test => {
  const vf = buildVisualVF(effects, { width: test.width, height: test.height });
  const scaleCount = (vf.match(/scale=/g) || []).length;
  const hasDecrease = vf.includes('decrease');
  const noCrop = !vf.includes('force_original_aspect_ratio=crop');
  const passed = scaleCount === 1 && hasDecrease && noCrop;

  console.log(`Test ${test.name}:`);
  console.log(`  Filtro: ${vf}`);
  console.log(`  ✅ Usa 'decrease': ${hasDecrease}`);
  console.log(`  ✅ No usa 'crop' inv\u00e1lido: ${noCrop}`);
  console.log(`  ✅ Solo un scale: ${scaleCount === 1} (${scaleCount} encontrados)`);
  console.log(`  ${passed ? '✅' : '❌'} Resultado: ${passed ? 'PASS' : 'FAIL'}\n`);

  if (!passed) allPassed = false;
});

console.log('==================');
if (allPassed) {
  console.log('✅ TODOS LOS TESTS PASARON');
  console.log('✅ El fix está correctamente aplicado');
  console.log('✅ Sistema listo para procesar clips');
} else {
  console.log('❌ ALGUNOS TESTS FALLARON');
  console.log('❌ Revisar implementación');
}
