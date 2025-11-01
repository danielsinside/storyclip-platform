// 🌐 Cliente API para StoryClip Tester

import axios from 'axios';
import { ProcessingJob, DownloadZipResponse, FacebookPage, ClipMetadata } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface ProcessVideoRequest {
  videoUrl?: string;
  videoFile?: File;
  uploadId?: string;
  distribution: {
    mode: 'automatic' | 'manual' | 'optimal' | 'AUTO' | 'MANUAL';
    clipDuration?: number;
    maxClips?: number;
    randomOffset?: boolean;
    customTimestamps?: Array<{
      start: number;
      end: number;
    }>;
    clips?: Array<{
      start?: number;
      startTime?: number;
      end?: number;
      endTime?: number;
      duration?: number;
    }>;
  };
  filters?: any; // Permitir cualquier filtro
  flip?: {
    horizontal?: boolean;
    vertical?: boolean;
  };
  overlay?: any; // Permitir cualquier overlay
  effects?: any; // Efectos adicionales
  audio?: any; // Configuración de audio
  cameraMovement?: any; // Movimiento de cámara
  metadata?: any; // Metadata adicional
  callbackUrl?: string;
}

export interface ProcessVideoResponse {
  success: boolean;
  jobId: string;
  message?: string;
  error?: string;
}

export interface UploadVideoResponse {
  success: boolean;
  uploadId: string;
  videoUrl: string;
  url: string;
  filename: string;
  size: number;
  message?: string;
  error?: string;
}

/**
 * Sube un video al servidor
 */
export async function uploadVideo(file: File): Promise<UploadVideoResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/videos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Procesa un video y genera clips
 */
