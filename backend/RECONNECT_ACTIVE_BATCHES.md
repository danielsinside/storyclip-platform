# ✅ Reconexión a Batches Activos - Implementación Completada

## Resumen

Se implementó la funcionalidad completa para detectar y reconectar automáticamente a batches de publicación activos cuando el usuario vuelve a la aplicación.

---

## 🎯 Características Implementadas

### 1. **Backend - Endpoints de Consulta**

Se agregaron nuevos endpoints en `/srv/storyclip/routes/metricool.js`:

#### GET `/api/metricool/batches/active?userId={userId}`
Obtiene todos los batches activos (status='processing') para un usuario específico.

**Respuesta**:
```json
{
  "success": true,
  "batches": [
    {
      "batchId": "batch_1761725644409_abc123",
      "jobId": "job_123",
      "status": "processing",
      "publishMode": "now",
      "total": 20,
      "published": 5,
      "failed": 1,
      "currentIndex": 6,
      "progress": 30,
      "createdAt": "2025-10-29T08:14:04Z",
      "clips": [...]
    }
  ],
  "count": 1
}
```

#### GET `/api/metricool/batch/:batchId`
Obtiene el resumen completo de un batch específico por su ID.

**Respuesta**:
```json
{
  "success": true,
  "batch": {
    "batchId": "batch_...",
    "status": "processing",
    "clips": [...],
    ...
  }
}
```

### 2. **Frontend - API Client**

Se actualizó `/tmp/visual-story-pulse/src/lib/api.ts` con nuevos métodos:

```typescript
// Get active publish batches for user
getActiveBatches: (userId: string) =>
  safeFetch(`${LEGACY_API_BASE}/api/metricool/batches/active?userId=${userId}`, {
    headers: { 'X-Api-Key': API_KEY }
  }).then(handleResponse),

// Get batch summary by ID
getBatchSummary: (batchId: string) =>
  safeFetch(`${LEGACY_API_BASE}/api/metricool/batch/${batchId}`, {
    headers: { 'X-Api-Key': API_KEY }
  }).then(handleResponse),

// Get batch status
getBatchStatus: (batchId: string) =>
  safeFetch(`${LEGACY_API_BASE}/api/metricool/status?batchId=${batchId}`, {
    headers: { 'X-Api-Key': API_KEY }
  }).then(handleResponse),
```

### 3. **Custom Hook: useActiveBatches**

Creado en `/tmp/visual-story-pulse/src/hooks/useActiveBatches.ts`

**Funcionalidad**:
- Detecta batches activos al montar el componente
- Reconecta automáticamente SSE para cada batch activo
- Actualiza estado en tiempo real
- Muestra notificaciones (toast) de progreso
- Cierra conexiones cuando un batch se completa
- Maneja errores y reconexión

**API**:
```typescript
const {
  activeBatches,        // Lista de batches activos
  isLoading,            // Estado de carga
  error,                // Error si lo hay
  fetchActiveBatches,   // Refrescar lista de batches
  connectToSSE,         // Conectar a SSE de un batch
  disconnectSSE,        // Desconectar SSE
  reconnectAll,         // Reconectar todos
  refreshBatch,         // Refrescar estado de un batch
  hasActiveBatches,     // Boolean si hay batches activos
} = useActiveBatches(userId);
```

**Eventos SSE manejados**:
```typescript
interface SSEEvent {
  type: 'progress' | 'completed' | 'error' | 'connected';
  batchId: string;
  current?: number;
  total?: number;
  published?: number;
  errors?: number;
  currentStory?: string;
  status?: string;
  error?: string;
  timestamp: string;
}
```

### 4. **Componente Modal: ActiveBatchesModal**

Creado en `/tmp/visual-story-pulse/src/components/ActiveBatchesModal.tsx`

**Características**:
- Muestra lista de batches activos
- Barra de progreso visual por batch
- Estadísticas: publicados, fallidos, pendientes
- Lista detallada de clips con su estado
- Timestamps de inicio y completado
- Botón de refresh manual
- Scroll para múltiples batches

**Estados de clips mostrados**:
- ✅ `published`: Verde (publicado exitosamente)
- ❌ `failed`: Rojo (error al publicar)
- 📤 `uploading`: Azul (subiendo)
- ⏳ `waiting_confirmation`: Amarillo (esperando confirmación)
- ⏸️ `pending`: Gris (en cola)

