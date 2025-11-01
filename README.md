# StoryClip Platform - Monorepo

Plataforma completa para generar, publicar y distribuir Stories optimizados para redes sociales.

## 📁 Estructura del Proyecto

```
storyclip-monorepo/
├── frontend/          # Frontend React (Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
│
├── backend/           # Backend Node.js (Express)
│   ├── routes/
│   ├── services/
│   ├── handlers/
│   ├── middleware/
│   ├── utils/
│   └── package.json
│
└── README.md
```

## 🚀 Características Principales

### Frontend
- ✅ **Upload de Videos**: Subida y procesamiento de videos
- ✅ **Generación de Stories**: Creación automática de clips cortos
- ✅ **Descarga Móvil**: QR code → Descarga ZIP a iPhone
- ✅ **Publicación a Metricool**: Integración con Facebook/Instagram Stories
- ✅ **Monitoreo en Tiempo Real**: Estado de publicación en vivo

### Backend
- ✅ **Processing Pipeline**: FFmpeg + efectos + filtros
- ✅ **API RESTful**: Endpoints documentados
- ✅ **Metricool Integration**: Publicación automática a redes sociales
- ✅ **Real-time Status**: Polling cada 2s para confirmación "published"
- ✅ **Background Jobs**: Publicación persiste en DB aunque cierres frontend
- ✅ **Database Persistence**: SQLite para batches y clips

## 🛠️ Instalación

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales
npm start
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edita .env con las URLs de la API
npm run dev
```

## 📡 APIs y Endpoints

### Backend API
- **Base URL**: `https://story.creatorsflow.app/api`
- **Authentication**: X-API-Key header

### Principales Endpoints
- `POST /api/upload` - Subir video
- `POST /api/process` - Procesar video a stories
- `GET /api/jobs/:jobId/status` - Estado del procesamiento
- `GET /api/metricool/brands` - Obtener páginas de Metricool
- `POST /api/metricool/publish/stories` - Publicar stories a redes

## 🔑 Variables de Entorno

### Backend (.env)
```
PORT=3000
API_KEY=sk_xxxxx
METRICOOL_USER_TOKEN=xxxxx
DATABASE_PATH=./database/database.db
```

### Frontend (.env)
```
VITE_API_URL=https://story.creatorsflow.app
VITE_API_KEY=sk_xxxxx
```

## 📦 Tecnologías

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- React Router
- JSZip (para descargas móviles)
- QRCode

### Backend
- Node.js 18+
- Express
- FFmpeg
- SQLite
- PM2
- Metricool API

## 🎯 Flujo de Trabajo

1. **Upload**: Usuario sube video largo
2. **Processing**: Backend genera múltiples clips cortos con efectos
3. **Preview**: Usuario revisa clips generados
4. **Publish**: Usuario publica a Metricool (Facebook/Instagram Stories)
5. **Monitor**: Sistema monitorea estado en tiempo real (pending → published)
6. **Download**: Descarga ZIP de clips via QR code en móvil

## 🔒 Seguridad

- API Key authentication
- CORS configurado
- Rate limiting
- Input validation
- Secure file uploads

## 📝 Notas Importantes

### Publicación a Metricool
- **NO usa delays artificiales** - confía en el throttling nativo de Metricool
- **Publicación secuencial** - espera confirmación "published" antes de siguiente historia
- **Polling cada 2 segundos** - verifica estado real del post
- **Background processing** - continúa aunque cierres el frontend
- **Orden perfecto garantizado** - nunca avanza si la anterior no fue publicada

### Descarga Móvil
- iOS Safari requiere formato ZIP (no puede descargar carpetas)
- QR code genera URL única por job
- Archivos se empaquetan en el navegador con JSZip
- Compatible con galería de iPhone

## 🐛 Debugging

Ver logs en tiempo real:
```bash
# Backend
cd backend
pm2 logs storyclip

# Frontend dev
cd frontend
npm run dev
```

## 📄 Licencia

Propietario - Todos los derechos reservados

---

**Última actualización**: Noviembre 2025
**Versión**: 2.0.0 (Monorepo unificado)
