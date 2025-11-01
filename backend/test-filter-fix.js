/**
 * Script de prueba para verificar el fix del error 234
 * Simula una petición con filterType === 'none'
 */

const axios = require('axios');

async function testFilterFix() {
  console.log('🧪 Iniciando prueba del fix de filtros...\n');
  
  // Simular datos de prueba
  const testPayload = {
    uploadId: 'test_' + Date.now(),
    mode: 'manual',
    clips: [
      {
        start: 0,
        end: 10,
        effects: {
          mirrorHorizontal: false,
          filter: {
            type: 'none',
            intensity: 0,
            // ffmpegCommand intencionalmente vacío/undefined
            ffmpegValues: {}
          }
        }
      },
      {
        start: 10,
        end: 20,
        effects: {
          mirrorHorizontal: false,
          // Sin campo filter para probar el caso extremo
        }
      },
      {
        start: 20,
        end: 30,
        effects: {
          mirrorHorizontal: true,
          filter: {
            type: 'vivid',
            intensity: 75,
            ffmpegCommand: 'eq=saturation=1.75:contrast=1.002',
            ffmpegValues: { saturation: 1.75, contrast: 1.002 }
          }
        }
      }
    ]
  };

  console.log('📦 Payload de prueba:');
  console.log('Clip 1: filter.type = "none", sin ffmpegCommand');
  console.log('Clip 2: sin campo filter');
  console.log('Clip 3: filter completo con vivid\n');

  try {
    // Hacer petición local para ver logs
    const response = await axios.post('http://localhost:3000/api/process-video', testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Test': 'filter-fix-validation'
      },
      validateStatus: () => true // Aceptar cualquier status para ver el error
    });

    console.log('📊 Respuesta del servidor:');
    console.log('Status:', response.status);
    
    if (response.status === 200 || response.status === 202) {
      console.log('✅ La petición fue aceptada correctamente!');
      console.log('JobId:', response.data.jobId || response.data.storyId);
    } else {
      console.log('⚠️ Status no exitoso:', response.status);
      console.log('Respuesta:', response.data);
    }

  } catch (error) {
    console.error('❌ Error en la petición:', error.message);
    if (error.response) {
      console.log('Detalles:', error.response.data);
    }
  }

  console.log('\n🔍 Revisa los logs con: pm2 logs storyclip --lines 50');
}

// Ejecutar prueba
testFilterFix();