export async function processVideo(request: ProcessVideoRequest): Promise<ProcessVideoResponse> {
  // Si tenemos uploadId, usar el endpoint process-video en lugar de process
  if (request.uploadId) {
    // Construir el objeto de request completo con TODOS los parámetros
    const processRequest: any = {
      uploadId: request.uploadId,
    };

    // Agregar configuración de distribución/clips
    if (request.distribution) {
      console.log('📊 Distribution config received:', {
        mode: request.distribution.mode,
        clipDuration: request.distribution.clipDuration,
        maxClips: request.distribution.maxClips,
        hasCustomTimestamps: !!request.distribution.customTimestamps,
        customTimestampsLength: request.distribution.customTimestamps?.length
      });

      // Convertir distribution a formato esperado por el backend
      const isManualMode = request.distribution.mode === 'manual' || request.distribution.mode === 'MANUAL';

      console.log('🔍 Mode detection:', {
        distributionMode: request.distribution.mode,
        isManualMode: isManualMode,
        willGenerateClips: isManualMode || ((request.distribution.maxClips || 0) > 1)
      });

      if (isManualMode && request.distribution.customTimestamps && request.distribution.customTimestamps.length > 0) {
        // Modo manual con clips personalizados
        processRequest.mode = 'manual';
        processRequest.clips = request.distribution.customTimestamps.map((clip: any) => ({
          start: clip.start || 0,
          end: clip.end || 5,
        }));
        processRequest.maxClips = request.distribution.customTimestamps.length;
        processRequest.clipDuration = Math.max(...request.distribution.customTimestamps.map((c: any) => (c.end - c.start)));

        console.log('📎 Manual mode with custom clips:', processRequest.clips);
      } else if (isManualMode) {
        // Modo manual pero sin clips personalizados, generar automáticamente basado en duración y cantidad
        processRequest.mode = 'manual';
        const duration = request.distribution.clipDuration || 5;
        const maxClips = request.distribution.maxClips || 10; // Cambiar default a 10

        console.log('🎯 Manual mode processing:', {
          duration,
          maxClips,
          totalDuration: duration * maxClips,
          distributionMaxClips: request.distribution.maxClips,
          distributionClipDuration: request.distribution.clipDuration
        });

        // Verificar que realmente queremos múltiples clips
        if (maxClips <= 1) {
          console.warn('⚠️ Manual mode but maxClips is 1 or less, this will generate only 1 clip');
        }

        // Generar clips automáticamente
        processRequest.clips = [];
        for (let i = 0; i < maxClips; i++) {
          processRequest.clips.push({
            start: i * duration,
            end: (i + 1) * duration
          });
        }
        processRequest.maxClips = maxClips;
        processRequest.clipDuration = duration;

        console.log('📎 Manual mode - clips generated:', {
          count: processRequest.clips.length,
          firstClip: processRequest.clips[0],
          lastClip: processRequest.clips[processRequest.clips.length - 1],
          allClips: processRequest.clips
        });
      } else {
        // Modo automático - PERO si hay maxClips > 1, generar clips manualmente
        const clipDuration = request.distribution.clipDuration || 5;
        const maxClips = request.distribution.maxClips || 50;

        // Si maxClips > 1, generar clips aunque esté en modo automático
        if (maxClips > 1 && clipDuration > 0) {
          console.log('🔄 Auto mode but generating multiple clips:', { clipDuration, maxClips });

          processRequest.mode = 'manual';
          processRequest.clips = [];
          for (let i = 0; i < maxClips; i++) {
            processRequest.clips.push({
              start: i * clipDuration,
              end: (i + 1) * clipDuration
            });
          }
          processRequest.maxClips = maxClips;
          processRequest.clipDuration = clipDuration;

          console.log('📎 Generated clips for auto mode:', {
            count: processRequest.clips.length,
            clips: processRequest.clips.slice(0, 5) // Mostrar solo los primeros 5 para no saturar la consola
          });
        } else {
          // Modo automático tradicional
          processRequest.mode = 'auto';
          processRequest.clipDuration = clipDuration;
          processRequest.maxClips = maxClips;

          console.log('🔄 Auto mode (single clip):', { clipDuration, maxClips });
        }
      }
    }

    // Agregar filtros (brightness, contrast, saturation)
    if (request.filters) {
      processRequest.filters = request.filters;
    }

    // Agregar efectos (flip, overlay, etc.)
    const effects: any = {};
    if (request.flip) {
      effects.mirrorHorizontal = request.flip.horizontal || false;
      effects.mirrorVertical = request.flip.vertical || false;
    }
    if (request.effects) {
      Object.assign(effects, request.effects);
    }
    processRequest.effects = effects;

    // Agregar overlays
    if (request.overlay) {
      processRequest.overlays = request.overlay;
    }

    // Agregar configuración de audio
    if (request.audio) {
      processRequest.audio = request.audio;
    }

    // Agregar movimiento de cámara
    if (request.cameraMovement) {
      processRequest.cameraMovement = request.cameraMovement;
    }

    // Agregar metadata
    if (request.metadata) {
      processRequest.metadata = request.metadata;
    }

    // Agregar callback URL si existe
    if (request.callbackUrl) {
      processRequest.callbackUrl = request.callbackUrl;
    }

    // Validación final antes de enviar
    if (processRequest.mode === 'manual' && processRequest.clips) {
      console.log('✅ Final validation - Manual mode:', {
        mode: processRequest.mode,
        clipsCount: processRequest.clips.length,
        maxClips: processRequest.maxClips,
        clipDuration: processRequest.clipDuration,
        firstThreeClips: processRequest.clips.slice(0, 3)
      });

      if (processRequest.clips.length === 1) {
        console.error('⚠️ WARNING: Only 1 clip will be generated! Check your maxClips configuration.');
      }
    }

    console.log('📤 Sending process request with all parameters:', processRequest);

    const response = await apiClient.post('/process-video', processRequest);
    return response.data;
  }

  // Fallback al método antiguo con formData
  const formData = new FormData();

  if (request.videoFile) {
    formData.append('videoFile', request.videoFile);
  }

  if (request.videoUrl) {
    formData.append('videoUrl', request.videoUrl);
  }

  formData.append('distribution', JSON.stringify(request.distribution));
  formData.append('filters', JSON.stringify(request.filters));
  formData.append('flip', JSON.stringify(request.flip));
  formData.append('overlay', JSON.stringify(request.overlay));

  if (request.callbackUrl) {
    formData.append('callbackUrl', request.callbackUrl);
  }

  const response = await apiClient.post('/process', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Obtiene el estado de un job de procesamiento
 */
export async function getJobStatus(jobId: string): Promise<ProcessingJob> {
  const response = await apiClient.get(`/jobs/${jobId}/status`);

  // Mapear la respuesta del nuevo formato al formato esperado
  const data = response.data;

  // Si hay un error pero no es 404, manejar como job pendiente
  if (data.error && data.code === 'JOB_NOT_READY') {
    return {
      id: jobId,
      status: 'pending',
      progress: 0,
      message: data.message || 'Procesando...',
      videoConfig: { url: '' },
      distribution: { mode: 'automatic', clipDuration: 5, maxClips: 50 },
      filters: [],
      flip: { horizontal: false, vertical: false },
      overlay: { style: 'none', position: 'center', opacity: 1 },
      createdAt: new Date()
    } as ProcessingJob;
  }

  // Mapear el estado del backend al formato del frontend
  return {
    id: jobId,
    status: data.status === 'done' ? 'completed' :
            data.status === 'error' ? 'failed' :
            data.status === 'processing' ? 'running' :
            data.status,
    progress: data.progress || 0,
    message: data.message,
    error: data.errorMessage,
    outputUrl: data.outputUrl,
    clips: data.metadata?.clips || [],
    videoConfig: { url: '' },
    distribution: { mode: 'automatic', clipDuration: 5, maxClips: 50 },
    filters: [],
    flip: { horizontal: false, vertical: false },
    overlay: { style: 'none', position: 'center', opacity: 1 },
    createdAt: new Date()
  } as ProcessingJob;
}

/**
 * Descarga el ZIP con todos los clips generados
 */
export async function downloadClipsZip(jobId: string): Promise<DownloadZipResponse> {
  const response = await apiClient.get(`/downloadZip?jobId=${jobId}`, {
    responseType: 'blob',
  });
  
  // Crear URL para descarga
  const blob = new Blob([response.data], { type: 'application/zip' });
  const downloadUrl = window.URL.createObjectURL(blob);
  
  return {
    success: true,
    downloadUrl,
  };
}

/**
 * Obtiene la metadata de los clips generados
 */
export async function getClipsMetadata(jobId: string): Promise<ClipMetadata> {
  const response = await apiClient.get(`/metadata/${jobId}`);
  return response.data;
}

/**
 * Obtiene las páginas de Facebook disponibles
 */
export async function getFacebookPages(): Promise<FacebookPage[]> {
  const response = await apiClient.get('/facebook/pages');
  return response.data;
}

/**
 * Publica clips a Facebook Stories
 */
export async function publishToFacebook(
  jobId: string,
  pageId: string,
  clips: string[]
): Promise<{ success: boolean; publishedClips: string[]; errors: string[] }> {
  const response = await apiClient.post('/facebook/publish', {
    jobId,
    pageId,
    clips,
  });
  
  return response.data;
}

/**
 * Simula un callback para desarrollo
 */
export async function simulateCallback(jobId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/simulate-callback', { jobId });
  return response.data;
}

/**
 * Genera comando cURL para testing
 */
export function generateCurlCommand(
  jobId: string,
  callbackUrl: string,
  status: string = 'completed'
): string {
  const payload = {
    jobId,
    status,
    timestamp: new Date().toISOString(),
    message: 'Procesamiento completado',
  };
  
  return `curl -X POST "${callbackUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
}

export default apiClient;
