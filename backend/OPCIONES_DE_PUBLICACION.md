# 📊 Opciones de Publicación - Criterios y Funcionamiento

## Resumen

StoryClip ofrece 3 modos de publicación para tus Stories en Facebook/Instagram a través de Metricool.

---

## 1. 📤 Publicar Ahora

### 🎯 Criterio:
- **Publicación inmediata** de todos los clips
- Uno tras otro, esperando confirmación de Facebook antes de publicar el siguiente
- No se programa nada, se publica en el momento

### ⚙️ Cómo Funciona:

```
1. Usuario hace clic en "Iniciar Publicación"
2. Sistema envía Clip 1 a Metricool
3. Metricool sube el video a Facebook/Instagram
4. Sistema espera confirmación de que se publicó exitosamente
5. Una vez confirmado ✅, envía Clip 2
6. Repite el proceso hasta terminar todos los clips
```

### ⏱️ Tiempo Estimado:
- **Por clip**: ~30-60 segundos (depende de Facebook)
- **50 clips**: ~25-50 minutos aproximadamente
- Incluye tiempo de subida + confirmación de Facebook

### ✅ Ventajas:
- ✅ Simple y directo
- ✅ No requiere configuración adicional
- ✅ Perfecto para publicar urgente
- ✅ Respeta límites de Facebook automáticamente

### ⚠️ Consideraciones:
- ⏰ Toma tiempo (depende de cantidad de clips)
- 📱 Todos los clips se publican seguidos
- 🔄 No se puede pausar una vez iniciado

### 💡 Cuándo Usar:
- Necesitas publicar inmediatamente
- No te importa que todos se publiquen en secuencia
- Quieres resultados rápidos sin configurar fechas

---

## 2. 📅 Programar Fecha

### 🎯 Criterio:
- **Publicación diferida** a una fecha y hora específica
- Todos los clips se programan para la misma fecha/hora
- Metricool gestiona la publicación automática

### ⚙️ Cómo Funciona:

```
1. Usuario selecciona fecha y hora (ej: 15 Enero 2025, 18:00)
2. Sistema programa TODOS los clips para esa fecha
3. Metricool almacena los clips programados
4. En la fecha/hora indicada, Metricool publica automáticamente
5. Los clips se publican uno tras otro desde esa hora
```

### 📆 Configuración:
- **Calendario**: Selector visual de fecha
- **Hora**: Input de 24h (formato: 14:30)
- **Validación**: No permite fechas pasadas
- **Zona horaria**: Según tu configuración en Metricool

### ✅ Ventajas:
- ✅ Planifica con anticipación
- ✅ Publica en horario óptimo para tu audiencia
- ✅ Puedes preparar contenido con días de antelación
- ✅ Metricool gestiona todo automáticamente

### ⚠️ Consideraciones:
- 📅 Debes conocer el mejor horario para tu audiencia
- 🔄 Una vez programado, se requiere acceso a Metricool para cancelar
- ⏱️ Todos los clips inician desde la misma hora

### 💡 Cuándo Usar:
- Quieres publicar en un momento específico del día
- Conoces los horarios de mayor engagement de tu audiencia
- Necesitas preparar contenido con anticipación
- Tienes una estrategia de publicación planificada

---

## 3. 📈 Mejor Momento (Próximamente)

### 🎯 Criterio Planificado:
- **Publicación inteligente** basada en analytics
- Sistema analiza el mejor momento para cada audiencia
- Distribución automática en horarios óptimos

### 🔮 Cómo Funcionará (En Desarrollo):

```
1. Sistema analiza métricas de engagement de tu cuenta
2. Identifica los mejores horarios para publicar
3. Distribuye automáticamente los clips en esos momentos
4. Maximiza el alcance y engagement
```

### 📊 Análisis Propuesto:
- **Horarios de mayor actividad** de tus seguidores
- **Días con mejor engagement**
- **Intervalos óptimos** entre publicaciones
- **Patrones históricos** de rendimiento

### ✨ Funcionalidad Futura:
- 🤖 IA analiza tus mejores horarios
- 📊 Basado en datos reales de Metricool/Facebook
- ⏰ Distribución inteligente en horas pico
- 📈 Maximiza alcance orgánico

