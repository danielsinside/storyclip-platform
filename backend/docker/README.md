# 🐳 StoryClip Docker Setup

Docker setup completo para StoryClip con FFmpeg 8.0 "Huffman" + SVT-AV1, listo para CI/CD y rollback fácil.

## 📁 Estructura de Archivos

```
docker/
├── Dockerfile              # Backend completo (Node + FFmpeg)
├── Dockerfile.ffmpeg       # Solo FFmpeg (worker/CLI)
├── docker-compose.yml      # Orquestación de servicios
├── deploy.sh              # Script de deployment
├── rollback.sh            # Script de rollback
└── README.md              # Esta documentación
```

## 🚀 Quick Start

### 1. Deploy Inicial
```bash
cd /srv/storyclip/docker
./deploy.sh
```

### 2. Verificar Servicios
```bash
# Verificar status
docker compose ps

# Ver logs
docker compose logs -f

# Test API
curl http://localhost:3000/api/capabilities | jq .
```

### 3. Rollback (si es necesario)
```bash
# Rollback a versión anterior
./rollback.sh --previous

# Rollback a tag específico
./rollback.sh --tag v1.0.0

# Listar versiones disponibles
./rollback.sh --list
```

## 🏗️ Arquitectura

### Servicios

#### 1. **storyclip** (Backend Principal)
- **Imagen:** `storyclip/backend:ffmpeg8-svt`
- **Puerto:** 3000
- **Funciones:** API REST, procesamiento de jobs, integración Metricool
- **Health Check:** `http://localhost:3000/api/health`

#### 2. **ffmpeg-runner** (Worker FFmpeg)
- **Imagen:** `storyclip/ffmpeg:ffmpeg8-svt`
- **Funciones:** Procesamiento de video aislado, CLI FFmpeg
- **Health Check:** Verificación de codecs disponibles

### Codecs Incluidos

- ✅ **libx264** - H.264 encoder/decoder
- ✅ **libx265** - HEVC encoder/decoder
- ✅ **libaom** - AV1 encoder/decoder (libaom-av1)
- ✅ **libsvtav1** - SVT-AV1 encoder (10-20x más rápido)
- ✅ **libdav1d** - AV1 decoder (rápido)

### Filtros Profesionales

- ✅ **frei0r** - Efectos visuales
- ✅ **libvmaf** - Análisis de calidad VMAF
- ✅ **vidstab** - Estabilización de video
- ✅ **zoompan** - Zoom y pan dinámico
- ✅ **tblend** - Transiciones avanzadas

## 🔧 Configuración

### Variables de Entorno

Edita `docker-compose.yml` para agregar tus secrets:

```yaml
environment:
  NODE_ENV: "production"
  METRICOOL_TOKEN: "tu_token_aqui"
  SUPABASE_URL: "tu_supabase_url"
  # ... más variables
```

### Volúmenes

```yaml
volumes:
  - /srv/storyclip/data:/srv/storyclip/data    # Datos persistentes
  - /srv/storyclip/logs:/srv/storyclip/logs    # Logs
```

### Puertos

```yaml
ports:
  - "3000:3000"  # API Backend
```

## 🚀 CI/CD con GitHub Actions

### Workflow Automático

El workflow `.github/workflows/docker.yml` se ejecuta automáticamente cuando:

- Se hace push a `main`
- Se modifican archivos en `docker/`, `package*.json`, `server.js`, o `src/`

### Secrets Requeridos

Configura estos secrets en GitHub:

- `DOCKERHUB_USER` - Usuario de Docker Hub
- `DOCKERHUB_TOKEN` - Token de Docker Hub

### Build Multi-Arch

El workflow construye para:
- `linux/amd64` (x86_64)

## 🛠️ Comandos de Gestión

### Servicios
```bash
# Levantar servicios
docker compose up -d

# Parar servicios
docker compose down

# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Actualizar
docker compose pull && docker compose up -d
```

### Imágenes
```bash
# Listar imágenes
docker images | grep storyclip

# Limpiar imágenes antiguas
docker image prune -f

# Build manual
docker compose build --no-cache
```

### Debugging
```bash
# Entrar al contenedor backend
docker exec -it storyclip bash

# Entrar al contenedor FFmpeg
docker exec -it ffmpeg-runner bash

# Verificar FFmpeg
docker exec ffmpeg-runner ffmpeg -version

# Test codecs
docker exec ffmpeg-runner ffmpeg -hide_banner -codecs | grep -E "libx264|libx265|libaom|svtav1"
```

## 📊 Monitoreo

### Health Checks

#### Backend
```bash
curl -fsS http://localhost:3000/api/health
```

#### FFmpeg Runner
```bash
docker exec ffmpeg-runner /usr/local/bin/ffmpeg-health
```

### Métricas de Rendimiento

```bash
# CPU y memoria
docker stats

# Logs en tiempo real
docker compose logs -f storyclip

# Verificar jobs
curl http://localhost:3000/api/capabilities | jq .
```

## 🔄 Rollback y Versionado

### Tags de Versión

```bash
# Listar versiones
./rollback.sh --list

# Rollback a versión específica
./rollback.sh --tag v1.0.0

# Rollback a anterior
./rollback.sh --previous
```

### Estrategia de Versionado

- `latest` - Última versión estable
- `ffmpeg8-svt` - Versión con FFmpeg 8.0 + SVT-AV1
- `v1.0.0` - Versiones semánticas

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. **Servicios no inician**
```bash
# Verificar logs
docker compose logs

# Verificar recursos
docker stats

# Rebuild completo
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### 2. **FFmpeg no funciona**
```bash
# Verificar codecs
docker exec ffmpeg-runner ffmpeg -hide_banner -codecs

# Test básico
docker exec ffmpeg-runner ffmpeg -f lavfi -i testsrc -t 1 test.mp4
```

#### 3. **API no responde**
```bash
# Verificar health
curl http://localhost:3000/api/health

# Verificar logs
docker compose logs storyclip

# Reiniciar backend
docker compose restart storyclip
```

### Logs Importantes

```bash
# Logs del backend
docker compose logs storyclip

# Logs de FFmpeg
docker compose logs ffmpeg-runner

# Logs del sistema
journalctl -u storyclip
```

## 📈 Optimizaciones

### Concurrencia

Para tu servidor 12C/24T:

- **H.264:** 8-10 jobs concurrentes
- **HEVC/AV1:** 4-6 jobs concurrentes
- **Total:** 6-8 jobs máximo

### I/O Optimizado

```bash
# Montar en NVMe para temp files
volumes:
  - /fast-storage/tmp:/srv/storyclip/data/tmp
```

### Recursos

```yaml
# Limitar recursos si es necesario
deploy:
  resources:
    limits:
      cpus: '8.0'
      memory: 8G
```

## 🎯 Próximos Pasos

1. **Monitoreo Avanzado** - Prometheus + Grafana
2. **Load Balancer** - Nginx/Traefik
3. **Database** - PostgreSQL/Redis
4. **Queue** - Bull/Redis para jobs
5. **Storage** - S3/MinIO para archivos

## 📞 Soporte

- **Logs:** `docker compose logs -f`
- **Status:** `docker compose ps`
- **Health:** `curl http://localhost:3000/api/health`
- **Capabilities:** `curl http://localhost:3000/api/capabilities | jq .`

---

**🎉 ¡Sistema listo para producción con FFmpeg 8.0 + SVT-AV1!**











