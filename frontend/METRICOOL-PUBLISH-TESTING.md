# 🧪 Guía de Testing - Metricool Publish Integration

## ✅ Checklist de Configuración

### Edge Function (metricool-publish)

- [ ] **METRICOOL_USER_TOKEN** (o METRICOOL_API_TOKEN) configurado en Supabase Secrets
- [ ] **METRICOOL_USER_ID** configurado (número válido)
- [ ] **METRICOOL_BLOG_ID** configurado (número válido)
- [ ] CORS headers habilitados (POST/GET/OPTIONS)
- [ ] Logs activos en console para debugging

**Opcionales:**
- [ ] `PUBLISH_MAX_RETRIES=5` (default: 5)
- [ ] `PUBLISH_RETRY_BASE_MS=1200` (default: 1200ms)
- [ ] `METRICOOL_API_URL=https://app.metricool.com/api` (default)

### Frontend (React + Vite)

- [ ] Variables de entorno usan `import.meta.env.VITE_*` (no `process.env`)
- [ ] `publishStory()` invoca Supabase Functions (✅ implementado)
- [ ] `PublishButton` renderiza correctamente en `ClipsList`
- [ ] Media URLs son públicas (accesibles sin autenticación)

### Backend StoryClip

- [ ] Exporta MP4 compliant: 1080×1920, yuv420p, H.264, AAC, ≥3s
- [ ] Sirve `/exports/...` con HTTP 200 y `Content-Type: video/mp4`
- [ ] URLs públicas (Nginx sin auth)

---

## 🧪 Smoke Tests

### 1. Normalización + Publicación (Edge Function Logs)

**Esperado en Supabase Edge Function Logs:**

```
🔄 Normalizing: https://app.metricool.com/api/actions/normalize/image/url?url=...&userId=...&blogId=...
✅ Normalized URL: https://...
📮 Posting story to: https://app.metricool.com/api/v2/scheduler/posts?userId=...&blogId=...
✅ Story posted successfully
✅ Publish complete: { publishId: "...", status: "sent", providerId: "..." }
```

**Cómo verificar:**
1. Ir a Supabase Dashboard → Edge Functions → metricool-publish → Logs
2. Generar un clip y publicarlo
3. Revisar los logs en tiempo real

### 2. Frontend PublishButton

**Flujo esperado:**

1. ✅ Generar clips → botón "Publicar Story" aparece en cada clip
2. ✅ Click → botón muestra "Publicando…" con spinner
3. ✅ Toast success: "Story publicada · Estado: sent (· ID: XXX)"
4. ✅ `publishId` visible debajo del botón
5. ✅ `status: "sent"` mostrado

**Verificación visual:**
- El botón aparece al hacer hover sobre el clip
- El botón está en la parte inferior del clip
- Los textos son legibles (tamaño pequeño pero visible)

### 3. URL Pública del Media

**Prueba de accesibilidad:**

1. Copiar `mediaUrl` del clip generado
2. Abrir en ventana incógnito (sin login)
3. ✅ Debe reproducirse o descargarse el MP4
4. ❌ Si pide login → Metricool normalize fallará

**Verificación con curl:**
```bash
curl -I "https://story.creatorsflow.app/exports/..."
# Esperado: HTTP/1.1 200 OK
# Content-Type: video/mp4
```

---

## 🛠️ Pruebas de Error (Casos Esperados)

### Error 401 - Unauthorized

**Causa:** Token inválido o expirado

**Log esperado:**
```
❌ Unauthorized - check METRICOOL_USER_TOKEN
```

**Solución:**
1. Verificar secret en Supabase
2. Regenerar token en Metricool
3. Actualizar `METRICOOL_USER_TOKEN`

### Error 403 - Forbidden

**Causa:** Permisos insuficientes en la cuenta

**Log esperado:**
```
❌ Forbidden - check permissions
```

**Solución:**
1. Verificar permisos de la cuenta en Metricool
2. Confirmar que la página tiene permisos de publicación

### Error 404 - Not Found

**Causa:** `userId` o `blogId` incorrectos

**Log esperado:**
```
❌ Not found - check userId/blogId
```

**Solución:**
1. Verificar `METRICOOL_USER_ID` y `METRICOOL_BLOG_ID`
2. Confirmar que son números válidos
3. Verificar en Metricool Dashboard

### Error 429 - Rate Limit

**Causa:** Demasiadas peticiones

**Log esperado:**
```
⚠️ Retry 1/5 after 1200ms (status 429)
⚠️ Retry 2/5 after 2400ms (status 429)
...
```

**Comportamiento:**
- La función reintenta automáticamente con backoff exponencial
- Si se agotan los intentos → `RETRY_EXHAUSTED`

### Error: NORMALIZE_FAILED

**Causas posibles:**
1. URL del media no es pública
2. `userId`/`blogId` incorrectos
3. Archivo no accesible desde Metricool

**Verificación:**
```bash
# Debe ser accesible públicamente
curl -I "https://story.creatorsflow.app/exports/upl_xxx.mp4"
```

### Error: PROVIDER_ERROR

**Causa:** Body del POST mal formado

**Verificación del payload:**
```json
{
  "publicationDate": { "dateTime": "...", "timezone": "America/New_York" },
  "creationDate": { "dateTime": "...", "timezone": "America/New_York" },
  "text": "",
  "firstCommentText": "",
  "providers": [{ "network": "facebook" }],
  "autoPublish": true,
  "facebookData": { "type": "STORY" },
  "media": [{ "type": "video", "url": "..." }]
}
```

