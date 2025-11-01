# ✅ Actualización: Stories Sin Texto

## Cambio Implementado

Se actualizó el `MetricoolService` para **NO enviar texto** al publicar Stories, ya que Facebook e Instagram tienen una limitación en su API:

```
Auto publish (story) → Max characters allowed: 0
```

## ❌ Limitación de Facebook/Instagram API

Las Stories publicadas vía API **no pueden** incluir texto superpuesto. Esta es una limitación de la plataforma, no de Metricool.

### Lo que NO funciona:
- ❌ Enviar texto como parámetro en la API
- ❌ Agregar texto después de subir el video
- ❌ Usar caption o descripción en Stories

### Lo que SÍ funciona:
- ✅ Incluir texto **dentro del video** (burned-in text)
- ✅ Usar herramientas de edición de video para agregar texto antes de subir
- ✅ Los clips de StoryClip ya incluyen subtítulos en el video mismo

## 🔧 Cambios Técnicos

### Antes:
```javascript
const payload = {
  accountId: accountId,
  mediaId: mediaId,
  type: 'story',
  text: text || '',  // ❌ Esto causaba error
};
```

### Después:
```javascript
const payload = {
  accountId: accountId,
  mediaId: mediaId,
  type: 'story'
  // NO text field - Stories don't support text overlay via API
};
```

## ✅ Impacto en StoryClip

**Buenas noticias**: Los clips generados por StoryClip **ya incluyen subtítulos quemados en el video**, por lo que:

1. ✅ Los subtítulos ya están integrados en cada clip
2. ✅ No se necesita texto adicional vía API
3. ✅ Los Stories se publicarán correctamente con los subtítulos visibles

## 📝 Para el Usuario

Cuando publiques Stories:

1. **Los subtítulos ya están en el video** - No necesitas agregar texto adicional
2. **El texto es opcional en la configuración** - Se ignorará al publicar Stories
3. **Funciona igual para publicación manual o automática**

## 🎯 Tipos de Publicación

| Tipo | Soporta Texto | Notas |
|------|---------------|-------|
| **Stories** | ❌ No | Texto debe estar en el video |
| **Posts** | ✅ Sí | Caption/descripción permitida |
| **Reels** | ✅ Sí | Caption/descripción permitida |

## 🚀 Estado Actual

- ✅ MetricoolService actualizado
- ✅ Backend reiniciado
- ✅ Documentación actualizada
- ✅ Listo para publicar Stories sin errores

## 📚 Referencias

- [Facebook Graph API - Stories](https://developers.facebook.com/docs/graph-api/reference/page/stories/)
- [Instagram Graph API - Stories](https://developers.facebook.com/docs/instagram-api/reference/ig-user/stories/)

---
**Actualizado**: 2025-10-29
**Archivo**: `/srv/storyclip/services/metricool.service.js`
