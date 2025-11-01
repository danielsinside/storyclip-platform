#!/usr/bin/env node

const axios = require('axios');

async function testJobStatus(jobId) {
  try {
    console.log(`🔍 Testing job status for: ${jobId}\n`);

    // Test v1 endpoint
    const v1Response = await axios.get(`https://story.creatorsflow.app/api/v1/jobs/${jobId}/status`);
    const v1Data = v1Response.data;

    console.log('📊 V1 Endpoint Response:');
    console.log('   Status:', v1Data.status);
    console.log('   Progress:', v1Data.progress);
    console.log('   Total clips:', v1Data.totalClips);
    console.log('   Outputs count:', v1Data.outputs?.length || 0);

    if (v1Data.result?.artifacts) {
      console.log('   Artifacts count:', v1Data.result.artifacts.length);

      if (v1Data.result.artifacts.length > 0) {
        console.log('\n📎 First 5 clips:');
        v1Data.result.artifacts.slice(0, 5).forEach(artifact => {
          console.log(`     - ${artifact.id}: ${artifact.url}`);
        });

        if (v1Data.result.artifacts.length > 5) {
          console.log(`     ... and ${v1Data.result.artifacts.length - 5} more clips`);
        }
      }
    }

    // Test regular endpoint
    console.log('\n📊 Regular Endpoint Response:');
    const regularResponse = await axios.get(`https://story.creatorsflow.app/api/jobs/${jobId}/status`);
    const regularData = regularResponse.data;

    console.log('   Status:', regularData.status);
    console.log('   Progress:', regularData.progress);
    console.log('   Outputs count:', regularData.outputs?.length || 0);

    if (regularData.outputs && regularData.outputs.length > 0) {
      console.log('\n📎 First 5 outputs:');
      regularData.outputs.slice(0, 5).forEach((output, index) => {
        const url = output.url || output;
        console.log(`     - Output ${index + 1}: ${url}`);
      });

      if (regularData.outputs.length > 5) {
        console.log(`     ... and ${regularData.outputs.length - 5} more outputs`);
      }
    }

    // Verificar que todas las URLs sean accesibles
    if (v1Data.result?.artifacts && v1Data.result.artifacts.length > 0) {
      console.log('\n🔗 Verificando accesibilidad de URLs...');

      const urlToCheck = v1Data.result.artifacts[0].url;
      const fullUrl = urlToCheck.startsWith('http') ? urlToCheck : `https://story.creatorsflow.app${urlToCheck}`;

      try {
        const headResponse = await axios.head(fullUrl);
        console.log(`   ✅ Primera URL accesible: ${fullUrl}`);
        console.log(`      Content-Type: ${headResponse.headers['content-type']}`);
        console.log(`      Status: ${headResponse.status}`);
      } catch (error) {
        console.error(`   ❌ Error accediendo a URL: ${fullUrl}`);
        console.error(`      Error: ${error.message}`);
      }
    }

    console.log('\n✅ Test completado');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Obtener jobId de argumentos o usar el último conocido
const jobId = process.argv[2] || 'upl_1761700214393_s1c7id';

console.log('🎬 Testing StoryClip Job Status API');
console.log('=====================================\n');

testJobStatus(jobId);