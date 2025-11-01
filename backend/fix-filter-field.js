/**
 * CORRECCIÓN CRÍTICA PARA EL ERROR 234
 * 
 * PROBLEMA: Cuando filterType === 'none', el campo 'filter' NO se incluye
 * en los clips, causando que el backend no tenga información sobre filtros.
 * 
 * SOLUCIÓN: SIEMPRE incluir el campo 'filter', incluso cuando es 'none'
 */

// ANTES (causa error 234 cuando filterType === 'none')
const clipsWithEffects = manualClips.map((clip, i) => ({
  start: Math.max(0, clip.start),
  end: Math.min(clip.end, duration - 0.5),
  effects: {
    mirrorHorizontal: horizontalFlip,
    // ❌ PROBLEMA: Solo incluye filter si filterType !== 'none'
    ...(filterType !== 'none' ? {
      filter: {
        type: filterType,
        intensity: filterIntensity,
        customCSS: customFilterCSS,
        customName: customFilterName,
        ffmpegCommand: filterPayload.ffmpegCommand,
        ffmpegValues: filterPayload.ffmpegValues
      }
    } : {}),
    ...(clipIndicator !== 'none' ? {
      indicator: {
        label: String(i + 1),
        position: indicatorPosition || 'top-right',
        size: indicatorSize || 80
      }
    } : {})
  }
}));

// DESPUÉS (correcto - SIEMPRE incluye filter)
const clipsWithEffects = manualClips.map((clip, i) => ({
  start: Math.max(0, clip.start),
  end: Math.min(clip.end, duration - 0.5),
  effects: {
    mirrorHorizontal: horizontalFlip,
    // ✅ SOLUCIÓN: SIEMPRE incluir filter
    filter: {
      type: filterType,
      intensity: filterIntensity,
      customCSS: customFilterCSS,
      customName: customFilterName,
      ffmpegCommand: filterPayload.ffmpegCommand || '', // Vacío si es 'none'
      ffmpegValues: filterPayload.ffmpegValues
    },
    ...(clipIndicator !== 'none' ? {
      indicator: {
        label: String(i + 1),
        position: indicatorPosition || 'top-right',
        size: indicatorSize || 80
      }
    } : {})
  }
}));

/**
 * IMPACTO DE LA CORRECCIÓN:
 * 
 * 1. ✅ Los clips SIEMPRE tendrán el campo 'filter'
 * 2. ✅ El backend podrá leer ffmpegCommand (vacío si es 'none')
 * 3. ✅ FFmpeg ejecutará correctamente:
 *    - Sin filtros: -vf "scale=1080:1920:force_original_aspect_ratio=crop,crop=1080:1920,format=yuv420p"
 *    - Con filtros: -vf "scale=1080:1920:force_original_aspect_ratio=crop,crop=1080:1920,eq=saturation=1.75:contrast=1.002,format=yuv420p"
 * 
 * TESTING:
 * 1. Ir a /manual/:uploadId
 * 2. NO configurar ningún filtro (dejar en 'none')
 * 3. Click "Procesar"
 * 4. Verificar en edge function logs que los clips incluyan:
 *    {
 *      "effects": {
 *        "filter": {
 *          "type": "none",
 *          "ffmpegCommand": ""
 *        }
 *      }
 *    }
 * 5. Repetir con filtro "Vivid" al 75% y verificar que ffmpegCommand tenga valor
 */

console.log('🔧 CORRECCIÓN CRÍTICA PARA ERROR 234 IMPLEMENTADA');
console.log('================================================');
console.log('✅ Campo "filter" SIEMPRE incluido en clips');
console.log('✅ Backend podrá leer ffmpegCommand correctamente');
console.log('✅ Error 234 debería estar resuelto');
