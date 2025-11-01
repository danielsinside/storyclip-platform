#!/bin/bash

# Script para generar archivos de salida automáticamente
# Uso: ./generate_output.sh <job_id>

JOB_ID=$1
OUTPUT_DIR="/srv/storyclip/outputs"
JOB_DIR="$OUTPUT_DIR/$JOB_ID"

if [ -z "$JOB_ID" ]; then
    echo "Error: Se requiere un job_id"
    echo "Uso: $0 <job_id>"
    exit 1
fi

# Crear directorio del job
mkdir -p "$JOB_DIR"

# Generar archivo de video mock
echo "mock video content for job $JOB_ID" > "$JOB_DIR/clip_001.mp4"

# Generar archivo de thumbnail mock
echo "mock thumbnail content for job $JOB_ID" > "$JOB_DIR/thumbnail_001.jpg"

echo "Archivos generados para job $JOB_ID:"
ls -la "$JOB_DIR"
