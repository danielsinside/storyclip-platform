/**
 * Middleware para validar y normalizar el campo filter en clips
 * Soluciona el error 234 cuando filter.ffmpegCommand está vacío o undefined
 */

function validateAndNormalizeClips(clips) {
  if (!clips || !Array.isArray(clips)) {
    console.log('[FILTER-FIX] No clips provided or not an array');
    return clips;
  }
  
  return clips.map((clip, index) => {
    // Asegurar que effects existe
    if (!clip.effects) {
      clip.effects = {};
      console.log(`[FILTER-FIX] Clip ${index}: Added missing effects object`);
    }
    
    // Normalizar el campo filter
    if (!clip.effects.filter) {
      // Si no hay filter, agregar uno por defecto
      clip.effects.filter = {
        type: 'none',
        intensity: 0,
        ffmpegCommand: '',
        ffmpegValues: {}
      };
      console.log(`[FILTER-FIX] Clip ${index}: Added missing filter field`);
    } else {
      // Si existe filter pero le falta ffmpegCommand
      if (!clip.effects.filter.ffmpegCommand) {
        clip.effects.filter.ffmpegCommand = '';
        console.log(`[FILTER-FIX] Clip ${index}: Added empty ffmpegCommand to filter`);
      }
      
      // Si ffmpegValues no existe, agregarlo
      if (!clip.effects.filter.ffmpegValues) {
        clip.effects.filter.ffmpegValues = {};
        console.log(`[FILTER-FIX] Clip ${index}: Added missing ffmpegValues`);
      }
    }
    
    // Log del resultado final para debugging
    console.log(`[FILTER-FIX] Clip ${index} filter normalized:`, {
      type: clip.effects.filter.type,
      hasCommand: !!clip.effects.filter.ffmpegCommand,
      command: clip.effects.filter.ffmpegCommand || '(empty)'
    });
    
    return clip;
  });
}

module.exports = { validateAndNormalizeClips };

console.log('✅ Filter validation module created successfully');