### 5. **Monitor Global: ActiveBatchesMonitor**

Creado en `/tmp/visual-story-pulse/src/components/ActiveBatchesMonitor.tsx`

**Funcionalidad**:
- Obtiene el usuario actual de Supabase
- Consulta batches activos al montar
- Abre modal automáticamente si hay batches
- Escucha cambios de autenticación
- Se limpia automáticamente al desmontar

### 6. **Integración en App.tsx**

El monitor se agregó al nivel raíz de la aplicación:

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ActiveBatchesMonitor />  {/* ← Monitor global */}
        <Routes>
          ...
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

---

## 🔄 Flujo Completo

### Escenario 1: Usuario Inicia Publicación y Cierra

```
1. Usuario selecciona clips y hace click en "Publicar Ahora"
   ↓
2. Backend crea batch en DB y responde con batchId
   ↓
3. Proceso de publicación inicia en segundo plano
   ↓
4. Usuario CIERRA la página/pestaña
   ↓
5. Servidor CONTINÚA publicando clips
   ↓
6. Cada clip se actualiza en la base de datos
```

### Escenario 2: Usuario Vuelve a la Aplicación

```
1. Usuario abre la aplicación nuevamente
   ↓
2. ActiveBatchesMonitor se monta
   ↓
3. Obtiene userId de Supabase
   ↓
4. Consulta: GET /api/metricool/batches/active?userId=X
   ↓
5. Backend consulta DB y retorna batches activos
   ↓
6. useActiveBatches recibe la lista
   ↓
7. Hook conecta SSE para cada batch activo
   ↓
8. Modal se abre automáticamente mostrando progreso
   ↓
9. Usuario ve progreso en tiempo real
   ↓
10. Cuando un batch completa:
    - SSE envía evento 'completed'
    - Toast notification aparece
    - Batch se elimina de la lista
    - Conexión SSE se cierra
    - Modal se actualiza
```

---

## 🎨 UI/UX

### Notificaciones Toast

**Al detectar batches activos**:
```
ℹ️ Publicación en progreso
Tienes 2 publicación(es) en proceso. Reconectando...
```

**Al completar un batch**:
```
✅ Publicación completada
Se publicaron 18 de 20 clips exitosamente.
```

**En caso de error**:
```
❌ Error en publicación
[Mensaje de error específico]
```

### Modal de Progreso

```
╔══════════════════════════════════════════╗
║     Publicaciones en Progreso            ║
║     Tienes 2 publicación(es) activa(s)   ║
╠══════════════════════════════════════════╣
║                                          ║
║  Batch ...abc123    [processing]         ║
║  ━━━━━━━━━━━━━━━━━━━━ 60%              ║
║  12 / 20 clips                           ║
║                                          ║
║  ┌─────────────────────────────────┐    ║
║  │ ✅ 10  Publicados               │    ║
║  │ ❌ 2   Fallidos                 │    ║
║  │ ⏸️  8   Pendientes               │    ║
║  └─────────────────────────────────┘    ║
║                                          ║
║  Clips:                                  ║
║  #1  Test Clip 1        [published]      ║
║  #2  Test Clip 2        [published]      ║
║  #3  Test Clip 3        [uploading]      ║
║  ...                                     ║
║                                          ║
║  Iniciado: 29/10/2025 08:14:04          ║
║                                          ║
╠══════════════════════════════════════════╣
║              [Cerrar]                    ║
╚══════════════════════════════════════════╝
```

---

## 📊 Estados del Sistema

### Estados del Batch

| Estado | Descripción | Color |
|--------|-------------|-------|
| `processing` | Publicación en progreso | Azul |
| `completed` | Todos los clips procesados | Verde |
| `failed` | Error crítico | Rojo |
| `paused` | Pausado manualmente | Gris |

### Estados del Clip

| Estado | Descripción | Icono | Color |
|--------|-------------|-------|-------|
| `pending` | En cola | ⏸️ | Gris |
| `uploading` | Subiendo a Metricool | 📤 | Azul |
| `waiting_confirmation` | Esperando Facebook | ⏳ | Amarillo |
| `published` | Publicado exitosamente | ✅ | Verde |
| `failed` | Error al publicar | ❌ | Rojo |

---

## 🛡️ Manejo de Errores

### Conexión SSE Perdida

