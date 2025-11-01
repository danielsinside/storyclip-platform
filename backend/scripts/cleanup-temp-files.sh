#!/bin/bash

# Script de limpieza automática de archivos temporales
# StoryClip Backend - Ejecutado por cron

LOG_FILE="/var/log/storyclip-cleanup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting cleanup..." >> "$LOG_FILE"

# Limpiar archivos MP4 temporales (más de 6 horas)
TMP_COUNT=$(find /srv/storyclip/tmp -type f -name "*.mp4" -mmin +360 2>/dev/null | wc -l)
WORK_COUNT=$(find /srv/storyclip/work -type f -name "*.mp4" -mmin +360 2>/dev/null | wc -l)

if [ "$TMP_COUNT" -gt 0 ]; then
  echo "[$DATE] Cleaning $TMP_COUNT files from /srv/storyclip/tmp" >> "$LOG_FILE"
  find /srv/storyclip/tmp -type f -name "*.mp4" -mmin +360 -delete 2>> "$LOG_FILE"
fi

if [ "$WORK_COUNT" -gt 0 ]; then
  echo "[$DATE] Cleaning $WORK_COUNT files from /srv/storyclip/work" >> "$LOG_FILE"
  find /srv/storyclip/work -type f -name "*.mp4" -mmin +360 -delete 2>> "$LOG_FILE"
fi

# Limpiar directorios vacíos
find /srv/storyclip/work -type d -empty -delete 2>> "$LOG_FILE"

# Calcular espacio liberado
TMP_SIZE=$(du -sh /srv/storyclip/tmp 2>/dev/null | awk '{print $1}')
WORK_SIZE=$(du -sh /srv/storyclip/work 2>/dev/null | awk '{print $1}')

echo "[$DATE] Cleanup completed. Current sizes: tmp=$TMP_SIZE, work=$WORK_SIZE" >> "$LOG_FILE"

# Rotar log si es muy grande (> 10MB)
LOG_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo "0")
if [ "$LOG_SIZE" -gt 10485760 ]; then
  mv "$LOG_FILE" "$LOG_FILE.old"
  echo "[$DATE] Log rotated" > "$LOG_FILE"
fi
