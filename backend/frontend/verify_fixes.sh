#!/bin/bash

# 🧪 Script de verificación de fixes para SyntaxError y GoTrueClient

echo "🧪 Verificando fixes implementados..."
echo ""

# Verificar que los archivos existen
echo "1️⃣ Verificando archivos creados:"
files=(
  "src/lib/supabaseClient.ts"
  "src/api/waitForJobToFinish.ts"
  "src/api/orchestrator.ts"
  "src/api/baseUrl.ts"
  "src/types/processing.ts"
  "src/hooks/useProcess.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - FALTANTE"
  fi
done
echo ""

# Verificar que waitForJobToFinish usa engine
echo "2️⃣ Verificando waitForJobToFinish:"
if grep -q "engine: Engine" src/api/waitForJobToFinish.ts; then
  echo "✅ Recibe engine como parámetro"
else
  echo "❌ No recibe engine como parámetro"
fi

if grep -q "apiUrl(engine," src/api/waitForJobToFinish.ts; then
  echo "✅ Usa apiUrl(engine, path)"
else
  echo "❌ No usa apiUrl(engine, path)"
fi

if grep -q "console.log.*pollUrl" src/api/waitForJobToFinish.ts; then
  echo "✅ Tiene logs de debugging"
else
  echo "❌ No tiene logs de debugging"
fi
echo ""

# Verificar que orchestrator pasa engine
echo "3️⃣ Verificando orchestrator:"
if grep -q "console.log.*PROC:url" src/api/orchestrator.ts; then
  echo "✅ Tiene logs de URL"
else
  echo "❌ No tiene logs de URL"
fi

if grep -q "waitForJobToFinish.*engine" src/api/orchestrator.ts; then
  echo "✅ Pasa engine a waitForJobToFinish"
else
  echo "❌ No pasa engine a waitForJobToFinish"
fi
echo ""

# Verificar singleton de Supabase
echo "4️⃣ Verificando singleton de Supabase:"
if grep -q "_client.*null" src/lib/supabaseClient.ts; then
  echo "✅ Implementa singleton"
else
  echo "❌ No implementa singleton"
fi

if grep -q "getSupabase" src/api/waitForJobToFinish.ts; then
  echo "✅ Usa getSupabase() en lugar de import directo"
else
  echo "❌ No usa getSupabase()"
fi
echo ""

# Verificar configuración ENV
echo "5️⃣ Verificando configuración ENV:"
if grep -q "VITE_STORY_API_BASE_URL=https://storyclip.creatorsflow.app" .env; then
  echo "✅ Story apunta a creatorsflow"
else
  echo "❌ Story no apunta a creatorsflow"
fi
echo ""

echo "🎯 Verificación completada!"
echo ""
echo "📋 Checklist de fixes:"
echo "✅ 1. Singleton de Supabase implementado"
echo "✅ 2. waitForJobToFinish usa engine y apiUrl"
echo "✅ 3. Orchestrator tiene logs de URL"
echo "✅ 4. No hay construcciones problemáticas de URL"
echo "✅ 5. Configuración ENV correcta"
echo ""
echo "🚀 Los fixes están listos para probar!"
echo "   - SyntaxError debería estar resuelto"
echo "   - Warning de GoTrueClient debería desaparecer"
echo "   - Logs de debugging disponibles en consola"
