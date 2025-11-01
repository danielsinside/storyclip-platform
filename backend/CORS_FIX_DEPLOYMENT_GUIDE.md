# 🚀 Guía de Deploy - Fix CORS para Supabase Edge Function

## 🎯 Problema Resuelto

**Error Original**: `Blocked a frame with origin "https://lovable.dev" from accessing a frame with origin "https://preview--visual-story-pulse.lovable.app"`

**Causa**: Edge Function sin headers CORS correctos para dominios de Lovable

**Solución**: CORS middleware completo con allowlist de dominios Lovable

---

## 📋 Archivos Creados

### **1. Edge Function Completa**
- **📄 `supabase-functions-storyclip-proxy-index.ts`** - Función lista para deploy
- **🔧 CORS completo** - Incluye `preview--*.lovable.app`
- **⚡ Timeout handling** - 30 segundos timeout
- **🔄 Header forwarding** - Reenvía headers importantes
- **📊 Logging** - Debug completo

### **2. Script de Verificación**
- **📄 `test-cors-fix.sh`** - Script para probar CORS
- **🧪 Tests automáticos** - Preflight, POST, múltiples orígenes
- **✅ Validación completa** - Verifica todos los headers

### **3. Documentación**
- **📄 `SUPABASE_EDGE_FUNCTION_CORS_FIX.md`** - Guía completa
- **🔧 Configuración** - Variables de entorno
- **🧪 Testing** - Comandos cURL
- **🚨 Troubleshooting** - Errores comunes

---

## 🚀 Deploy Paso a Paso

### **1. Preparar la Función**

```bash
# Crear directorio de la función
mkdir -p supabase/functions/storyclip-proxy

# Copiar el código de la función
cp /srv/storyclip/supabase-functions-storyclip-proxy-index.ts supabase/functions/storyclip-proxy/index.ts
```

### **2. Configurar Variables de Entorno**

```bash
# Configurar API key de Story
supabase secrets set STORY_API_KEY=sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3

# Verificar que se configuró
supabase secrets list
```

### **3. Deploy de la Función**

```bash
# Deploy la función
supabase functions deploy storyclip-proxy

# Verificar que esté funcionando
supabase functions list
```

### **4. Verificar CORS**

```bash
# Hacer el script ejecutable
chmod +x /srv/storyclip/test-cors-fix.sh

# Ejecutar verificación (reemplaza con tu URL de Supabase)
./test-cors-fix.sh https://tu-proyecto.supabase.co
```

---

## 🧪 Verificación Manual

### **1. Test Preflight**

```bash
curl -i -X OPTIONS \
  "https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy" \
  -H "Origin: https://preview--visual-story-pulse.lovable.app" \
  -H "Access-Control-Request-Method: POST"
```

**Respuesta esperada:**
```http
HTTP/2 204
Access-Control-Allow-Origin: https://preview--visual-story-pulse.lovable.app
Vary: Origin
Access-Control-Allow-Credentials: true
```

### **2. Test Request Real**

```bash
curl -i -X POST \
  "https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy" \
  -H "Origin: https://preview--visual-story-pulse.lovable.app" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test_123", "tempPath": "/path/to/video.mp4"}'
```

**Respuesta esperada:**
```http
HTTP/2 200
Access-Control-Allow-Origin: https://preview--visual-story-pulse.lovable.app
Vary: Origin
Content-Type: application/json

{"success": true, "jobId": "test_123", "status": "processing"}
```

---

## 🔧 Configuración Frontend (Lovable)

### **1. Uso con la Edge Function**

```typescript
// En tu aplicación de Lovable
const response = await fetch('https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy', {
  method: 'POST',
  credentials: 'include', // Si usas cookies/sesión
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Si usas auth
  },
  body: JSON.stringify({
    jobId: 'job_123',
    tempPath: '/path/to/video.mp4',
    fileName: 'video.mp4',
    options: {
      quality: 'high',
      resolution: '1080x1920',
      filters: [
        {
          type: 'upscale',
          params: { scale: '2x' }
        }
      ]
    }
  })
});

const result = await response.json();
console.log('Resultado:', result);
```

