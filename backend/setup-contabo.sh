#!/bin/bash

echo "=== BLOQUE A: NODE.JS / NPM ==="
echo "Ejecutando node -v:"
node -v
echo ""

echo "Ejecutando npm -v:"
npm -v
echo ""

echo "=== BLOQUE B: CLAUDE CODE ==="
echo "Instalando Claude Code globalmente..."
npm install -g @anthropic-ai/claude-code
echo ""

echo "Verificando instalación con which claude:"
which claude
echo ""

echo "=== BLOQUE C: GIT EN BACKEND ==="
echo "Navegando a /var/www/storyclip-backend..."
cd /var/www/storyclip-backend
echo "Directorio actual: $(pwd)"
echo ""

echo "Ejecutando ls -la:"
ls -la
echo ""

echo "Inicializando git..."
git init
echo ""

echo "Configurando identidad..."
git config user.name "Daniel"
git config user.email "daniel@example.com"
echo ""

echo "Agregando archivos..."
git add .
echo ""

echo "Ejecutando git status:"
git status
echo ""

echo "Creando commit inicial..."
git commit -m "chore: initial snapshot of storyclip-backend on Contabo"
echo ""

echo "Ejecutando git log --oneline | head:"
git log --oneline | head
echo ""

echo "=== BLOQUE D: LLAVE SSH ==="
echo "Verificando directorio .ssh..."
ls -la ~/.ssh
echo ""

echo "Verificando llaves existentes..."
ls -la ~/.ssh/id_ed25519 ~/.ssh/id_ed25519.pub 2>/dev/null || echo "No existen llaves ED25519"
echo ""

echo "Generando nueva llave SSH..."
ssh-keygen -t ed25519 -C "contabo-storyclip" -f ~/.ssh/id_ed25519 -N ""
echo ""

echo "Mostrando clave pública (SOLO LA PÚBLICA):"
cat ~/.ssh/id_ed25519.pub
echo ""

echo "=== FIN DE BLOQUES A-D ==="
