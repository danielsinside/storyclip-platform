# 🚀 StoryClip - Optimizaciones y Configuración Diaria

## ⚡ **Configuración de Concurrencia (12C/24T)**

### **Configuración Recomendada:**
```bash
# Máximo jobs concurrentes: 6-8
# Threads por job: 3-4 (deja margen para el sistema)
# Total threads utilizados: 18-32 (de 24 disponibles)
```

### **Variables de Entorno:**
```bash
# En /srv/storyclip/.env
MAX_CONCURRENT_JOBS=6
THREADS_PER_JOB=4
FFMPEG_THREADS=0  # Auto-detect
```

---

## 🎬 **Presets y Codecs**

### **AV1 Configuration:**
- **Actual:** libaom-av1 (estable, lento)
- **Futuro:** SVT-AV1 (10-20x más rápido)
- **Detección automática:** `/api/capabilities` → `av1_svt: true/false`

### **Loudness Normalization:**
```bash
# storyclip_social_916 ya incluye:
-af "loudnorm=I=-14:TP=-1.5:LRA=11"

# Para música con picos altos:
-af "loudnorm=I=-14:TP=-2.0:LRA=11"
```

### **Keyframes para Social Media:**
```bash
# 24-30fps (actual):
-g 48 -keyint_min 48 -sc_threshold 0

# 60fps (si necesitas):
-g 120 -keyint_min 120 -sc_threshold 0
```

---

## 📊 **Monitoreo y Telemetría**

### **Progreso FFmpeg Mejorado:**
```bash
# Para barras de progreso más fluidas:
ffmpeg -progress pipe:1 -nostats -loglevel error [args]

# Reportes detallados:
export FFREPORT=file=/tmp/ffreport_%p_%t.log:level=32
```

### **Métricas Recomendadas:**
- **CPU Usage:** < 80% promedio
- **Memory:** < 16GB por job
- **I/O Wait:** < 5% (si es alto, reducir concurrencia)
- **Queue Time:** < 30 segundos

---

## 🔧 **Configuración de Límites del Sistema**

### **Archivos Abiertos:**
```bash
# Aumentar límite
ulimit -n 1048576

# Verificar fuentes
fc-list | head
```

### **Directorio de Trabajo:**
```bash
# Usar NVMe para temporales (si está disponible)
export TEMP_DIR="/mnt/nvme/tmp"
export OUTPUT_DIR="/mnt/nvme/outputs"
```

---

## 🎯 **Casos de Uso por Preset**

### **storyclip_fast**
- **Uso:** Previews, export general
- **Calidad:** Buena
- **Velocidad:** Rápida
- **Tamaño:** Medio

### **storyclip_quality**
- **Uso:** Archivo, alta calidad
- **Calidad:** Excelente
- **Velocidad:** Lenta
- **Tamaño:** Pequeño (50-60% menos que H.264)

### **storyclip_social_916**
- **Uso:** Stories, Reels, contenido vertical
- **Calidad:** Buena
- **Velocidad:** Rápida
- **Características:** Loudness normalizado, keyframes optimizados

### **storyclip_av1**
- **Uso:** Web moderno, futuro
- **Calidad:** Excelente
- **Velocidad:** Media
- **Tamaño:** Muy pequeño (mejor compresión)

### **storyclip_stabilized**
- **Uso:** Video tembloroso, handheld
- **Calidad:** Buena
- **Velocidad:** Media
- **Características:** Estabilización automática

### **storyclip_vmaf_quality**
- **Uso:** Análisis de calidad, profesional
- **Calidad:** Excelente
- **Velocidad:** Media
- **Características:** Métricas VMAF incluidas

---

## 🚨 **Troubleshooting**

### **Jobs Colgados:**
```bash
# Verificar jobs activos
pm2 logs storyclip --lines 50

# Reiniciar si es necesario
pm2 restart storyclip
```

### **Alto I/O Wait:**
```bash
# Reducir concurrencia
export MAX_CONCURRENT_JOBS=4

# Mover temporales a NVMe
export TEMP_DIR="/mnt/nvme/tmp"
```

### **Memoria Insuficiente:**
```bash
# Verificar uso de memoria
free -h
htop

# Reducir threads por job
export THREADS_PER_JOB=2
```

---

## 📈 **Benchmarking Regular**

### **Comando de Benchmark:**
```bash
# Benchmark automático
/usr/local/bin/ffmpeg_benchmark.sh input_video.mp4 60

# O usar endpoint
curl -X POST http://localhost:3000/api/benchmark \
  -H "Content-Type: application/json" \
  -d '{"codec": "h264", "duration": 60, "inputUrl": "https://example.com/test.mp4"}'
```

### **Métricas Esperadas (AMD Ryzen 9 7900):**
- **H.264 veryfast:** 8-12x realtime
- **HEVC slow:** 2-4x realtime  
- **AV1 libaom:** 1-2x realtime
- **AV1 SVT (futuro):** 4-8x realtime

---

## 🔄 **Mantenimiento Diario**

### **Limpieza Automática:**
```bash
# Jobs antiguos (24h)
# Archivos temporales (1h)
# Logs rotativos (7 días)
```

### **Verificación de Salud:**
```bash
# Endpoints de salud
curl http://localhost:3000/api/health

# Capacidades del sistema
curl http://localhost:3000/api/capabilities

# Estado de PM2
pm2 status
```

---

## 🎉 **Resultado Final**

Con esta configuración, tu servidor Contabo con AMD Ryzen 9 7900 puede procesar:

- **6-8 jobs simultáneos** de video
- **H.264 a 8-12x realtime**
- **HEVC a 2-4x realtime**
- **AV1 a 1-2x realtime** (mejorará con SVT-AV1)
- **Estabilización automática**
- **Análisis de calidad VMAF**
- **100+ efectos visuales (frei0r)**

**¡El sistema está optimizado para máximo rendimiento!** 🚀