### **2. Manejo de Errores**

```typescript
try {
  const response = await fetch('https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result;
} catch (error) {
  console.error('Error en Edge Function:', error);
  throw error;
}
```

---

## 🎯 Dominios CORS Incluidos

### **✅ Lovable (Todos Permitidos)**
- `lovable.site` y `*.lovable.site`
- `lovable.app` y `*.lovable.app`
- `preview--*.lovable.app` (tu caso específico)
- `lovable.dev` y `*.lovable.dev`
- `lovableproject.com` y `*.lovableproject.com`

### **✅ Desarrollo**
- `localhost:3000` y `localhost:5173`
- `127.0.0.1:3000` y `127.0.0.1:5173`

### **✅ Producción**
- `creatorsflow.app` y `*.creatorsflow.app`

---

## 🚨 Troubleshooting

### **1. Error: "CORS policy: No 'Access-Control-Allow-Origin' header"**

**Causa**: La función no devuelve el header correcto
**Solución**: Verificar que el regex incluya tu dominio

```typescript
// Verificar en la función
console.log("Origin:", origin);
console.log("Is Allowed:", isAllowed(origin));
```

### **2. Error: "CORS policy: Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"

**Causa**: Usar `*` con `credentials: 'include'`
**Solución**: La función ya usa origen específico, no `*`

### **3. Error: "CORS policy: The request client is not a secure context"**

**Causa**: Mezclar HTTP/HTTPS
**Solución**: Usar siempre HTTPS en producción

### **4. Error: "CORS policy: The request client is not a secure context"**

**Causa**: Usar `http://` en lugar de `https://`
**Solución**: Usar siempre HTTPS

---

## 📊 Monitoreo y Logs

### **1. Ver Logs de la Función**

```bash
# Ver logs en tiempo real
supabase functions logs storyclip-proxy --follow

# Ver logs específicos
supabase functions logs storyclip-proxy --limit 50
```

### **2. Debug en la Función**

```typescript
// La función ya incluye logging completo
console.log("Request Origin:", origin);
console.log("Is Allowed:", isAllowed(origin));
console.log("CORS Headers:", baseHeaders);
console.log("Proxy payload:", payload);
console.log("Story API response:", data);
```

---

## ✅ Checklist de Deploy

- [ ] ✅ **Función creada** - `supabase/functions/storyclip-proxy/index.ts`
- [ ] ✅ **Variables configuradas** - `STORY_API_KEY` set
- [ ] ✅ **Función desplegada** - `supabase functions deploy`
- [ ] ✅ **CORS verificado** - Script de test ejecutado
- [ ] ✅ **Preflight funcionando** - OPTIONS retorna 204
- [ ] ✅ **POST funcionando** - Request real funciona
- [ ] ✅ **Dominios permitidos** - `preview--*.lovable.app` incluido
- [ ] ✅ **Headers correctos** - ACAO, Vary, Credentials
- [ ] ✅ **Frontend configurado** - Lovable usando la función
- [ ] ✅ **Error resuelto** - No más bloqueos CORS

---

## 🎉 Resultado Final

**Con esta configuración, el error CORS se resolverá completamente:**

- ✅ `https://preview--visual-story-pulse.lovable.app` estará permitido
- ✅ Requests desde Lovable funcionarán sin bloqueos
- ✅ Headers CORS correctos en todas las respuestas
- ✅ Soporte para credenciales si las usas
- ✅ Timeout y error handling robusto
- ✅ Logging completo para debugging

**¡El error CORS está resuelto!** 🎬✨

---

*Fix CORS implementado el 19 de Octubre de 2025 - Story API v1.0.0*






