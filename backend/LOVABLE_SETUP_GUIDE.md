# Guía de Configuración: Frontend Lovable → Backend StoryClip

**Problema**: El frontend no puede conectarse al backend
**Causa**: Variables de entorno no configuradas en Lovable
**Solución**: Configurar variables de entorno siguiendo estos pasos

---

## 🎯 Paso 1: Abrir tu Proyecto en Lovable

1. Ve a: `https://lovable.dev/projects/a630f775-59ad-406c-b0a6-387315d2cf10`
2. Espera a que cargue el editor

---

## ⚙️ Paso 2: Acceder a Environment Variables

**Opción A: Desde el menú lateral**
1. En el editor de Lovable, busca el ícono de **Settings** (⚙️) o **Environment**
2. Click en **"Environment Variables"** o **"Env Variables"**

**Opción B: Desde el código**
1. Si ves un archivo `.env` o `.env.local` en tu proyecto
2. Ábrelo directamente

---

## 📝 Paso 3: Agregar las Variables de Entorno

Agrega estas **EXACTAMENTE** como están escritas aquí:

```env
VITE_STORYCLIP_BASE=https://story.creatorsflow.app
VITE_STORYCLIP_CDN=https://story.creatorsflow.app/outputs
VITE_STORYCLIP_API_KEY=sk_prod_21000fdf3489bf37c0c48391e20c00947b125c3fd7bbf6f0
VITE_STORYCLIP_POLL_MS=2500
VITE_STORYCLIP_PROCESS_TIMEOUT_MS=900000
```

### ⚠️ IMPORTANTE:
- **NO incluyas espacios** alrededor del `=`
- **NO agregues comillas** alrededor de los valores
- **USA HTTPS**, no http
- **NO agregues `/api`** al final de VITE_STORYCLIP_BASE

### ✅ Correcto:
```
VITE_STORYCLIP_BASE=https://story.creatorsflow.app
```

### ❌ Incorrecto:
```
VITE_STORYCLIP_BASE = https://story.creatorsflow.app
VITE_STORYCLIP_BASE="https://story.creatorsflow.app"
VITE_STORYCLIP_BASE=https://story.creatorsflow.app/api
VITE_STORYCLIP_BASE=http://story.creatorsflow.app
```

---

## 🔄 Paso 4: Rebuild/Redeploy

Después de agregar las variables:

1. **Guarda los cambios** (Ctrl+S o Cmd+S)
2. **Espera a que Lovable reconstruya** automáticamente
3. **Recarga la página** de tu aplicación (F5)

En Lovable, cuando cambias variables de entorno, el proyecto se **reconstruye automáticamente**.

---

## ✅ Paso 5: Verificar que Funciona

### Test en el Navegador:

1. Abre la **Consola de Desarrollador** (F12)
2. Ve a la pestaña **Console**
3. Ejecuta este comando:

```javascript
console.log(import.meta.env.VITE_STORYCLIP_BASE)
```

**Debe mostrar**:
```
https://story.creatorsflow.app
```

**Si muestra `undefined`**, significa que las variables no están configuradas correctamente.

---

## 🐛 Troubleshooting

### Problema 1: Variables no se aplican

**Solución**:
1. Verifica que estás editando el archivo `.env` correcto (puede haber `.env.local`, `.env.production`, etc.)
2. En Lovable, asegúrate de guardar los cambios
3. Forzar rebuild: haz un cambio pequeño en cualquier archivo `.tsx` y guarda

### Problema 2: Sigue diciendo "Backend no disponible"

**Verificar en la Consola del Navegador**:
1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Recarga la página
4. Busca requests a `story.creatorsflow.app`

**Si NO ves requests a story.creatorsflow.app**:
- Las variables de entorno no están configuradas
- El código no está usando las variables correctamente

**Si ves requests a story.creatorsflow.app pero fallan**:
- Click en la request fallida
- Ve a la pestaña **Headers**
- Copia el error y envíamelo

### Problema 3: CORS error

**Si ves en la consola**:
```
Access to fetch at 'https://story.creatorsflow.app/api/...' from origin 'https://...'
has been blocked by CORS policy
```

**Solución**:
1. Envíame la URL completa del origin (la URL de tu app de Lovable)
2. Por ejemplo: `https://preview--mi-app.lovable.app`
3. Yo agregaré ese dominio a la lista de permitidos en el backend

---

## 📋 Checklist Final

Antes de probar, asegúrate de:

- [ ] Variables agregadas en Lovable (Settings → Environment Variables)
- [ ] Variables escritas EXACTAMENTE como se indica (sin espacios, sin comillas)
- [ ] Proyecto reconstruido (rebuild automático)
- [ ] Página recargada (F5)
- [ ] Consola del navegador abierta para ver errores (F12)
- [ ] Variables verificadas con `console.log(import.meta.env.VITE_STORYCLIP_BASE)`

---

## 🎯 Código de Ejemplo para Verificar

Si quieres verificar que el código está usando las variables correctamente, busca en tu proyecto algo similar a esto:

```typescript
// ✅ Correcto: Usando la variable de entorno
const baseURL = import.meta.env.VITE_STORYCLIP_BASE;
console.log('Backend URL:', baseURL); // Debe mostrar: https://story.creatorsflow.app

// Hacer request al backend
const response = await fetch(`${baseURL}/api/health`);
```

```typescript
// ❌ Incorrecto: URL hardcodeada
const baseURL = 'http://localhost:3000'; // NO USAR
const baseURL = 'https://lovable.dev/...'; // NO USAR
```

---

## 📞 Ayuda Adicional

Si después de seguir estos pasos aún no funciona:

1. **Abre la Consola del Navegador** (F12)
2. **Copia TODOS los errores** que veas en rojo
3. **Envíamelos** para que pueda ayudarte específicamente

También puedes enviarme:
- La URL de tu app desplegada en Lovable (la que ves cuando previews tu app)
- Un screenshot de la sección de Environment Variables en Lovable

---

## ✨ Variables Explicadas

**¿Qué hace cada variable?**

| Variable | Propósito | Valor |
|----------|-----------|-------|
| `VITE_STORYCLIP_BASE` | URL base del API backend | `https://story.creatorsflow.app` |
| `VITE_STORYCLIP_CDN` | URL para acceder a clips procesados | `https://story.creatorsflow.app/outputs` |
| `VITE_STORYCLIP_API_KEY` | API key para autenticación | `sk_prod_21000fdf...` |
| `VITE_STORYCLIP_POLL_MS` | Intervalo de polling (ms) | `2500` (cada 2.5 segundos) |
| `VITE_STORYCLIP_PROCESS_TIMEOUT_MS` | Timeout máximo para procesamiento | `900000` (15 minutos) |

---

## 🚀 Una Vez Configurado

Después de configurar las variables correctamente, podrás:

1. ✅ Subir videos desde el frontend de Lovable
2. ✅ Procesar clips en el backend
3. ✅ Ver el progreso en tiempo real
4. ✅ Descargar los clips procesados

**El backend ya está listo y esperando tus requests!** 🎉
