# ✅ Procesamiento en Background - "Publicar Ahora"

## Implementación Completada

Se implementó el procesamiento en segundo plano para la opción "Publicar Ahora", permitiendo que la publicación de Stories continúe **aunque el usuario cierre o actualice la página**.

---

## 🎯 Características Implementadas

### 1. **Persistencia en Base de Datos**

Se crearon tablas SQLite para almacenar el estado de los batches de publicación:

#### Tabla: `publish_batches`
Almacena información del batch completo:
- `batch_id`: ID único del batch
- `job_id`: ID del job original (opcional)
- `user_id`: ID del usuario
- `account_id`: ID de cuenta de Metricool
- `publish_mode`: 'now', 'scheduled', 'bestTime'
- `status`: 'processing', 'completed', 'failed', 'paused'
- `total_clips`: Total de clips a publicar
- `published_clips`: Clips publicados exitosamente
- `failed_clips`: Clips que fallaron
- `current_clip_index`: Índice del clip actual
- `scheduled_for`: Fecha programada (si aplica)
- `error_msg`: Mensaje de error general
- Timestamps: `created_at`, `started_at`, `completed_at`

#### Tabla: `publish_batch_clips`
Almacena el estado de cada clip individual:
- `batch_id`: ID del batch padre
- `clip_index`: Índice del clip (orden en la historia)
- `clip_url`: URL del clip
- `clip_title`: Título del clip
- `metricool_post_id`: ID del post en Metricool
- `facebook_post_id`: ID del post en Facebook/Instagram
- `status`: 'pending', 'uploading', 'waiting_confirmation', 'published', 'failed'
- `error_msg`: Mensaje de error si falló
- `attempts`: Número de intentos
- `scheduled_at`: Fecha programada para este clip
- Timestamps: `uploaded_at`, `published_at`

### 2. **Repositorio de Batches**

Se creó `PublishBatchesRepository` (`/srv/storyclip/services/publish-batches.repository.js`) con métodos para:

- `createBatch()`: Crear un nuevo batch
- `getBatch()`: Obtener batch por ID
- `updateBatchStatus()`: Actualizar estado del batch
- `updateBatchProgress()`: Actualizar progreso
- `addClip()`: Agregar clip al batch
- `updateClipStatus()`: Actualizar estado del clip
- `setClipUploaded()`: Marcar clip como subido a Metricool
- `setClipPublished()`: Marcar clip como publicado en Facebook
- `setClipFailed()`: Marcar clip como fallido
- `setBatchError()`: Registrar error del batch
- `getBatchSummary()`: Obtener resumen completo
- `getUserActiveBatches()`: Obtener batches activos del usuario
- `getAllBatches()`: Obtener todos los batches (admin)

### 3. **Actualización del Backend**

Se modificó `/srv/storyclip/routes/metricool.js`:

#### POST `/api/metricool/publish/stories`
Ahora:
1. Valida los datos de entrada
2. Crea el batch en la base de datos
3. Agrega todos los clips a la base de datos
4. Inicializa estado en memoria para SSE
5. Responde inmediatamente con el `batchId`
6. Inicia el procesamiento en background

#### Función `publishBatch()`
Actualizada para:
1. Publicar clips secuencialmente
2. Actualizar la base de datos conforme progresa cada clip:
   - `uploading`: Clip se está subiendo
   - `waiting_confirmation`: Esperando confirmación de Facebook
   - `published`: Confirmado en Facebook
   - `failed`: Falló con error
3. Notificar a clientes SSE en tiempo real
4. Completar el batch al finalizar

#### GET `/api/metricool/status?batchId=X`
Actualizado para:
1. Consultar primero la base de datos (estado persistente)
2. Si no está en DB, consultar memoria (fallback)
3. Retornar estado completo con clips incluidos

---

## 🔄 Flujo de Procesamiento

### Publicación "Ahora" (Background)

```
Usuario Frontend:
1. Selecciona clips + creator
2. Click "Iniciar Publicación"
3. POST /api/metricool/publish/stories { mode: 'now' }
   ↓
Backend:
4. Crear batch en DB (status: 'processing')
5. Crear clips en DB (status: 'pending')
6. Responder con batchId inmediatamente
7. Iniciar publishBatch() en background
   ↓
Para cada clip:
8. Actualizar DB: status='uploading'
9. Subir video a Metricool
10. Actualizar DB: status='waiting_confirmation', metricool_post_id
11. Esperar confirmación de Facebook (polling cada 2s)
12. Actualizar DB: status='published', facebook_post_id
13. Actualizar progreso del batch
14. Proceder con siguiente clip
   ↓
Frontend (SSE):
15. Conectar a /api/metricool/stream?batchId=X
16. Recibir actualizaciones en tiempo real
17. Mostrar progreso actual
18. Usuario puede cerrar - proceso continúa en servidor
   ↓
Recuperación:
19. Usuario vuelve después
20. GET /api/metricool/status?batchId=X
21. Obtener estado actual desde DB
22. Reconectar SSE si aún está en proceso
```

