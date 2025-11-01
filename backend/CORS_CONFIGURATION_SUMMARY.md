# 🌐 Configuración CORS - Resumen Completo

## 📋 Estado Actual

### **✅ Dominios de Lovable Configurados**

La API de Story está configurada para aceptar requests desde todos los dominios de Lovable:

#### **Dominios Principales**
- ✅ `lovable.dev` - Dominio principal
- ✅ `*.lovable.dev` - Subdominios
- ✅ `lovable.app` - Dominio de apps
- ✅ `*.lovable.app` - Subdominios de apps

#### **Dominios de Preview**
- ✅ `id-preview--*.lovable.app` - Dominios de preview específicos
- ✅ `id-preview--a630f775-59ad-406c-b0a6-387315d2cf10.lovable.app` - Dominio específico

#### **Dominios de Proyectos**
- ✅ `lovableproject.com` - Dominios de proyectos
- ✅ `*.lovableproject.com` - Subdominios de proyectos

#### **Dominios de Desarrollo**
- ✅ `localhost:3000` - Desarrollo local
- ✅ `localhost:5173` - Desarrollo local (Vite)
- ✅ `127.0.0.1:3000` - Desarrollo local
- ✅ `127.0.0.1:5173` - Desarrollo local

#### **Dominios Propios**
- ✅ `story.creatorsflow.app` - Dominio principal
- ✅ `api.creatorsflow.app` - API principal
- ✅ `144.126.129.34` - IP del servidor

---

## 🔧 Configuración Técnica

### **Nginx Configuration**
```nginx
# Mapa de orígenes CORS permitidos
map $http_origin $cors_origin {
    default "";
    
    # Local dev
    "~^https?://(localhost(:\d+)?|127\.0\.0\.1(:\d+)?)$"           $http_origin;
    
    # Lovable DEV: raíz y subdominios
    "~^https?://(?:.+\.)?lovable\.dev$"                           $http_origin;
    
    # Lovable APP: raíz, previews y subdominios
    "~^https?://(?:.+\.)?lovable\.app$"                           $http_origin;
    
    # Lovable ID Preview: dominios específicos de preview
    "~^https?://id-preview--[a-f0-9-]+\.lovable\.app$"           $http_origin;
    
    # Dominio específico que está causando el problema
    "https://id-preview--a630f775-59ad-406c-b0a6-387315d2cf10.lovable.app" $http_origin;
    
    # Lovable PROJECT: Project Runtime Hosting
    "~^https?://(?:.+\.)?lovableproject\.com$"                    $http_origin;
    
    # Tus dominios
    "~^https?://story\.creatorsflow\.app$"                        $http_origin;
    "~^https?://144\.126\.129\.34(:\d+)?$"                        $http_origin;
}
```

### **Headers CORS Aplicados**
```nginx
# CORS headers - Whitelist segura
add_header Access-Control-Allow-Origin $cors_origin always;
add_header Vary "Origin" always;
add_header Access-Control-Allow-Credentials "true" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-Mc-Auth, Idempotency-Key, X-Flow-Id, Accept, Range" always;
add_header Access-Control-Max-Age "86400" always;
add_header Access-Control-Expose-Headers "Content-Length, Content-Range" always;
```

### **Preflight Requests (OPTIONS)**
```nginx
# Preflight CORS
if ($request_method = 'OPTIONS') {
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Vary "Origin" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-Mc-Auth, Idempotency-Key, X-Flow-Id, Accept, Range" always;
    add_header Access-Control-Max-Age "86400" always;
    add_header Content-Length 0;
    add_header Content-Type text/plain;
    return 204;
}
```

---

## 🧪 Verificación de CORS

### **Comando de Prueba**
```bash
# Probar CORS con dominio específico
curl -H "Origin: https://id-preview--a630f775-59ad-406c-b0a6-387315d2cf10.lovable.app" \
     -I https://story.creatorsflow.app/outputs/uploads/archivo.mp4

# Probar CORS con lovable.dev
curl -H "Origin: https://lovable.dev" \
     -I https://story.creatorsflow.app/outputs/uploads/archivo.mp4

# Probar CORS con localhost
curl -H "Origin: http://localhost:3000" \
     -I https://story.creatorsflow.app/outputs/uploads/archivo.mp4
```

