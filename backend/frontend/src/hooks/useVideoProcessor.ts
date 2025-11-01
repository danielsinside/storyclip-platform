// 🎬 Hook para procesamiento de videos

import { useState, useCallback, useRef } from 'react';
import { ProcessingJob, ProcessVideoRequest } from '@/types';
import { processVideo, getJobStatus, downloadClipsZip } from '@/lib/api/client';

export interface UseVideoProcessorReturn {
  // Estado
  currentJob: ProcessingJob | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  
  // Acciones
  startProcessing: (request: ProcessVideoRequest) => Promise<void>;
  checkStatus: (jobId: string) => Promise<void>;
  downloadZip: (jobId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
  
  // Polling
  startPolling: (jobId: string, interval?: number) => void;
  stopPolling: () => void;
}

export function useVideoProcessor(): UseVideoProcessorReturn {
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startProcessing = useCallback(async (request: ProcessVideoRequest) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      
      const response = await processVideo(request);
      
      if (response.success) {
        setCurrentJob({
          id: response.jobId,
          status: 'pending',
          progress: 0,
          videoConfig: {
            url: request.videoUrl,
            file: request.videoFile,
          },
          distribution: request.distribution,
          filters: request.filters,
          flip: request.flip,
          overlay: request.overlay,
          createdAt: new Date(),
        });
        
        // Iniciar polling automático
        startPolling(response.jobId);
      } else {
        throw new Error(response.error || 'Error al iniciar el procesamiento');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setIsProcessing(false);
    }
  }, []);
  
  const checkStatus = useCallback(async (jobId: string) => {
    try {
      const job = await getJobStatus(jobId);
      setCurrentJob(job);
      setProgress(job.progress);
      
      if (job.status === 'completed') {
        setIsProcessing(false);
        stopPolling();
      } else if (job.status === 'failed') {
        setIsProcessing(false);
        setError(job.error || 'Error en el procesamiento');
        stopPolling();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al verificar estado';
      setError(errorMessage);
    }
  }, []);
  
  const downloadZip = useCallback(async (jobId: string) => {
    try {
      const response = await downloadClipsZip(jobId);
      
      if (response.success && response.downloadUrl) {
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = `clips-${jobId}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL
        window.URL.revokeObjectURL(response.downloadUrl);
      } else {
        throw new Error(response.error || 'Error al descargar el ZIP');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al descargar';
      setError(errorMessage);
    }
  }, []);
  
  const startPolling = useCallback((jobId: string, interval: number = 2000) => {
    stopPolling(); // Limpiar polling anterior
    
    pollingIntervalRef.current = setInterval(() => {
      checkStatus(jobId);
    }, interval);
  }, [checkStatus]);
  
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const reset = useCallback(() => {
    setCurrentJob(null);
    setIsProcessing(false);
    setProgress(0);
    setError(null);
    stopPolling();
  }, [stopPolling]);
  
  return {
    currentJob,
    isProcessing,
    progress,
    error,
    startProcessing,
    checkStatus,
    downloadZip,
    clearError,
    reset,
    startPolling,
    stopPolling,
  };
}
