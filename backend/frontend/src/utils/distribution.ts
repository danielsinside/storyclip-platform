// 🔄 Lógica de Distribución de Clips Optimizada

import { ClipDistribution, VideoConfig } from '@/types';

/**
 * Calcula la distribución automática de clips con random offset
 */
export function calculateAutomaticDistribution(
  videoDuration: number,
  clipDuration: number,
  maxClips: number,
  randomOffset: boolean = true
): Array<{ start: number; end: number; offset?: number }> {
  const clips: Array<{ start: number; end: number; offset?: number }> = [];
  
  // Calcular cuántos clips caben en la duración total
  const maxPossibleClips = Math.floor(videoDuration / clipDuration);
  const actualClips = Math.min(maxClips, maxPossibleClips);
  
  if (actualClips === 0) {
    return clips;
  }
  
  // Distribución uniforme
  const totalDuration = actualClips * clipDuration;
  const startOffset = (videoDuration - totalDuration) / 2;
  
  for (let i = 0; i < actualClips; i++) {
    const baseStart = startOffset + (i * clipDuration);
    let start = baseStart;
    
    // Aplicar random offset de hasta 1 segundo si está habilitado
    if (randomOffset && videoDuration > clipDuration) {
      const maxOffset = Math.min(1, (videoDuration - totalDuration) / 2);
      const randomOffsetValue = (Math.random() - 0.5) * 2 * maxOffset;
      start = Math.max(0, Math.min(videoDuration - clipDuration, baseStart + randomOffsetValue));
    }
    
    const end = start + clipDuration;
    
    clips.push({
      start: Math.max(0, start),
      end: Math.min(videoDuration, end),
      offset: randomOffset ? start - baseStart : undefined
    });
  }
  
  return clips;
}

/**
 * Calcula la distribución óptima ajustando la duración
 */
export function calculateOptimalDistribution(
  videoDuration: number,
  targetClips: number
): Array<{ start: number; end: number; duration: number }> {
  const clips: Array<{ start: number; end: number; duration: number }> = [];
  
  if (targetClips === 0 || videoDuration === 0) {
    return clips;
  }
  
  // Duración óptima por clip
  const optimalDuration = videoDuration / targetClips;
  
  for (let i = 0; i < targetClips; i++) {
    const start = i * optimalDuration;
    const end = Math.min(videoDuration, (i + 1) * optimalDuration);
    
    clips.push({
      start,
      end,
      duration: end - start
    });
  }
  
  return clips;
}

/**
 * Valida la configuración de distribución
 */
export function validateDistribution(
  videoDuration: number,
  distribution: ClipDistribution
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (videoDuration <= 0) {
    errors.push('La duración del video debe ser mayor a 0');
  }
  
  if (distribution.clipDuration <= 0) {
    errors.push('La duración por clip debe ser mayor a 0');
  }
  
  if (distribution.clipDuration > 60) {
    errors.push('La duración por clip no puede ser mayor a 60 segundos');
  }
  
  if (distribution.maxClips <= 0) {
    errors.push('La cantidad de clips debe ser mayor a 0');
  }
  
  if (distribution.maxClips > 100) {
    errors.push('La cantidad de clips no puede ser mayor a 100');
  }
  
  if (distribution.clipDuration > videoDuration) {
    errors.push('La duración por clip no puede ser mayor que la duración del video');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Genera preview de distribución
 */
export function generateDistributionPreview(
  videoDuration: number,
  distribution: ClipDistribution
): {
  totalClips: number;
  totalDuration: number;
  coverage: number;
  clips: Array<{ start: number; end: number; duration: number }>;
} {
  let clips: Array<{ start: number; end: number; duration: number }> = [];
  
  switch (distribution.mode) {
    case 'automatic':
      const autoClips = calculateAutomaticDistribution(
        videoDuration,
        distribution.clipDuration,
        distribution.maxClips,
        distribution.randomOffset
      );
      clips = autoClips.map(clip => ({
        start: clip.start,
        end: clip.end,
        duration: clip.end - clip.start
      }));
      break;
      
    case 'optimal':
      clips = calculateOptimalDistribution(videoDuration, distribution.maxClips);
      break;
      
    case 'manual':
      if (distribution.customTimestamps) {
        clips = distribution.customTimestamps.map(ts => ({
          start: ts.start,
          end: ts.end,
          duration: ts.end - ts.start
        }));
      }
      break;
  }
  
  const totalClips = clips.length;
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
  const coverage = videoDuration > 0 ? (totalDuration / videoDuration) * 100 : 0;
  
  return {
    totalClips,
    totalDuration,
    coverage,
    clips
  };
}

/**
 * Formatea tiempo en formato HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convierte tiempo HH:MM:SS a segundos
 */
export function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  
  return parts[0] || 0;
}