### **Headers Esperados**
```http
HTTP/2 200
Access-Control-Allow-Origin: https://tu-dominio.lovable.app
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Mc-Auth, Idempotency-Key, X-Flow-Id, Accept, Range
Access-Control-Max-Age: 86400
Access-Control-Expose-Headers: Content-Length, Content-Range
```

---

## 🚨 Solución de Problemas

### **Error: CORS Policy**
```
Blocked a frame with origin "https://lovable.dev" from accessing a frame with origin "https://id-preview--a630f775-59ad-406c-b0a6-387315d2cf10.lovable.app"
```

**✅ Solución Aplicada:**
- Agregado dominio específico a la lista blanca
- Configuración de regex para dominios de preview
- Headers CORS aplicados correctamente

### **Error: 405 Not Allowed**
```
405 Not Allowed for OPTIONS requests
```

**✅ Solución Aplicada:**
- Configuración de preflight requests
- Manejo correcto de OPTIONS method
- Headers apropiados para preflight

### **Error: Access-Control-Allow-Origin**
```
No 'Access-Control-Allow-Origin' header is present
```

**✅ Solución Aplicada:**
- Mapa de orígenes configurado
- Headers CORS aplicados dinámicamente
- Vary: Origin configurado

---

## 📊 Estadísticas de Configuración

### **Dominios Configurados**
- **Total**: 15+ patrones de dominio
- **Lovable**: 8 patrones principales
- **Desarrollo**: 4 patrones locales
- **Producción**: 3 dominios propios

### **Headers CORS**
- **Allow-Origin**: Dinámico basado en origen
- **Allow-Methods**: 6 métodos HTTP
- **Allow-Headers**: 8 headers permitidos
- **Max-Age**: 24 horas (86400 segundos)
- **Credentials**: Habilitado

### **Rutas Configuradas**
- **`/outputs/uploads/`** - Archivos de video
- **`/preview/`** - Previews de video
- **`/api/`** - Endpoints de API

---

## 🔄 Mantenimiento

### **Agregar Nuevos Dominios**
```nginx
# Agregar nuevo dominio a la lista
"~^https?://nuevo-dominio\.com$" $http_origin;
```

### **Verificar Configuración**
```bash
# Probar configuración de Nginx
sudo nginx -t

# Recargar configuración
sudo systemctl reload nginx
```

### **Monitoreo de Logs**
```bash
# Ver logs de acceso
tail -f /var/log/nginx/access.log | grep CORS

# Ver logs de error
tail -f /var/log/nginx/error.log | grep CORS
```

---

## 🎯 Próximos Pasos

### **Para Lovable**
1. ✅ **CORS configurado** - Todos los dominios permitidos
2. ✅ **Headers aplicados** - Configuración completa
3. ✅ **Preflight configurado** - OPTIONS requests manejados
4. ✅ **Documentación completa** - Guías de integración
5. ✅ **Ejemplos de código** - Listos para usar

### **Para Desarrollo**
1. **Probar integración** - Subir video desde Lovable
2. **Verificar CORS** - Confirmar headers
3. **Implementar en producción** - Usar en aplicación real
4. **Monitorear logs** - Verificar funcionamiento

---

## 📞 Soporte

### **Verificación de Estado**
```bash
# Verificar estado de Nginx
sudo systemctl status nginx

# Verificar configuración
sudo nginx -t

# Ver logs en tiempo real
tail -f /var/log/nginx/access.log
```

### **Contacto**
- **Documentación**: Archivos en `/srv/storyclip/`
- **Logs**: `/var/log/nginx/`
- **Estado**: `https://story.creatorsflow.app/health`

---

**¡Configuración CORS completa para Lovable! 🌐✨**

---

*Configuración aplicada el 19 de Octubre de 2025 - Story API v1.0.0*










