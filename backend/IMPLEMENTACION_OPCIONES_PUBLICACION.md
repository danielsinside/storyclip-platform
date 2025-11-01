# 🎯 Implementación de Opciones de Publicación - Especificaciones

## Resumen de Requisitos

### 1. 📤 Publicar Ahora
- ✅ Publicación secuencial (uno después del otro)
- ✅ Mantiene el orden de la historia
- ✅ **Procesamiento en segundo plano** (sigue aunque se cierre la página)
- ✅ Orden: Clip 1 → espera confirmación → Clip 2 → etc.

### 2. 📅 Programar Fecha
- ✅ Configuración correcta de fecha y hora
- ✅ Validación de formato
- ✅ Zona horaria correcta
- ✅ Envío correcto a Metricool

### 3. 📈 Mejor Momento
- ✅ Usar **Best Times API de Metricool**
- ✅ Obtener horarios óptimos automáticamente
- ✅ Distribuir clips en esos momentos

---

## 📤 1. Publicar Ahora - Procesamiento en Background

### Requisitos Críticos:

1. **Orden secuencial estricto**
   ```
   Clip 1 → ⏳ Confirmación FB → ✅
              ↓
   Clip 2 → ⏳ Confirmación FB → ✅
              ↓
   Clip 3 → ⏳ Confirmación FB → ✅
   ```

2. **Procesamiento en segundo plano**
   - El proceso NO debe detenerse si el usuario:
     - Cierra la pestaña
     - Actualiza la página
     - Navega a otra sección
   - Debe completarse en el servidor

3. **Recuperación de estado**
   - Usuario puede cerrar y volver
   - Debe poder ver el progreso actual
   - SSE para actualización en tiempo real

### Implementación Necesaria:

#### Backend (Ya Implementado ✅):
- `/routes/metricool.js` - POST `/api/metricool/publish/stories`
- Crea batch en `activeBatches` Map
- Ejecuta `publishBatch()` en background
- SSE stream en `/api/metricool/stream?batchId=X`

#### Lo que falta implementar:

**Base de datos para persistencia**:
```javascript
// En database/db.js - Agregar tabla de batches
CREATE TABLE publish_batches (
  batch_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  user_id TEXT,
  account_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'processing', 'completed', 'failed'
  total_clips INTEGER NOT NULL,
  published_clips INTEGER DEFAULT 0,
  failed_clips INTEGER DEFAULT 0,
  current_clip INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  error TEXT
);

CREATE TABLE publish_batch_clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  clip_index INTEGER NOT NULL,
  clip_url TEXT NOT NULL,
  post_id TEXT,
  status TEXT NOT NULL, -- 'pending', 'uploading', 'published', 'failed'
  error TEXT,
  published_at DATETIME,
  FOREIGN KEY (batch_id) REFERENCES publish_batches(batch_id)
);
```

**Actualizar metricool.js para usar DB**:
```javascript
// Al recibir POST /publish/stories
1. Crear registro en publish_batches
2. Crear registros en publish_batch_clips para cada clip
3. Iniciar proceso en background
4. Actualizar DB conforme avanza
5. Usuario puede desconectar - el proceso continúa
```

**Endpoint para recuperar estado**:
```javascript
GET /api/metricool/batch/:batchId/status
// Retorna estado actual desde DB
```

---

## 📅 2. Programar Fecha - Validación Correcta

### Validaciones Necesarias:

#### Frontend:
```typescript
// PublishOptions.tsx
const handleDateSelect = (date: Date | undefined) => {
  if (!date) return;

  // Validar que no sea fecha pasada
  const now = new Date();
  if (date < now) {
    toast.error('No puedes programar en el pasado');
    return;
  }

  // Validar horario (debe tener hora configurada)
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (!hasTime && mode === 'scheduled') {
    toast.warning('Selecciona una hora específica');
    return;
  }

  setScheduledDate(date);
  onModeChange('scheduled', date);
};
```

#### Backend:
```javascript
// routes/metricool.js - POST /publish/stories
if (schedule?.mode === 'scheduled') {
  const scheduledDate = new Date(schedule.scheduledAt);

  // Validar formato
  if (isNaN(scheduledDate.getTime())) {
    return res.status(400).json({
      error: 'Fecha inválida',
      code: 'INVALID_DATE'
    });
  }

  // Validar que sea futura
  if (scheduledDate <= new Date()) {
    return res.status(400).json({
      error: 'La fecha debe ser futura',
      code: 'PAST_DATE'
    });
  }

  // Convertir a zona horaria de Metricool
  // (Metricool usa la zona del usuario configurada)
}
```

#### Payload a Metricool:
```javascript
// Para CADA clip:
{
  accountId: accountId,
  mediaId: mediaId,
  type: 'story',
  scheduledAt: '2025-01-15T18:00:00Z' // ISO 8601 UTC
}
```

---

## 📈 3. Mejor Momento - Best Times de Metricool