---

## 📊 Estados de los Clips

```
pending → uploading → waiting_confirmation → published
                                            ↘ failed
```

**Estados**:
- `pending`: Clip en cola, no iniciado
- `uploading`: Subiendo video a Metricool
- `waiting_confirmation`: Esperando confirmación de Facebook
- `published`: Publicado exitosamente en Facebook
- `failed`: Error al publicar

---

## 🔧 Archivos Modificados/Creados

### Creados:
1. `/srv/storyclip/services/publish-batches.repository.js` - Repositorio de batches
2. `/srv/storyclip/test-batch-persistence.js` - Script de prueba
3. `/srv/storyclip/PUBLICAR_AHORA_BACKGROUND_PROCESSING.md` - Esta documentación

### Modificados:
1. `/srv/storyclip/database/schema.sql` - Agregadas tablas de batches
2. `/srv/storyclip/routes/metricool.js` - Integración con repositorio
3. `/srv/storyclip/services/publish-batches.repository.js` - Corrección de métodos `db.query()`

---

## ✅ Testing

Se creó un script de prueba completo: `test-batch-persistence.js`

**Ejecutar test**:
```bash
node test-batch-persistence.js
```

**Resultado esperado**:
```
✅ All tests passed! Batch persistence is working correctly.
```

**El test verifica**:
1. Creación de batch
2. Adición de clips
3. Obtención de resumen
4. Actualización de estados
5. Publicación exitosa
6. Manejo de errores
7. Completado del batch

---

## 🗄️ Verificar Base de Datos

**Ver batches recientes**:
```bash
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT batch_id, status, publish_mode, total_clips, published_clips, failed_clips
   FROM publish_batches
   ORDER BY created_at DESC
   LIMIT 10;"
```

**Ver clips de un batch**:
```bash
sqlite3 /srv/storyclip/database/storyclip.db \
  "SELECT batch_id, clip_index, status, metricool_post_id, facebook_post_id
   FROM publish_batch_clips
   WHERE batch_id = 'BATCH_ID_AQUI';"
```

---

## 🚀 Estado Actual

- ✅ **Base de datos**: Tablas creadas y verificadas
- ✅ **Repositorio**: Implementado y probado
- ✅ **Backend**: Actualizado con persistencia
- ✅ **Testing**: Script de prueba pasando
- ✅ **Procesamiento en background**: Funcional
- ✅ **SSE**: Notificaciones en tiempo real
- ✅ **Recuperación de estado**: Consulta desde DB

---

## 🎯 Próximos Pasos

### 1. Frontend - Reconexión a Batches Activos

Cuando el usuario vuelve a cargar la página, debe:
1. Consultar si tiene batches activos: `GET /api/metricool/batch/user-active`
2. Si hay batches en proceso, mostrar modal con progreso
3. Reconectar SSE para seguir recibiendo actualizaciones

### 2. Validación de "Programar Fecha"

Implementar validaciones para:
- Fecha en el futuro
- Formato correcto (ISO 8601)
- Zona horaria correcta
- Envío correcto a Metricool

### 3. "Mejor Momento" con Best Times

Investigar y usar el endpoint de Best Times de Metricool:
- Obtener horarios óptimos
- Distribuir clips automáticamente
- Programar en momentos de mayor engagement

---

## 📝 Notas Técnicas

### Persistencia vs Memoria

El sistema usa dos capas de estado:

1. **Base de datos (SQLite)**: Estado persistente
   - Sobrevive a reinicios del servidor
   - Permite recuperación después de cerrar la página
   - Fuente de verdad para el estado

2. **Memoria (Map)**: Estado temporal
   - Clientes SSE conectados
   - Estado en tiempo real
   - Se reconstruye desde DB si es necesario

### Confirmación de Publicación

El sistema espera confirmación de Facebook antes de proceder:
- Polling cada 2 segundos
- Máximo 60 intentos (2 minutos)
- Si falla, marca el clip como error y continúa

### Orden Secuencial

Los clips se publican **uno a uno** para:
- Mantener el orden de la historia
- Respetar límites de Facebook
- Confirmar cada publicación antes de continuar

---

**Implementado**: 2025-10-29
**Estado**: ✅ Completado y probado
**Próximo paso**: Frontend - Reconexión a batches activos
