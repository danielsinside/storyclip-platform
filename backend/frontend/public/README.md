# 🖼️ Overlays para StoryClip

Esta carpeta contiene los archivos de overlay que se aplican dinámicamente a los clips.

## Estructura de Archivos

```
overlays/
├── pill-cta.mp4          # Botón de llamada a la acción
├── impact-hook.mp4       # Gancho de impacto visual
├── subtitle.mp4          # Subtítulos animados
├── fade-label.mp4        # Etiqueta con desvanecimiento
└── README.md            # Este archivo
```

## Especificaciones Técnicas

### Formato
- **Video**: MP4 o WebM
- **Resolución**: 1080x1920 (9:16) para Stories
- **Duración**: Mismo que el clip o loop infinito
- **Transparencia**: Canal alpha soportado

### Posicionamiento
- **Top**: Superior del video
- **Center**: Centro del video
- **Bottom**: Inferior del video

### Opacidad
- **Rango**: 10% - 100%
- **Por defecto**: 80%

## Creación de Overlays

### Herramientas Recomendadas
- **After Effects**: Para animaciones complejas
- **DaVinci Resolve**: Para efectos profesionales
- **Canva**: Para overlays simples

### Proceso de Creación
1. Crear composición 1080x1920
2. Diseñar overlay con transparencia
3. Exportar como MP4 con canal alpha
4. Optimizar para web (compresión)
5. Subir a `/public/overlays/`

## Integración con FFmpeg

Los overlays se combinan usando `filter_complex`:

```bash
ffmpeg -i input.mp4 -i overlay.mp4 \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto" \
  output.mp4
```

## Personalización

Para agregar nuevos overlays:

1. Crear archivo de video
2. Agregar a `AVAILABLE_OVERLAYS` en `src/types/index.ts`
3. Subir archivo a esta carpeta
4. El sistema lo detectará automáticamente

## Optimización

- **Tamaño**: Máximo 5MB por overlay
- **Compresión**: H.264 con CRF 23
- **Audio**: Sin audio (solo video)
- **FPS**: 30fps para compatibilidad
