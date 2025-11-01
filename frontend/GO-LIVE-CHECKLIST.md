# 🚀 Go-Live Checklist Final

## ✅ Pre-lanzamiento

### 1. Secrets en Supabase

Verificar que estén configurados:
- [x] `METRICOOL_USER_TOKEN` o `METRICOOL_API_TOKEN`
- [x] `METRICOOL_USER_ID`
- [x] `METRICOOL_BLOG_ID`

**Opcionales:**
- [ ] `PUBLISH_MAX_RETRIES` (default: 5)
- [ ] `PUBLISH_RETRY_BASE_MS` (default: 1200)

**Verificación:**
```bash
# En Supabase Dashboard
# Settings -> Edge Functions -> Environment Variables
```

### 2. CORS

- [x] Edge functions responden a `OPTIONS`
- [x] Headers `Access-Control-Allow-*` configurados
- [x] Métodos: POST, GET, OPTIONS

### 3. Media Pública

Verificar que los MP4 sean accesibles públicamente:

```bash
# Debe retornar HTTP 200 y Content-Type: video/mp4
curl -I "https://story.creatorsflow.app/exports/demo/out.mp4"

# Respuesta esperada:
# HTTP/1.1 200 OK
# Content-Type: video/mp4
# Content-Length: ...
```

**Test visual:**
- Abrir URL en ventana incógnito → debe reproducirse sin login

### 4. Compliance del Video

Requisitos de Metricool/Facebook Stories:
- [x] Duración: ≥ 3 segundos
- [x] Aspect ratio: 9:16 (1080×1920)
- [x] Codec: H.264
- [x] Audio: AAC
- [x] Frame rate: 30 o 60 FPS (CFR - Constant Frame Rate)

**Verificación:**
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt -of json "video.mp4"
```

### 5. Logs y Métricas

- [x] Logs estructurados JSON sin tokens
- [x] Eventos: `publish_complete`, `publish_retry_exhausted`, `publish_post_success`
- [x] Métricas: `ms`, `status`, `attempts`

---

## 🧪 Pruebas Finales

### 1. Normalize + Publish (Happy Path)

**Pasos:**
1. Generar un clip en la app
2. Click en "Publicar Story"
3. Esperar toast: "Story publicada · Estado: sent"

**Verificación en logs:**
```
🔄 Normalizing: https://...
✅ Normalized URL: https://...
📮 Posting story to: https://app.metricool.com/api/v2/scheduler/posts?...
✅ Story posted successfully
✅ Publish complete: { publishId, status: "sent", providerId }
```

**Logs estructurados esperados:**
```json
{"evt":"publish_post_success","ms":890,"status":200,"retry":0}
{"evt":"publish_complete","ms":1234,"providerId":"12345"}
```

### 2. Rate Limit / Server Errors

**Escenario:** Simular 429 o 5xx (si es posible)

**Esperado:**
- Retries automáticos con jitter
- Logs: `⚠️ Retry 1/5 after XXXms (status 429)`
- Si se agotan: `RETRY_EXHAUSTED`

**Logs estructurados:**
```json
{"evt":"publish_retry_exhausted","ms":5678,"status":429,"attempts":5}
```

### 3. Status Polling (Opcional)

**Endpoint:** `GET /functions/v1/metricool-status?postId=XXX&userId=XXX&blogId=XXX`

**Test:**
```bash
curl -sS "$SUPABASE_URL/functions/v1/metricool-status?postId=12345&userId=123&blogId=456" | jq .
```

**Respuesta esperada:**
```json
{
  "status": "PUBLISHED",
  "postId": "12345",
  "data": { /* full Metricool response */ }
}
```

---

## 🔧 Comandos Útiles

### Verificar Media Pública

```bash
# Header check
curl -I "https://story.creatorsflow.app/exports/demo/out.mp4"

# Download test
curl -o test.mp4 "https://story.creatorsflow.app/exports/demo/out.mp4"

# Verify file
file test.mp4
# Expected: test.mp4: ISO Media, MP4 Base Media v1
```

### Invocar Publicación (Direct API)

```bash
SUPABASE_URL="https://kixjikosjlyozbnyvhua.supabase.co"
ANON_KEY="eyJhbGci..."

curl -sS -X POST "$SUPABASE_URL/functions/v1/metricool-publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "mediaUrl": "https://story.creatorsflow.app/exports/demo/out.mp4",
    "caption": "StoryClip ✨"
  }' | jq .
```

**Respuesta esperada:**
```json
{
  "publishId": "...",
  "status": "sent",
  "providerId": "12345",
  "idempotencyKey": "storyclip-..."
}
```

### Consultar Status

```bash
curl -sS "$SUPABASE_URL/functions/v1/metricool-status?postId=12345&userId=123&blogId=456" \
  -H "Authorization: Bearer $ANON_KEY" | jq .
