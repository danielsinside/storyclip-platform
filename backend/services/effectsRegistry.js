/**
 * Registry central de efectos visuales
 * Mapea efectos del frontend a requisitos de filtros FFmpeg
 */

const effects = {
  // Flip horizontal
  flipHorizontal: {
    requiresFilters: ['hflip'],
    graph: () => 'hflip',
    description: 'Voltear el video horizontalmente'
  },

  // Flip vertical
  flipVertical: {
    requiresFilters: ['vflip'],
    graph: () => 'vflip',
    description: 'Voltear el video verticalmente'
  },

  // Indicador de clip con drawbox y drawtext
  clipIndicator: {
    requiresFilters: ['drawbox', 'drawtext'],
    graph: (params = {}) => {
      const text = params.text || 'CLIP %{n}';
      const x = params.x || 20;
      const y = params.y || 20;
      const fontSize = params.fontSize || 36;
      const fontColor = params.fontColor || 'white';
      const boxHeight = params.boxHeight || 80;
      
      return `drawbox=x=0:y=0:w=iw:h=${boxHeight}:color=black@0.5:t=fill,drawtext=text='${text}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}`;
    },
    description: 'Añadir indicador de clip con texto'
  },

  // Overlay personalizado
  aiCustomOverlay: {
    requiresFilters: ['overlay', 'format', 'scale'],
    graph: (params = {}) => {
      const x = params.x || '(W-w)/2';
      const y = params.y || 'H-h-40';
      const shortest = params.shortest !== false ? ':shortest=1' : '';
      
      return `[0:v][1:v]overlay=${x}:${y}${shortest}[v]`;
    },
    description: 'Añadir overlay de imagen o video'
  },

  // Escala de video
  scale: {
    requiresFilters: ['scale'],
    graph: (params = {}) => {
      const width = params.width || 1920;
      const height = params.height || 1080;
      const force = params.forceAspectRatio ? ':force_original_aspect_ratio=decrease' : '';
      
      return `scale=${width}:${height}${force}`;
    },
    description: 'Escalar el video a resolución específica'
  },

  // Padding para aspect ratio
  pad: {
    requiresFilters: ['pad'],
    graph: (params = {}) => {
      const width = params.width || 1920;
      const height = params.height || 1080;
      const color = params.color || 'black';
      
      return `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:${color}`;
    },
    description: 'Añadir padding para ajustar aspect ratio'
  },

  // Zoom y pan
  zoompan: {
    requiresFilters: ['zoompan'],
    graph: (params = {}) => {
      const zoom = params.zoom || 1.2;
      const duration = (params.duration || 5) * 30; // frames
      const x = params.x || 'iw/2';
      const y = params.y || 'ih/2';
      
      return `zoompan=z='${zoom}':d=${duration}:x='${x}':y='${y}'`;
    },
    description: 'Aplicar zoom y pan al video'
  },

  // Ajustes de color
  colorAdjust: {
    requiresFilters: ['eq', 'hue'],
    graph: (params = {}) => {
      const brightness = params.brightness || 0;
      const contrast = params.contrast || 1.0;
      const saturation = params.saturation || 1.0;
      const hueValue = params.hue || 0;
      
      // El filtro eq NO tiene opción hue, se debe usar el filtro hue por separado
      const eqFilter = `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`;
      
      if (hueValue !== 0) {
        return `${eqFilter},hue=h=${hueValue}`;
      }
      return eqFilter;
    },
    description: 'Ajustar brillo, contraste, saturación y tono'
  },

  // Blur gaussiano
  blur: {
    requiresFilters: ['gblur'],
    graph: (params = {}) => {
      const sigma = params.amount || 0.5;
      return `gblur=sigma=${sigma}`;
    },
    description: 'Aplicar desenfoque gaussiano'
  },

  // Estabilización de video
  stabilization: {
    requiresFilters: ['vidstabdetect', 'vidstabtransform'],
    graph: (params = {}) => {
      const strength = params.strength || 0.8;
      // Nota: este requiere dos pasadas
      return {
        detect: `vidstabdetect=stepsize=6:shakiness=8:accuracy=9:result=transforms.trf`,
        transform: `vidstabtransform=smoothing=${strength}:input=transforms.trf`
      };
    },
    description: 'Estabilizar video con vidstab',
    requiresTwoPass: true
  },

  // Fade in/out
  fade: {
    requiresFilters: ['fade'],
    graph: (params = {}) => {
      const type = params.type || 'in'; // 'in' o 'out'
      const duration = params.duration || 1;
      const startTime = params.startTime || 0;
      
      return `fade=t=${type}:st=${startTime}:d=${duration}`;
    },
    description: 'Aplicar fade in/out'
  },

  // Formato de pixel
  format: {
    requiresFilters: ['format'],
    graph: (params = {}) => {
      const pixelFormat = params.format || 'yuv420p';
      return `format=${pixelFormat}`;
    },
    description: 'Convertir formato de pixel'
  }
};

/**
 * Obtener todos los filtros requeridos por una lista de efectos
 */
function getRequiredFilters(effectKeys) {
  const required = new Set();
  
  for (const key of effectKeys) {
    const effect = effects[key];
    if (effect && effect.requiresFilters) {
      effect.requiresFilters.forEach(filter => required.add(filter));
    }
  }
  
  return Array.from(required);
}

/**
 * Validar si todos los efectos solicitados están disponibles
 */
function validateEffects(effectKeys, availableFilters) {
  const missing = [];
  const available = [];
  
  for (const key of effectKeys) {
    const effect = effects[key];
    if (!effect) {
      missing.push({ effect: key, reason: 'unknown_effect' });
      continue;
    }
    
    const missingFilters = effect.requiresFilters.filter(
      filter => !availableFilters.includes(filter)
    );
    
    if (missingFilters.length > 0) {
      missing.push({ 
        effect: key, 
        reason: 'missing_filters',
        filters: missingFilters 
      });
    } else {
      available.push(key);
    }
  }
  
  return { available, missing };
}

module.exports = {
  effects,
  getRequiredFilters,
  validateEffects
};
