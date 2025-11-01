// 📤 Componente de Resultados y Descarga

'use client';

import { useState } from 'react';
import { Download, Folder, FileVideo, Image, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { ProcessingJob, GeneratedClip } from '@/types';

interface ResultsSectionProps {
  currentJob: ProcessingJob | null;
  isProcessing: boolean;
  progress: number;
  onDownloadZip: (jobId: string) => void;
  onReprocess: () => void;
}

export default function ResultsSection({
  currentJob,
  isProcessing,
  progress,
  onDownloadZip,
  onReprocess,
}: ResultsSectionProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'failed':
        return 'Error';
      case 'processing':
        return 'Procesando';
      case 'pending':
        return 'Pendiente';
      default:
        return 'Desconocido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'processing':
        return 'text-blue-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <FileVideo className="w-6 h-6 text-green-400" />
        📤 Resultados
      </h2>

      {/* Estado del procesamiento */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          📊 Estado del Procesamiento
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {currentJob ? getStatusIcon(currentJob.status) : <Clock className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-300">Estado</span>
            </div>
            <p className={`text-lg font-bold ${currentJob ? getStatusColor(currentJob.status) : 'text-gray-400'}`}>
              {currentJob ? getStatusText(currentJob.status) : '—'}
            </p>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Progreso</span>
            </div>
            <p className="text-lg font-bold text-white">{progress}%</p>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileVideo className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Job ID actual</span>
            </div>
            <p className="text-lg font-bold text-white font-mono text-sm">
              {currentJob?.id || '—'}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        {isProcessing && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>⏳ Procesando clips…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Mensaje de éxito */}
        {currentJob?.status === 'completed' && (
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-medium">✅ Clips generados con éxito</span>
            </div>
          </div>
        )}

        {/* Error */}
        {currentJob?.status === 'failed' && currentJob.error && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-medium">Error en el procesamiento</span>
            </div>
            <p className="text-red-300 text-sm">{currentJob.error}</p>
          </div>
        )}
      </div>

      {/* Clips generados */}
      {currentJob?.clips && currentJob.clips.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              🎞️ Clips generados:
            </h3>
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {showMetadata ? 'Ocultar' : 'Mostrar'} metadata
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentJob.clips.map((clip, index) => (
              <div
                key={clip.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{clip.filename}</p>
                    <p className="text-gray-400 text-sm">
                      {clip.startTime} - {clip.duration}
                    </p>
                    {showMetadata && (
                      <div className="flex gap-2 mt-1">
                        {clip.filter && (
                          <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                            {clip.filter}
                          </span>
                        )}
                        {clip.overlay && clip.overlay !== 'none' && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                            {clip.overlay}
                          </span>
                        )}
                        {(clip.flip.horizontal || clip.flip.vertical) && (
                          <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded-full">
                            Flip
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {clip.thumbnail && (
                    <div className="w-12 h-8 bg-gray-600 rounded flex items-center justify-center">
                      <Image className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botón de descarga */}
          <div className="mt-4">
            <button
              onClick={() => currentJob && onDownloadZip(currentJob.id)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download className="w-5 h-5" />
              📁 Descargar Carpeta de Clips
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Descarga un ZIP con todos los clips, thumbnails y metadata.json
            </p>
          </div>
        </div>
      )}

      {/* Estado de publicaciones */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          📱 Estado de Publicaciones:
        </h3>
        <div className="p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-400">No hay publicaciones en proceso</p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4">
        {currentJob?.status === 'completed' && (
          <button
            onClick={onReprocess}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Reprocesar Video
          </button>
        )}
        
        <button className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
          <Trash2 className="w-5 h-5" />
          Limpiar Logs
        </button>
      </div>
    </div>
  );
}