Si la conexión SSE se pierde:
1. El evento `onerror` se dispara
2. Conexión se cierra automáticamente
3. Usuario puede hacer click en "Actualizar" para consultar estado manualmente
4. Estado persiste en DB, no se pierde

### Backend Reiniciado

Si el backend se reinicia mientras hay batches activos:
1. Batches permanecen en DB
2. Proceso NO continúa (se pierde el estado en memoria)
3. Al volver, usuario ve el último estado guardado en DB
4. **Mejora futura**: Recuperar procesos pendientes al iniciar backend

### Usuario Sin Internet

1. fetch() fallará con error de red
2. Toast muestra: "No se pudo conectar al servidor"
3. Modal muestra último estado conocido
4. Usuario puede reintentar cuando vuelva la conexión

---

## 🧪 Testing

### Test Manual

1. **Iniciar publicación**:
   ```bash
   # En la UI:
   - Seleccionar varios clips
   - Click en "Publicar Ahora"
   - Esperar que inicie
   ```

2. **Cerrar y volver**:
   ```bash
   # Cerrar pestaña completamente
   # Esperar 30 segundos
   # Volver a abrir: https://stories.creatorsflow.app
   ```

3. **Verificar**:
   - ✅ Modal aparece automáticamente
   - ✅ Progreso se muestra correctamente
   - ✅ Clips se actualizan en tiempo real
   - ✅ Toast de "Reconectando..." aparece

### Verificar en Base de Datos

```bash
# Ver batches activos
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT batch_id, status, published_clips, failed_clips, total_clips
   FROM publish_batches
   WHERE status = 'processing';"

# Ver clips de un batch
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT clip_index, status, metricool_post_id
   FROM publish_batch_clips
   WHERE batch_id = 'BATCH_ID_AQUI'
   ORDER BY clip_index;"
```

---

## 📝 Archivos Creados/Modificados

### Backend
1. ✅ `/srv/storyclip/routes/metricool.js:184-242` - Nuevos endpoints

### Frontend
1. ✅ `/tmp/visual-story-pulse/src/lib/api.ts:486-508` - API client
2. ✅ `/tmp/visual-story-pulse/src/hooks/useActiveBatches.ts` - Hook custom (NEW)
3. ✅ `/tmp/visual-story-pulse/src/components/ActiveBatchesModal.tsx` - Modal (NEW)
4. ✅ `/tmp/visual-story-pulse/src/components/ActiveBatchesMonitor.tsx` - Monitor (NEW)
5. ✅ `/tmp/visual-story-pulse/src/App.tsx:18,28` - Integración

### Documentación
1. ✅ `/srv/storyclip/RECONNECT_ACTIVE_BATCHES.md` - Esta documentación (NEW)

---

## 🚀 Estado Actual

- ✅ Backend endpoints implementados y probados
- ✅ Frontend API client actualizado
- ✅ Custom hook `useActiveBatches` completo
- ✅ Modal de progreso visual implementado
- ✅ Monitor global integrado en App
- ✅ Build y deploy exitosos
- ✅ SSE reconexión automática funcionando

---

## 🎯 Próximos Pasos

### Mejoras Futuras

1. **Recuperación de Batches al Reiniciar Backend**
   - Al iniciar, consultar DB por batches con status='processing'
   - Reiniciar publicación desde el último clip guardado
   - Actualizar `published_clips` para indicar punto de recuperación

2. **Pausar/Reanudar Batches**
   - Botón "Pausar" en el modal
   - Endpoint `POST /api/metricool/batch/:id/pause`
   - Estado `paused` en DB

3. **Reintentar Clips Fallidos**
   - Botón "Reintentar" para clips con error
   - Endpoint `POST /api/metricool/batch/:id/retry-failed`
   - Solo reintentar clips específicos

4. **Cancelar Batch**
   - Botón "Cancelar" en el modal
   - Endpoint `POST /api/metricool/batch/:id/cancel`
   - Marcar batch como `cancelled`

5. **Notificaciones Push**
   - Integrar con Web Push API
   - Notificar cuando un batch complete (incluso con app cerrada)

6. **Historial de Batches**
   - Página `/publish/history`
   - Mostrar batches completados y fallidos
   - Estadísticas de publicación

---

**Implementado**: 2025-10-29
**Estado**: ✅ Completado y desplegado
**Próximo paso**: Validación de "Programar Fecha" o "Mejor Momento"