### Endpoint Necesario:

Según la documentación de Metricool, los "Best Times" están disponibles en la interfaz. Necesitamos encontrar el endpoint API.

**Posibles endpoints a probar**:
```javascript
GET /api/analytics/best-times?accountId={accountId}&userId={userId}&blogId={blogId}
GET /api/planner/best-times?accountId={accountId}
GET /api/insights/optimal-times?accountId={accountId}
```

### Implementación con Metricool Service:

```javascript
// services/metricool.service.js

/**
 * Get best times to post for an account
 * @param {string} accountId - Metricool account ID
 * @returns {Promise<Array>} Best times
 */
async getBestTimes(accountId) {
  try {
    const params = this._addCredentials({ accountId });
    const response = await this.client.get('/analytics/best-times', { params });

    // Formato esperado:
    // [
    //   { day: 'monday', hour: 18, score: 95 },
    //   { day: 'tuesday', hour: 12, score: 88 },
    //   ...
    // ]
    return response.data;
  } catch (error) {
    console.error('Error fetching best times:', error);
    throw new Error(`Failed to fetch best times: ${error.message}`);
  }
}

/**
 * Distribute stories across best times
 * @param {Array} stories - Array of stories
 * @param {Array} bestTimes - Best times from Metricool
 * @returns {Array} Stories with assigned schedule times
 */
distributStoriesAcrossBestTimes(stories, bestTimes) {
  // Ordenar best times por score (mayor a menor)
  const sortedTimes = bestTimes.sort((a, b) => b.score - a.score);

  const scheduledStories = [];
  let timeIndex = 0;

  for (let i = 0; i < stories.length; i++) {
    const bestTime = sortedTimes[timeIndex % sortedTimes.length];

    // Calcular próxima fecha para ese día/hora
    const scheduledDate = getNextDateForDayAndHour(bestTime.day, bestTime.hour);

    scheduledStories.push({
      ...stories[i],
      scheduledAt: scheduledDate
    });

    timeIndex++;
  }

  return scheduledStories;
}
```

### Helper para calcular fechas:
```javascript
function getNextDateForDayAndHour(dayName, hour) {
  const days = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const targetDay = days[dayName.toLowerCase()];
  const now = new Date();
  const currentDay = now.getDay();

  // Calcular días hasta el próximo targetDay
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);
  nextDate.setHours(hour, 0, 0, 0);

  return nextDate;
}
```

---

## 🔄 Flujo Completo por Opción

### Opción 1: Publicar Ahora

```
Frontend:
1. Usuario selecciona clips + creator
2. Click "Iniciar Publicación"
3. POST /api/metricool/publish/stories { mode: 'now' }
   ↓
Backend:
4. Crear batch en DB (status: 'processing')
5. Crear clips en DB (status: 'pending')
6. Responder con batchId
7. Iniciar publishBatch() en background
8. Para cada clip:
   - Actualizar DB: status='uploading'
   - Subir a Metricool
   - Esperar confirmación
   - Actualizar DB: status='published'
   - Proceder con siguiente
   ↓
Frontend (SSE):
9. Conectar a /api/metricool/stream?batchId=X
10. Recibir actualizaciones en tiempo real
11. Mostrar progreso
12. Usuario puede cerrar - proceso continúa
```

### Opción 2: Programar Fecha

```
Frontend:
1. Usuario selecciona fecha + hora
2. Validar fecha futura
3. POST /api/metricool/publish/stories {
     mode: 'scheduled',
     scheduledAt: '2025-01-15T18:00:00Z'
   }
   ↓
Backend:
4. Validar fecha
5. Para CADA clip:
   - Subir a Metricool
   - Configurar scheduledAt
6. Metricool programa publicación
7. Responder confirmación
```

### Opción 3: Mejor Momento

```
Frontend:
1. Usuario selecciona "Mejor Momento"
2. POST /api/metricool/publish/stories { mode: 'bestTime' }
   ↓
Backend:
3. GET /analytics/best-times?accountId=X
4. Recibir mejores horarios
5. Distribuir clips en esos horarios
6. Para CADA clip:
   - Asignar scheduledAt según best time
   - Subir a Metricool con programación
7. Responder confirmación
```

---

## 🛠️ Archivos a Modificar

### 1. Base de Datos
- [ ] `database/db.js` - Agregar tablas de batches

### 2. Backend
- [ ] `services/metricool.service.js` - Agregar getBestTimes()
- [ ] `routes/metricool.js` - Persistencia en DB
- [ ] `routes/metricool.js` - Endpoint GET /batch/:id/status

### 3. Frontend
- [ ] `src/components/PublishOptions.tsx` - Validaciones
- [ ] `src/pages/Publish.tsx` - Manejo de estados persistentes
- [ ] `src/components/AgentPublishModal.tsx` - Reconexión a batches

---

**Siguiente paso**: ¿Quieres que implemente primero el procesamiento en background con DB?
