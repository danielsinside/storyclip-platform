#!/bin/bash

echo "=== PASO 1: VERIFICANDO NODE.JS Y NPM ==="
echo "Directorio actual: $(pwd)"
echo ""

echo "1.1 Verificando versiones:"
echo "Node.js version:"
node -v 2>/dev/null || echo "Node.js no encontrado"
echo ""

echo "npm version:"
npm -v 2>/dev/null || echo "npm no encontrado"
echo ""

echo "1.2 Verificando ubicaciones:"
echo "Node.js path:"
which node 2>/dev/null || echo "Node.js no está en PATH"
echo ""

echo "npm path:"
which npm 2>/dev/null || echo "npm no está en PATH"
echo ""

echo "1.3 Verificando si necesitamos instalar Node.js 20.x:"
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ]; then
    echo "❌ Node.js no está instalado - NECESITAMOS INSTALAR"
elif [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versión $NODE_VERSION es menor que 18 - NECESITAMOS ACTUALIZAR"
else
    echo "✅ Node.js versión $NODE_VERSION es >= 18 - OK"
fi
