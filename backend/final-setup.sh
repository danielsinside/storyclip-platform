#!/bin/bash

echo "=== BLOQUE E: PRUEBA DE CONEXIÓN SSH CON GITHUB ==="
echo "Ejecutando ssh -T git@github.com..."
ssh -T git@github.com
echo ""

echo "=== BLOQUE F: CONFIGURACIÓN DEL REPOSITORIO REMOTO ==="
echo "Navegando a /srv/storyclip..."
cd /srv/storyclip
echo "Directorio actual: $(pwd)"
echo ""

echo "Verificando remotes existentes..."
git remote -v
echo ""

echo "Agregando remote origin..."
git remote add origin git@github.com:danielsinside/storyclip-backend.git
echo ""

echo "Verificando configuración de remote..."
git remote -v
echo ""

echo "Configurando rama principal..."
git branch -M main
echo ""

echo "Haciendo push inicial..."
git push -u origin main
echo ""

echo "=== VERIFICACIÓN FINAL ==="
echo "Verificando estado del repositorio..."
git status
echo ""

echo "Verificando ramas..."
git branch -a
echo ""

echo "=== CLAUDE CODE ==="
echo "Verificando instalación de Claude Code..."
which claude
echo ""

echo "=== FIN DE CONFIGURACIÓN ==="
