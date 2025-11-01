// Parche temporal para manejar clips sin campo filter
const patchClipsData = (clips) => {
  if (!clips || !Array.isArray(clips)) return clips;
  
  return clips.map(clip => {
    // Si no tiene effects, agregar objeto vacío
    if (!clip.effects) {
      clip.effects = {};
    }
    
    // Si no tiene filter, agregar filter vacío
    if (!clip.effects.filter) {
      clip.effects.filter = {
        type: 'none',
        intensity: 0,
        ffmpegCommand: '',
        ffmpegValues: {}
      };
      console.log('[PATCH] Added missing filter field to clip');
    }
    
    // Asegurar que ffmpegCommand existe
    if (clip.effects.filter && !clip.effects.filter.ffmpegCommand) {
      clip.effects.filter.ffmpegCommand = '';
    }
    
    return clip;
  });
};

module.exports = { patchClipsData };
console.log('✅ Parche para campo filter creado en /srv/storyclip/fix-backend-filter-patch.js');
