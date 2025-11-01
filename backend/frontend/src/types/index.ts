// 🎯 Tipos para StoryClip Tester Optimizado

export interface VideoConfig {
  url?: string;
  file?: File;
  duration?: number;
  title?: string;
  uploadId?: string;
}

export interface ClipDistribution {
  mode: 'automatic' | 'manual' | 'optimal';
  clipDuration: number;
  maxClips: number;
  randomOffset?: boolean;
  customTimestamps?: Array<{
    start: number;
    end: number;
  }>;
}

export interface FilterConfig {
  name: string;
  displayName: string;
  description: string;
  category: 'visual' | 'color' | 'style';
}

export interface FlipConfig {
  horizontal: boolean;
  vertical: boolean;
}

export interface OverlayConfig {
  style: 'none' | 'pill-cta' | 'impact-hook' | 'subtitle' | 'fade-label';
  position: 'top' | 'center' | 'bottom';
  opacity: number;
}

export interface ExportConfig {
  format: 'mp4' | 'webm' | 'mov';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: '720p' | '1080p' | '4k';
  compression: number; // 1-100
  fps: 24 | 30 | 60;
  bitrate?: number; // en kbps, opcional
  codec: 'h264' | 'h265' | 'vp9';
}

export interface ProcessVideoRequest {
  videoUrl?: string;
  videoFile?: File;
  distribution: ClipDistribution;
  filters: string[];
  flip: FlipConfig;
  overlay: OverlayConfig;
  exportConfig?: ExportConfig;
  callbackUrl?: string;
}

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoConfig: VideoConfig;
  distribution: ClipDistribution;
  filters: string[];
  flip: FlipConfig;
  overlay: OverlayConfig;
  createdAt: Date;
  completedAt?: Date;
  clips?: GeneratedClip[];
  error?: string;
}

export interface GeneratedClip {
  id: string;
  filename: string;
  startTime: string;
  duration: string;
  filter: string;
  overlay: string;
  flip: FlipConfig;
  thumbnail?: string;
  downloadUrl?: string;
}

export interface ClipMetadata {
  [key: string]: {
    start: string;
    duration: string;
    filter: string;
    overlay: string;
    flip: {
      horizontal: boolean;
      vertical: boolean;
    };
    timestamp: string;
    // Información adicional mejorada
    filename: string;
    size: number; // en bytes
    resolution: string; // ej: "1080x1920"
    fps: number;
    bitrate: number; // en kbps
    codec: string; // ej: "h264"
    thumbnail?: string;
    downloadUrl?: string;
    processingTime: number; // en segundos
    quality: 'low' | 'medium' | 'high' | 'ultra';
  };
}

export interface BatchMetadata {
  jobId: string;
  createdAt: string;
  completedAt: string;
  totalClips: number;
  totalDuration: number;
  videoSource: {
    url?: string;
    filename?: string;
    originalDuration: number;
    originalSize: number;
  };
  distribution: ClipDistribution;
  appliedFilters: string[];
  appliedOverlays: string[];
  flipConfig: FlipConfig;
  processingStats: {
    totalProcessingTime: number;
    averageClipTime: number;
    successRate: number;
    errors: string[];
  };
  exportSettings: {
    format: string;
    quality: string;
    resolution: string;
    compression: number;
  };
}

export interface DownloadZipResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  metadata?: ClipMetadata;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

export interface PublishingConfig {
  enabled: boolean;
  pageId?: string;
  pages: FacebookPage[];
}

// 🎨 Filtros disponibles
export const AVAILABLE_FILTERS: FilterConfig[] = [
  { name: 'Radiant', displayName: 'Radiant', description: 'Efecto radiante y brillante', category: 'visual' },
  { name: 'Blur2', displayName: 'Blur2', description: 'Desenfoque suave', category: 'visual' },
  { name: 'Twilight', displayName: 'Twilight', description: 'Tono crepuscular', category: 'color' },
  { name: 'Crush', displayName: 'Crush', description: 'Contraste intenso', category: 'style' },
  { name: 'GTA3', displayName: 'GTA3', description: 'Estilo retro gaming', category: 'style' },
  { name: 'Fade', displayName: 'Fade', description: 'Desvanecimiento suave', category: 'visual' },
  { name: 'Noir', displayName: 'Noir', description: 'Blanco y negro clásico', category: 'color' },
  { name: 'Cinematic', displayName: 'Cinematic', description: 'Estilo cinematográfico', category: 'style' },
  { name: 'WarmContrast', displayName: 'Warm Contrast', description: 'Contraste cálido', category: 'color' },
  { name: 'CustomLUT', displayName: 'Custom LUT', description: 'LUT personalizado por usuario', category: 'style' }
];

// 🖼️ Overlays disponibles
export const AVAILABLE_OVERLAYS = [
  { value: 'none', label: 'Sin Overlay', description: 'Sin capa adicional' },
  { value: 'pill-cta', label: 'Pill CTA', description: 'Botón de llamada a la acción' },
  { value: 'impact-hook', label: 'Impact Hook', description: 'Gancho de impacto visual' },
  { value: 'subtitle', label: 'Subtitle', description: 'Subtítulos animados' },
  { value: 'fade-label', label: 'Fade Label', description: 'Etiqueta con desvanecimiento' }
];

// ⚙️ Presets de duración
export const DURATION_PRESETS = [
  { value: 3, label: '3 segundos (Stories)', description: 'Ideal para Instagram Stories' },
  { value: 5, label: '5 segundos', description: 'Duración estándar' },
  { value: 7, label: '7 segundos', description: 'Duración media' },
  { value: 10, label: '10 segundos', description: 'Duración extendida' },
  { value: 15, label: '15 segundos (Reels)', description: 'Ideal para Instagram Reels' },
  { value: 30, label: '30 segundos', description: 'Duración larga' },
  { value: 60, label: '60 segundos (Máximo)', description: 'Duración máxima' }
];

// 📊 Presets de cantidad
export const QUANTITY_PRESETS = [
  { value: 10, label: '10 clips' },
  { value: 20, label: '20 clips' },
  { value: 30, label: '30 clips' },
  { value: 50, label: '50 clips (Máximo)' }
];

// 🎬 Presets de exportación
export const EXPORT_PRESETS: { [key: string]: ExportConfig } = {
  'stories-optimized': {
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    compression: 80,
    fps: 30,
    codec: 'h264'
  },
  'reels-optimized': {
    format: 'mp4',
    quality: 'ultra',
    resolution: '1080p',
    compression: 90,
    fps: 30,
    codec: 'h264'
  },
  'web-optimized': {
    format: 'webm',
    quality: 'medium',
    resolution: '720p',
    compression: 70,
    fps: 30,
    codec: 'vp9'
  },
  'archive-quality': {
    format: 'mp4',
    quality: 'ultra',
    resolution: '4k',
    compression: 95,
    fps: 60,
    codec: 'h265'
  }
};

// 🎯 Presets de calidad
export const QUALITY_PRESETS = [
  { value: 'low', label: 'Baja (Rápido)', description: 'Compresión alta, procesamiento rápido' },
  { value: 'medium', label: 'Media (Balanceado)', description: 'Calidad y velocidad equilibradas' },
  { value: 'high', label: 'Alta (Recomendado)', description: 'Calidad óptima para redes sociales' },
  { value: 'ultra', label: 'Ultra (Máxima)', description: 'Máxima calidad, procesamiento lento' }
];