### ⚠️ Estado Actual:
- 🚧 **En desarrollo** - No disponible todavía
- 📝 Placeholder en la UI
- 💡 Usa "Publicar Ahora" o "Programar Fecha" por el momento

### 💡 Cuándo Usar (Futuro):
- Quieres maximizar alcance automáticamente
- No conoces los mejores horarios
- Confías en el análisis de datos
- Buscas optimización sin esfuerzo manual

---

## 🔄 Flujo de Publicación Confirmado

Independiente del modo elegido, el sistema usa **publicación confirmada**:

### Proceso por Clip:

```javascript
1. 📤 Subir video a Metricool
   ↓
2. ⏳ Esperar que Metricool suba a Facebook
   ↓
3. 👀 Verificar cada 2 segundos si se publicó
   ↓
4. ✅ Recibir confirmación de publicación exitosa
   ↓
5. ➡️ Proceder con siguiente clip
```

### ⏱️ Tiempos de Confirmación:
- **Polling**: Cada 2 segundos
- **Máximo de intentos**: 60 (2 minutos)
- **Por clip**: 30-120 segundos típicamente

### 🛡️ Manejo de Errores:
- ❌ Si un clip falla → Registra el error
- ➡️ Continúa con el siguiente clip
- 📊 Reporte final con éxitos y errores
- 🔁 No reintenta automáticamente (por seguridad)

---

## 📋 Comparación Rápida

| Característica | Publicar Ahora | Programar Fecha | Mejor Momento |
|----------------|----------------|-----------------|---------------|
| **Velocidad** | Inmediata | Diferida | Automática (futuro) |
| **Configuración** | Ninguna | Fecha + Hora | Ninguna |
| **Control** | Total | Alto | Automático |
| **Optimización** | Manual | Manual | IA (futuro) |
| **Uso Típico** | Urgente | Planificado | Maximizar alcance |
| **Estado** | ✅ Disponible | ✅ Disponible | 🚧 En desarrollo |

---

## 🎓 Recomendaciones

### Para Principiantes:
👉 **"Publicar Ahora"** - Simple y directo

### Para Planificadores:
👉 **"Programar Fecha"** - Control total del timing

### Para Maximizar Alcance:
👉 Analiza tus métricas y usa **"Programar Fecha"** en horarios pico
👉 O espera a **"Mejor Momento"** (próximamente)

### Mejores Prácticas:

1. **No publiques 50 clips de golpe**
   - Facebook puede limitar tu cuenta
   - Mejor distribuye en varios días

2. **Horarios Óptimos Generales**:
   - 📱 **Instagram**: 6-9 AM, 12-2 PM, 5-7 PM
   - 📘 **Facebook**: 1-4 PM (días laborales)
   - 🎯 **Stories**: Horarios de mayor actividad de tu audiencia

3. **Cantidad Recomendada**:
   - 📊 **Por día**: 5-10 Stories máximo
   - ⏱️ **Frecuencia**: Cada 2-3 horas
   - 🚫 **Evitar**: Spam (más de 15 al día)

---

## 🛠️ Implementación Técnica

### Código Relevante:

**Frontend:**
- `/src/components/PublishOptions.tsx` - Selector de opciones
- `/src/pages/Publish.tsx` - Flujo de publicación

**Backend:**
- `/services/metricool.service.js` - Integración con Metricool
- `/routes/metricool.js` - Endpoints de publicación

### Tipos de Modo:

```typescript
export type PublishMode = 'now' | 'scheduled' | 'bestTime';
```

### Payload al Backend:

```javascript
{
  posts: [/* array de clips */],
  schedule: {
    mode: 'now' | 'scheduled',
    scheduledAt?: '2025-01-15T18:00:00Z'
  },
  settings: {
    accountId: '5372118', // Brand de Metricool
    metricoolAccountId: '5372118'
  }
}
```

---

**Última actualización**: 2025-10-29
**Archivo**: `/srv/storyclip/OPCIONES_DE_PUBLICACION.md`
