# Migration Information

## Nuevo Repositorio Monorepo Limpio

Este repositorio fue creado el **1 de Noviembre de 2025** como una consolidación limpia de:
- Frontend (anteriormente en `/srv/story-creatorsflow-app/frontend-lovable`)
- Backend (anteriormente en `/srv/storyclip`)

## ✅ Estado Actual

**Ubicación**: `/srv/storyclip-monorepo`

**Estructura**:
```
storyclip-monorepo/
├── frontend/          # React + Vite + TypeScript
├── backend/           # Node.js + Express
├── .git/             # Git repository (clean state)
├── .gitignore        # Comprehensive ignore rules
├── README.md         # Platform documentation
└── verify-setup.sh   # Verification script
```

## 📊 Estadísticas

- **473 archivos** rastreados en git
- **109,895 líneas** de código
- **Commit inicial**: `805abd5`
- **Tamaño Frontend**: 2.0M (sin node_modules)
- **Tamaño Backend**: 13M (sin node_modules)

## 🔄 Repositorios Anteriores

Los repositorios anteriores aún existen pero **NO deben usarse más**:
- ❌ `/srv/story-creatorsflow-app/` - Frontend viejo (divergido, múltiples carpetas confusas)
- ❌ `/srv/storyclip/` - Backend viejo (git separado)

## ✨ Ventajas del Monorepo

1. **Única fuente de verdad**: Todo el código en un solo lugar
2. **Commits atómicos**: Cambios al frontend y backend en el mismo commit
3. **Sin divergencias**: Estado limpio sin conflictos
4. **Mejor organización**: Estructura clara y documentada
5. **Fácil de clonar**: `git clone` obtiene todo lo necesario

## 🚀 Cómo Usar

### Primera vez:
```bash
cd /srv/storyclip-monorepo

# Verificar estructura
./verify-setup.sh

# Instalar dependencias
cd frontend && npm install
cd ../backend && npm install

# Configurar variables de entorno
cp frontend/.env.example frontend/.env
cp backend/.env.backup backend/.env
# Editar los .env con tus credenciales
```

### Desarrollo:
```bash
# Terminal 1 - Frontend
cd /srv/storyclip-monorepo/frontend
npm run dev

# Terminal 2 - Backend
cd /srv/storyclip-monorepo/backend
pm2 start ecosystem.config.js
```

## 🔐 Conectar a GitHub/GitLab

Si quieres subir esto a un repositorio remoto:

```bash
cd /srv/storyclip-monorepo

# Agregar remote
git remote add origin https://github.com/tu-usuario/storyclip-monorepo.git

# Push inicial
git push -u origin master
```

## 📝 Notas Importantes

- Los **node_modules** NO están incluidos (están en .gitignore)
- Los archivos **.env** NO están incluidos (están en .gitignore)
- Los **uploads/outputs** NO están incluidos (están en .gitignore)
- La **database** NO está incluida (está en .gitignore)

Debes reinstalar dependencias y configurar variables de entorno después de clonar.

## 🎯 Próximos Pasos Recomendados

1. ✅ Verificar que todo funcione
2. Probar frontend y backend localmente
3. Decidir si conectar a GitHub/GitLab
4. Considerar deprecar los repositorios antiguos
5. Actualizar documentación de deploy con nueva ubicación

---

**Creado con**: Claude Code
**Fecha**: Noviembre 1, 2025
**Commit inicial**: 805abd5
