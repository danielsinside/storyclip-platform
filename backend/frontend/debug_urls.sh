#!/bin/bash

# 🔍 Script para encontrar construcciones de URL problemáticas
# Busca patrones que pueden causar SyntaxError

echo "🔍 Buscando construcciones de URL problemáticas..."
echo ""

echo "1️⃣ Buscando 'new URL(' (puede causar SyntaxError):"
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "new URL(" || echo "✅ No se encontraron 'new URL('"
echo ""

echo "2️⃣ Buscando 'VITE_API_BASE_URL' (URLs hardcodeadas):"
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "VITE_API_BASE_URL" || echo "✅ No se encontraron 'VITE_API_BASE_URL'"
echo ""

echo "3️⃣ Buscando 'fetch(' que no usan apiUrl:"
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "fetch(" | grep -v "apiUrl(" || echo "✅ Todos los fetch usan apiUrl"
echo ""

echo "4️⃣ Buscando concatenaciones de URL manuales:"
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "\${.*}/" | grep -v "apiUrl" || echo "✅ No se encontraron concatenaciones manuales"
echo ""

echo "5️⃣ Buscando 'import.*supabase' (para verificar singleton):"
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "import.*supabase" || echo "✅ No se encontraron imports directos de supabase"
echo ""

echo "🎯 Verificación completada!"
echo "Si encuentras algún patrón problemático, reemplázalo con apiUrl(engine, path)"