---

## 🧯 Troubleshooting Rápido

| Síntoma | Causa Probable | Solución |
|---------|---------------|----------|
| No aparece el botón | `PublishButton` no importado | Verificar import en `ClipsList.tsx` |
| Error de CORS | Headers mal configurados | Verificar `corsHeaders` en edge function |
| `providerId` es `null` | Metricool no lo devuelve | Normal, `status: "sent"` es suficiente |
| Token no encontrado | Secret no configurado | Agregar `METRICOOL_USER_TOKEN` en Supabase |
| Normalize falla siempre | URL privada | Verificar que `/exports/` sea público |

---

## 🔐 Buenas Prácticas

### Seguridad

- ✅ **NUNCA loguear el token completo** (solo primeros/últimos caracteres)
- ✅ Sanitizar logs (no exponer URLs privadas si las hubiera)
- ✅ Rate limiting por IP/origen si hay tráfico público alto
- ✅ Validar input antes de enviar a Metricool

### Observabilidad

```typescript
// En StoryClip backend, registrar métricas:
jobs_total{status="sent_to_provider"} // Cuando publish devuelve 200
publish_errors_total{code="NORMALIZE_FAILED"}
publish_retries_total{attempt="1"}
```

### Timeouts (opcional)

```typescript
// En edge function, agregar timeout:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

const res = await fetch(url, {
  signal: controller.signal,
  // ...
});

clearTimeout(timeoutId);
```

---

## 📎 Status Polling (Implementado)

### Edge Function: `metricool-status`

**Endpoint:** `GET /functions/v1/metricool-status?postId=XXX&userId=XXX&blogId=XXX`

**Respuesta:**
```json
{
  "status": "PUBLISHED",  // or "ERROR", "QUEUED", "PENDING", etc.
  "postId": "12345",
  "data": { /* full Metricool response */ }
}
```

### Frontend polling:

```typescript
import { getMetricoolStatus } from '@/lib/publishClient';

async function pollStatus(providerId: string) {
  const maxAttempts = 40; // 40 * 3s = 2 minutos max
  let attempt = 0;
  
  const interval = setInterval(async () => {
    try {
      const { status } = await getMetricoolStatus(providerId);
      attempt++;
      
      if (status === "PUBLISHED") {
        clearInterval(interval);
        toast({ title: "✅ Story publicada exitosamente" });
      } else if (status === "ERROR" || status === "FAILED") {
        clearInterval(interval);
        toast({ title: "❌ Error al publicar", variant: "destructive" });
      } else if (attempt >= maxAttempts) {
        clearInterval(interval);
        toast({ title: "⏱️ Timeout verificando estado" });
      }
    } catch (error) {
      console.error('Status polling error:', error);
    }
  }, 3000); // Poll cada 3s
}
```

---

## 🚀 Checklist Final de Producción

- [ ] Smoke tests pasados (normalize + publish + UI)
- [ ] Error handling testeado (401, 403, 404, 429)
- [ ] URLs públicas verificadas (curl sin auth)
- [ ] Logs limpios (sin tokens expuestos)
- [ ] Retries funcionando (verificar con 429 simulado)
- [ ] Toast messages claros para el usuario
- [ ] Documentación actualizada para el equipo

---

## 📊 Métricas a Monitorear

1. **Tasa de éxito de publicación**: `published / total_attempts`
2. **Tasa de normalize failures**: `normalize_failed / total_attempts`
3. **Promedio de retries por publicación**: `total_retries / successful_publishes`
4. **Latencia p95 de publicación**: tiempo desde click hasta response
5. **Errores por tipo**: breakdown de UNAUTHORIZED, FORBIDDEN, PROVIDER_ERROR, etc.

---

## ✅ Estado Actual (Actualizado)

- ✅ Edge Function optimizada con retries y backoff exponencial + jitter
- ✅ CORS configurado correctamente
- ✅ Logs estructurados JSON para métricas
- ✅ PublishButton integrado en ClipsList
- ✅ Error handling robusto con input validation
- ✅ Soporte para METRICOOL_USER_TOKEN y METRICOOL_API_TOKEN
- ✅ Estructura de payload según spec de Metricool
- ✅ Idempotency keys para prevenir duplicados
- ✅ Edge Function metricool-status para polling
- ✅ Client-side input validation

**Listo para producción** ✨

## 🆕 Nuevas Funcionalidades

### 1. Jitter en Retries
Previene "thundering herd" añadiendo variación aleatoria (±25%) al backoff exponencial.

### 2. Idempotency Keys
Cada publicación genera un `idempotencyKey` único para trazabilidad y prevención de duplicados.

### 3. Logs Estructurados
```json
{"evt":"publish_complete","ms":1234,"providerId":"12345"}
{"evt":"publish_retry_exhausted","ms":5678,"status":429,"attempts":5}
{"evt":"publish_post_success","ms":890,"status":200,"retry":0}
```

### 4. Input Validation
- Validación de tipo y formato de `mediaUrl`
- Validación de protocolo HTTP(S)
- Sanitización de `userId` y `blogId`

### 5. Status Polling
Endpoint dedicado para verificar estado de publicación en Metricool.
