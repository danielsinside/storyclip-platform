/**
 * Test para verificar que metadata se incluye en job status
 */

const jobManager = require('./services/job-manager.service');

console.log('🧪 Testing metadata fix...\n');

// 1. Crear un job de prueba
const testJob = jobManager.createJob({ test: 'data' });
console.log('✅ Job created:', testJob.id);
console.log('   Initial metadata:', testJob.metadata);
console.log('   Initial outputs:', testJob.outputs);

// 2. Simular completado con metadata
const testMetadata = {
  totalClips: 50,
  clips: Array.from({ length: 50 }, (_, i) => ({
    id: `clip_${String(i + 1).padStart(3, '0')}`,
    filename: `clip_${String(i + 1).padStart(3, '0')}.mp4`,
    url: `/outputs/test/clip_${String(i + 1).padStart(3, '0')}.mp4`
  })),
  outputs: Array.from({ length: 50 }, (_, i) => ({
    url: `/outputs/test/clip_${String(i + 1).padStart(3, '0')}.mp4`
  }))
};

const testOutputs = testMetadata.outputs;

jobManager.completeJob(
  testJob.id,
  '/outputs/test/clip_001.mp4',
  null,
  null,
  testMetadata,
  testOutputs
);

console.log('\n✅ Job completed with metadata');

// 3. Obtener el job y verificar metadata
const completedJob = jobManager.getJob(testJob.id);
console.log('\n📋 Retrieved job:');
console.log('   Status:', completedJob.status);
console.log('   Progress:', completedJob.progress);
console.log('   Has metadata:', !!completedJob.metadata);
console.log('   Metadata totalClips:', completedJob.metadata?.totalClips);
console.log('   Metadata clips length:', completedJob.metadata?.clips?.length);
console.log('   Has outputs:', !!completedJob.outputs);
console.log('   Outputs length:', completedJob.outputs?.length);

// 4. Verificar que el objeto tiene la estructura correcta
if (completedJob.metadata &&
    completedJob.metadata.totalClips === 50 &&
    completedJob.metadata.clips.length === 50 &&
    completedJob.outputs &&
    completedJob.outputs.length === 50) {
  console.log('\n✅ SUCCESS: Metadata fix is working correctly!');
  console.log('   Frontend will now receive 50 clips immediately');
  process.exit(0);
} else {
  console.log('\n❌ FAILED: Metadata not properly saved');
  console.log('   completedJob:', JSON.stringify(completedJob, null, 2));
  process.exit(1);
}