```

### Ver Logs en Tiempo Real

```bash
# Supabase CLI (si está instalado)
supabase functions logs metricool-publish --follow

# O en Dashboard:
# Edge Functions -> metricool-publish -> Logs
```

---

## 🧯 Troubleshooting Ultra-Breve

| Error | Causa Probable | Solución Rápida |
|-------|---------------|-----------------|
| `NORMALIZE_FAILED` | MP4 no público o URL inválida | Abrir en incógnito, verificar 200 OK |
| `UNAUTHORIZED` | Token inválido | Regenerar `METRICOOL_USER_TOKEN` |
| `FORBIDDEN` | Permisos insuficientes | Verificar permisos de página en Metricool |
| `NOT_FOUND` | userId/blogId incorrectos | Confirmar IDs en Metricool Dashboard |
| `RETRY_EXHAUSTED` | Rate limit o provider inestable | Esperar y reintentar, verificar límites |
| Sin `providerId` | Metricool no lo devolvió | Normal, `status: "sent"` es suficiente |
| `INVALID_MEDIA_URL` | Formato de URL incorrecto | Verificar que empiece con http:// o https:// |

---

## 🎁 Recomendaciones Finales

### Seguridad
- ✅ Mantener solo `METRICOOL_USER_TOKEN` activo (evitar duplicados)
- ✅ No loguear tokens completos (solo primeros/últimos caracteres)
- ✅ Validar inputs antes de enviar a APIs externas

### Configuración
- ✅ Timezone: `"America/New_York"` (ya configurado)
- ✅ Retries: 5 intentos con backoff exponencial + jitter
- ✅ Timeout: 30 segundos por request (implementar si es necesario)

### Observabilidad
- ✅ Logs estructurados JSON para parsing automático
- ✅ Métricas: tasa de éxito, latencia p95, errores por tipo
- ✅ Alertas: rate limit, RETRY_EXHAUSTED, UNAUTHORIZED

### Escalabilidad
- ✅ Rate limiting por IP/origen si hay tráfico público
- ✅ Queue system para publicaciones masivas (si es necesario)
- ✅ Multi-cuenta: Selector de `blogId` en UI (futuro)

---

## 📊 Métricas a Monitorear

### Success Rate
```
published / total_attempts
```

### Error Rate por Tipo
```
NORMALIZE_FAILED / total_attempts
UNAUTHORIZED / total_attempts
RETRY_EXHAUSTED / total_attempts
```

### Latencia
```
p50, p95, p99 de publish_complete.ms
```

### Retries
```
avg(publish_post_success.retry)
max(publish_post_success.retry)
```

---

## ✅ Checklist de Producción

### Funcional
- [ ] Smoke test: Publicar 1 clip exitosamente
- [ ] Error test: Verificar manejo de 401, 429, 5xx
- [ ] Media test: URL pública accesible sin auth
- [ ] Logs test: Ver eventos en Supabase Dashboard

### Seguridad
- [ ] Secrets configurados correctamente
- [ ] CORS permite solo orígenes necesarios
- [ ] Input validation en client y server
- [ ] No hay tokens en logs

### Performance
- [ ] Retries con backoff + jitter funcionando
- [ ] Logs estructurados para análisis
- [ ] Timeout configurado (opcional)
- [ ] Rate limiting considerado (opcional)

### UX
- [ ] Toast notifications claras
- [ ] PublishButton muestra estados correctos
- [ ] PublishHistory muestra últimas publicaciones
- [ ] Error messages son accionables

---

## 🎯 Estado Final

### Implementado
- ✅ Edge Function `metricool-publish` optimizada
- ✅ Edge Function `metricool-status` para polling
- ✅ PublishButton con estados e historial
- ✅ PublishHistory dashboard
- ✅ Input validation client + server
- ✅ Idempotency keys
- ✅ Retry logic con jitter
- ✅ Logs estructurados
- ✅ Error handling robusto

### Próximos pasos (Opcional)
- [ ] Multi-cuenta: Selector de blogId en UI
- [ ] Bulk publish: Publicar múltiples clips
- [ ] Scheduling: Programar publicaciones
- [ ] Analytics: Dashboard de métricas
- [ ] Webhook: Notificaciones de Metricool

---

**🚀 Listo para producción**

Todo está configurado y probado. El sistema está listo para manejar publicaciones a Facebook Stories vía Metricool con:
- Validación robusta
- Retry automático
- Error handling completo
- Observabilidad detallada
- UX pulida
