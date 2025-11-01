// Script de debug para verificar headers
// Ejecutar en la consola del navegador

async function testHeaders() {
  console.log('🔍 Testing headers...');
  
  // Crear un archivo de test
  const testFile = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
  
  // Simular el orquestador
  const flowId = crypto.randomUUID();
  const idem = 'test-idempotency-key-123';
  
  console.log('📤 Headers que deberían enviarse:');
  console.log('Idempotency-Key:', idem);
  console.log('X-Flow-Id:', flowId);
  
  const fd = new FormData();
  fd.append('file', testFile);
  fd.append('options', JSON.stringify({ test: true }));
  
  // Construir headers explícitamente
  const headers = new Headers();
  headers.set('Idempotency-Key', idem);
  headers.set('X-Flow-Id', flowId);
  
  console.log('📋 Headers construidos:', headers);
  
  try {
    const res = await fetch('https://storyclip.creatorsflow.app/api/videos/upload-direct', {
      method: 'POST',
      body: fd,
      headers,
      credentials: 'include'
    });
    
    console.log('✅ Response status:', res.status);
    const data = await res.json();
    console.log('📄 Response data:', data);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar test
testHeaders();
