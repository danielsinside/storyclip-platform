# 🚀 SOLUCIÓN CORS SUPABASE EDGE FUNCTION

## 🎯 **PROBLEMA IDENTIFICADO**

El error que estás viendo:
```
Origin https://preview--visual-story-pulse.lovable.app is not allowed by Access-Control-Allow-Origin. Status code: 200
```

**Causa**: La Supabase Edge Function no tiene configurado CORS para dominios de Lovable.

## ✅ **SOLUCIÓN IMPLEMENTADA**

### 1. **Función Edge con CORS Completo**

Ya tienes creada la función en:
```
/srv/storyclip/supabase/functions/storyclip-proxy/index.ts
```

**Características**:
- ✅ **CORS dinámico** para dominios de Lovable
- ✅ **Preflight handling** (OPTIONS)
- ✅ **Proxy completo** al Story API
- ✅ **Timeout handling** (30s)
- ✅ **Error handling** robusto

### 2. **Dominios Permitidos**

La función permite estos orígenes:
- `https://*.lovable.app` (incluye `preview--*.lovable.app`)
- `https://*.lovable.dev`
- `https://*.lovable.site`
- `https://*.creatorsflow.app`
- `http://localhost:*` (desarrollo)

## 🚀 **DESPLIEGUE**

### **Opción A: Script Automático**
```bash
cd /srv/storyclip
./deploy-supabase-simple.sh
```

### **Opción B: Manual**
```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Desplegar función
supabase functions deploy storyclip-proxy

# 4. Configurar API Key
supabase secrets set STORY_API_KEY=tu_api_key_aqui
```

## 🔧 **CONFIGURACIÓN REQUERIDA**

### **1. API Key (OBLIGATORIO)**
```bash
supabase secrets set STORY_API_KEY=tu_api_key_del_story_api
```

### **2. URL del API (OPCIONAL)**
```bash
supabase secrets set STORY_API_URL=https://story.creatorsflow.app/api
```

## 🧪 **PRUEBAS**

### **1. Test CORS**
```bash
curl -X OPTIONS https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy/v1/process/story \
     -H "Origin: https://preview--visual-story-pulse.lovable.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type"
```

**Respuesta esperada**: `204 No Content` con headers CORS

### **2. Test Funcional**
```bash
curl -X POST https://tu-proyecto.supabase.co/functions/v1/storyclip-proxy/v1/process/story \
     -H "Content-Type: application/json" \
     -H "Origin: https://preview--visual-story-pulse.lovable.app" \
     -d '{"test": true}'
```

## 🎯 **RESULTADO ESPERADO**

Después del despliegue:
- ✅ **CORS permitido** desde Lovable
- ✅ **Videos accesibles** desde `preview--visual-story-pulse.lovable.app`
- ✅ **Sin errores** de `Access-Control-Allow-Origin`
- ✅ **Proxy funcional** al Story API

## 🔍 **VERIFICACIÓN**

1. **Revisa los logs** de la función en Supabase Dashboard
2. **Prueba desde Lovable** - los errores CORS deberían desaparecer
3. **Verifica el proxy** - las requests deberían llegar al Story API

## 📞 **SOPORTE**

Si tienes problemas:
1. Verifica que la API Key esté configurada
2. Revisa los logs de la función
3. Confirma que el Story API esté funcionando
4. Prueba con curl para aislar el problema

---

**🎉 ¡Con esta solución, tu app de Lovable debería funcionar perfectamente con el Story API!**






