// 📦 Componente de Procesamiento por Lotes

'use client';

import { useState, useRef } from 'react';
import { Upload, FileVideo, Trash2, Play, Pause, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { VideoConfig, ClipDistribution, FlipConfig, OverlayConfig, ExportConfig } from '@/types';

interface BatchItem {
  id: string;
  videoConfig: VideoConfig;
  distribution: ClipDistribution;
  filters: string[];
  flip: FlipConfig;
  overlay: OverlayConfig;
  exportConfig: ExportConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  jobId?: string;
}

interface BatchProcessingSectionProps {
  onBatchProcess: (items: BatchItem[]) => void;
  onClearBatch: () => void;
}

export default function BatchProcessingSection({
  onBatchProcess,
  onClearBatch,
}: BatchProcessingSectionProps) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addVideoToBatch = (file: File) => {
    const newItem: BatchItem = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      videoConfig: {
        file,
        title: file.name,
      },
      distribution: {
        mode: 'automatic',
        clipDuration: 3,
        maxClips: 10,
        randomOffset: true,
      },
      filters: [],
      flip: {
        horizontal: false,
        vertical: false,
      },
      overlay: {
        style: 'none',
        position: 'bottom',
        opacity: 80,
      },
      exportConfig: {
        format: 'mp4',
        quality: 'high',
        resolution: '1080p',
        compression: 80,
        fps: 30,
        codec: 'h264',
      },
      status: 'pending',
      progress: 0,
    };

    setBatchItems(prev => [...prev, newItem]);
  };

  const removeFromBatch = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  const updateBatchItem = (id: string, updates: Partial<BatchItem>) => {
    setBatchItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('video/')) {
          addVideoToBatch(file);
        }
      });
    }
  };

  const handleBatchProcess = async () => {
    if (batchItems.length === 0) return;

    setIsProcessing(true);
    setCurrentProcessingIndex(0);

    try {
      for (let i = 0; i < batchItems.length; i++) {
        setCurrentProcessingIndex(i);
        updateBatchItem(batchItems[i].id, { status: 'processing', progress: 0 });

        // Simular procesamiento (en la implementación real, esto sería una llamada a la API)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        updateBatchItem(batchItems[i].id, { 
          status: 'completed', 
          progress: 100,
          jobId: `job-${Date.now()}-${i}`
        });
      }
    } catch (error) {
      updateBatchItem(batchItems[currentProcessingIndex].id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-900/20';
      case 'failed':
        return 'border-red-500 bg-red-900/20';
      case 'processing':
        return 'border-blue-500 bg-blue-900/20';
      default:
        return 'border-gray-600 bg-gray-700';
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6 text-orange-400" />
        📦 Procesamiento por Lotes
      </h2>

      {/* Controles de lote */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Agregar Videos
          </button>
          
          <button
            onClick={handleBatchProcess}
            disabled={batchItems.length === 0 || isProcessing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              batchItems.length === 0 || isProcessing
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isProcessing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isProcessing ? 'Procesando...' : 'Procesar Lote'}
          </button>

          <button
            onClick={onClearBatch}
            disabled={batchItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar
          </button>
        </div>

        <div className="text-sm text-gray-300">
          {batchItems.length} video{batchItems.length !== 1 ? 's' : ''} en lote
        </div>
      </div>

      {/* Input de archivos oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Lista de videos en lote */}
      {batchItems.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {batchItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(item.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <div className="font-medium text-white">
                      {item.videoConfig.title}
                    </div>
                    <div className="text-sm text-gray-400">
                      {item.distribution.maxClips} clips • {item.distribution.clipDuration}s • {item.exportConfig.quality}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'processing' && (
                    <div className="text-sm text-blue-300">
                      {item.progress}%
                    </div>
                  )}
                  
                  {item.status === 'completed' && (
                    <div className="text-sm text-green-300">
                      Completado
                    </div>
                  )}
                  
                  {item.status === 'failed' && (
                    <div className="text-sm text-red-300">
                      Error
                    </div>
                  )}

                  <button
                    onClick={() => removeFromBatch(item.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Barra de progreso */}
              {item.status === 'processing' && (
                <div className="mt-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {item.status === 'failed' && item.error && (
                <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-300">
                  {item.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Estado del procesamiento */}
      {isProcessing && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-blue-300 font-medium">
              Procesando lote: {currentProcessingIndex + 1} de {batchItems.length}
            </span>
          </div>
          <div className="text-sm text-gray-300">
            Procesando: {batchItems[currentProcessingIndex]?.videoConfig.title}
          </div>
        </div>
      )}

      {/* Estadísticas del lote */}
      {batchItems.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl font-bold text-white">
              {batchItems.filter(item => item.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-400">Completados</div>
          </div>
          
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl font-bold text-white">
              {batchItems.filter(item => item.status === 'processing').length}
            </div>
            <div className="text-sm text-gray-400">Procesando</div>
          </div>
          
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl font-bold text-white">
              {batchItems.filter(item => item.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-400">Errores</div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      {batchItems.length === 0 && (
        <div className="text-center py-8">
          <FileVideo className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">
            No hay videos en el lote
          </p>
          <p className="text-sm text-gray-500">
            Haz clic en "Agregar Videos" para seleccionar múltiples archivos
          </p>
        </div>
      )}
    </div>
  );
}
