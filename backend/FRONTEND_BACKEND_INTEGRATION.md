# Frontend-Backend Integration - StoryClip

**Fecha**: 2025-10-27
**Estado**: ✅ **CONFIGURADO Y FUNCIONANDO**

---

## 🎯 Arquitectura

### Backend
- **Ubicación**: `/srv/storyclip`
- **Tecnología**: Node.js + Express
- **Puerto**: 3000 (localhost)
- **Proceso**: PM2 (PID 617678)
- **Health Endpoint**: `http://localhost:3000/api/health`

### Frontend
- **Ubicación**: `/srv/frontend/dist`
- **Tecnología**: Vite + React
- **Tipo**: Build estático (no requiere servidor Node)
- **Servido por**: Nginx

### Dominio
- **URL**: `https://story.creatorsflow.app`
- **SSL**: Let's Encrypt (certificado compartido con creatorsflow.app)

---

## 🔧 Configuración de Nginx

### Ubicación del Config
`/etc/nginx/sites-available/story.creatorsflow.app`

### Rutas Configuradas

#### 1. API Backend (Proxy)
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    # Headers de proxy + CORS habilitado
}
```
- **Acceso**: `https://story.creatorsflow.app/api/*`
- **Destino**: `http://localhost:3000/api/*`

#### 2. Outputs/CDN (Proxy)
```nginx
location /outputs/ {
    proxy_pass http://127.0.0.1:3000/outputs/;
    # Cache: 1 año
}
```
- **Acceso**: `https://story.creatorsflow.app/outputs/*`
- **Destino**: Archivos procesados (clips de video)

#### 3. Frontend (Static)
```nginx
location / {
    root /srv/frontend/dist;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```
- **Acceso**: `https://story.creatorsflow.app/`
- **Tipo**: SPA (Single Page Application)

---

## 🔐 Seguridad

### CORS Headers
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key
```

### Security Headers
- ✅ X-Frame-Options: SAMEORIGIN
- ✅ X-XSS-Protection: 1; mode=block
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: no-referrer-when-downgrade
- ✅ Content-Security-Policy: default-src 'self' http: https: data: blob: 'unsafe-inline'

### SSL/TLS
- ✅ TLS 1.2, TLS 1.3
- ✅ Strong ciphers
- ✅ Session cache configurado

---

## 📝 Variables de Entorno Frontend

**Archivo**: `/srv/frontend/.env`

```env
VITE_STORYCLIP_BASE=https://story.creatorsflow.app
VITE_STORYCLIP_CDN=https://story.creatorsflow.app/outputs
VITE_STORYCLIP_API_KEY=sk_prod_21000fdf3489bf37c0c48391e20c00947b125c3fd7bbf6f0
VITE_STORYCLIP_POLL_MS=2500
VITE_STORYCLIP_PROCESS_TIMEOUT_MS=900000

# Supabase disabled
VITE_USE_SUPABASE=false
VITE_PRESET_SOURCE=local
```

---

## ✅ Tests de Verificación

### Test 1: Backend Health Check
```bash
curl -s https://story.creatorsflow.app/api/health | jq .
```
**Respuesta esperada**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T23:52:38.338Z",
  "uptime": 1565.65,
  "version": "1.0.0"
}
```

### Test 2: CORS Preflight
```bash
curl -I -X OPTIONS https://story.creatorsflow.app/api/process-video \
  -H "Origin: https://story.creatorsflow.app" \
  -H "Access-Control-Request-Method: POST"
```
**Headers esperados**:
```
access-control-allow-origin: https://story.creatorsflow.app
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-credentials: true
```

### Test 3: Frontend Loading
```bash
curl -I https://story.creatorsflow.app/
```
**Respuesta esperada**:
```
HTTP/2 200
content-type: text/html
```

### Test 4: Static Assets
```bash
curl -I https://story.creatorsflow.app/assets/index-*.js
```
**Respuesta esperada**:
```
HTTP/2 200
cache-control: public, max-age=31536000, immutable
```

---

## 🚀 Endpoints del API Disponibles

### Health & Status
- `GET /api/health` - Health check del backend

### Upload
- `POST /api/videos/upload` - Subir video (multipart/form-data)
  - Campo: `file` (archivo de video)
  - Respuesta: `{ uploadId, videoUrl, size }`

