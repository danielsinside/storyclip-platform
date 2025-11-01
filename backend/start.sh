#!/bin/bash

# Script de inicio para StoryClip Backend
echo "🚀 Iniciando StoryClip Backend..."

# Verificar que estamos en el directorio correcto
if [ ! -f "app.js" ]; then
    echo "❌ Error: No se encontró app.js. Ejecuta este script desde /srv/storyclip"
    exit 1
fi

# Verificar dependencias
echo "📦 Verificando dependencias..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    exit 1
fi

# Verificar FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: FFmpeg no está instalado"
    echo "Instala con: sudo apt install ffmpeg"
    exit 1
fi

# Verificar Redis
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Error: Redis no está instalado"
    echo "Instala con: sudo apt install redis-server"
    exit 1
fi

# Verificar conexión a Redis
if ! redis-cli ping &> /dev/null; then
    echo "❌ Error: No se puede conectar a Redis"
    echo "Inicia Redis con: sudo systemctl start redis"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ Error: PM2 no está instalado"
    echo "Instala con: npm install -g pm2"
    exit 1
fi

echo "✅ Todas las dependencias están disponibles"

# Crear directorios si no existen
mkdir -p outputs tmp
chmod 755 outputs tmp

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Advertencia: Archivo .env no encontrado"
    echo "Crea un archivo .env con las variables necesarias"
fi

# Iniciar con PM2
echo "🔄 Iniciando con PM2..."
pm2 start ecosystem.config.js

# Mostrar estado
echo "📊 Estado del proceso:"
pm2 status

echo "📝 Para ver logs: pm2 logs storyclip"
echo "🔄 Para reiniciar: pm2 restart storyclip --update-env"
echo "⏹️  Para detener: pm2 stop storyclip"

echo "✅ StoryClip Backend iniciado correctamente!"
echo "🌐 API disponible en: http://localhost:4000"
echo "📊 Health check: http://localhost:4000/api/health"