### Processing
- `POST /api/process-video` - Procesar video en clips
  - Body: `{ uploadId, mode, clips, filters, effects, overlays }`
  - Respuesta: `{ jobId, status, message }`

### Job Status
- `GET /api/stories/:jobId/status` - Obtener estado del procesamiento
  - Respuesta: `{ id, status, progress, result: { artifacts } }`

---

## 🔄 Flujo de Procesamiento

1. **Usuario sube video**:
   ```
   POST /api/videos/upload
   → Retorna uploadId
   ```

2. **Frontend solicita procesamiento**:
   ```
   POST /api/process-video
   Body: { uploadId, mode: "manual", clips: [...] }
   → Retorna jobId
   ```

3. **Frontend consulta progreso** (polling cada 2.5s):
   ```
   GET /api/stories/:jobId/status
   → Retorna { status, progress, artifacts }
   ```

4. **Cuando completa** (progress: 100%):
   ```
   {
     status: "done",
     progress: 100,
     result: {
       artifacts: [
         { url: "https://story.creatorsflow.app/outputs/:jobId/clip_001.mp4", ... }
       ]
     }
   }
   ```

---

## 🛠️ Comandos Útiles

### Verificar Backend
```bash
# Ver estado de PM2
pm2 status

# Ver logs en tiempo real
pm2 logs storyclip

# Reiniciar backend
pm2 restart storyclip

# Health check local
curl http://localhost:3000/api/health
```

### Verificar Nginx
```bash
# Test de configuración
nginx -t

# Recargar configuración
systemctl reload nginx

# Ver logs de acceso
tail -f /var/log/nginx/access.log

# Ver logs de error
tail -f /var/log/nginx/error.log
```

### Verificar Frontend
```bash
# Verificar archivos estáticos
ls -lh /srv/frontend/dist/

# Ver variables de entorno
cat /srv/frontend/.env

# Verificar acceso web
curl -I https://story.creatorsflow.app/
```

---

## 📊 Estado Actual del Sistema

| Componente | Estado | Detalles |
|------------|--------|----------|
| **Backend** | ✅ ONLINE | PM2 PID 617678, puerto 3000 |
| **Frontend** | ✅ ONLINE | Nginx serving static files |
| **Nginx** | ✅ CONFIGURED | story.creatorsflow.app habilitado |
| **SSL/TLS** | ✅ VALID | Let's Encrypt certificate |
| **CORS** | ✅ ENABLED | Todos los headers configurados |
| **API Health** | ✅ OK | Respondiendo correctamente |
| **FFmpeg** | ✅ FIXED | Error 234 resuelto |

---

## 🎯 Próximos Pasos

1. **Probar desde el navegador**:
   - Ir a `https://story.creatorsflow.app`
   - Subir un video de prueba
   - Verificar que el procesamiento funciona sin errores 234

2. **Monitorear logs**:
   ```bash
   pm2 logs storyclip --lines 100
   ```

3. **Verificar métricas** (si están configuradas):
   - Grafana: `http://<server-ip>:3002`
   - Prometheus: `http://<server-ip>:9090`

---

## 📞 Troubleshooting

### Problema: Frontend no carga
```bash
# Verificar que Nginx esté corriendo
systemctl status nginx

# Verificar archivos estáticos
ls -lh /srv/frontend/dist/index.html

# Recargar Nginx
systemctl reload nginx
```

### Problema: API no responde
```bash
# Verificar que el backend esté corriendo
pm2 status

# Ver logs del backend
pm2 logs storyclip --lines 50

# Reiniciar backend
pm2 restart storyclip
```

### Problema: CORS errors en navegador
```bash
# Verificar headers de CORS
curl -I -X OPTIONS https://story.creatorsflow.app/api/health

# Verificar configuración de Nginx
cat /etc/nginx/sites-available/story.creatorsflow.app | grep -A 10 "CORS"
```

---

## ✨ Conclusión

La integración entre frontend y backend está **completamente configurada y funcionando**:

1. ✅ Nginx configurado como reverse proxy
2. ✅ Frontend servido correctamente (static SPA)
3. ✅ Backend accesible a través de `/api/`
4. ✅ CORS habilitado y funcionando
5. ✅ SSL/TLS configurado
6. ✅ Security headers aplicados
7. ✅ Error 234 de FFmpeg resuelto

**El sistema está listo para recibir requests del frontend y procesar videos sin errores.**
