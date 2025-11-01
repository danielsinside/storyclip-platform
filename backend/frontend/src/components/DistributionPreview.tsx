// 📊 Componente de Preview de Distribución

'use client';

import { BarChart3, Clock, Hash, Percent, Play } from 'lucide-react';
import { formatTime } from '@/utils/distribution';

interface DistributionPreviewProps {
  preview: {
    totalClips: number;
    totalDuration: number;
    coverage: number;
    clips: Array<{ start: number; end: number; duration: number }>;
  };
  validation: {
    valid: boolean;
    errors: string[];
  };
  isLoading: boolean;
  videoDuration: number | null;
}

export default function DistributionPreview({
  preview,
  validation,
  isLoading,
  videoDuration,
}: DistributionPreviewProps) {
  if (!videoDuration) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          📋 Preview de Distribución
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-400">Selecciona un video para ver la distribución</p>
        </div>
      </div>
    );
  }

  if (!validation.valid) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          📋 Preview de Distribución
        </h2>
        <div className="space-y-2">
          {validation.errors.map((error, index) => (
            <div key={index} className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-400" />
        📋 Preview de Distribución
      </h2>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Calculando distribución...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Estadísticas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Clips totales</span>
              </div>
              <p className="text-2xl font-bold text-white">{preview.totalClips}</p>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-gray-300">Duración total</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {formatTime(preview.totalDuration)}
              </p>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Cobertura</span>
              </div>
              <p className="text-2xl font-bold text-white">{preview.coverage.toFixed(1)}%</p>
            </div>
          </div>

          {/* Barra de progreso de cobertura */}
          <div>
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Cobertura del video</span>
              <span>{preview.coverage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, preview.coverage)}%` }}
              />
            </div>
          </div>

          {/* Lista de clips */}
          {preview.clips.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Clips generados
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {preview.clips.map((clip, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          Clip {String(index + 1).padStart(3, '0')}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatTime(clip.start)} - {formatTime(clip.end)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-mono text-sm">
                        {formatTime(clip.duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h4 className="text-sm font-medium text-blue-300 mb-2">
              Información de distribución:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <div>Duración del video: <span className="text-white font-mono">{formatTime(videoDuration)}</span></div>
              <div>Duración promedio por clip: <span className="text-white font-mono">{formatTime(preview.totalDuration / preview.totalClips)}</span></div>
              <div>Tiempo no cubierto: <span className="text-white font-mono">{formatTime(videoDuration - preview.totalDuration)}</span></div>
              <div>Eficiencia: <span className="text-white">{(preview.totalDuration / videoDuration * 100).toFixed(1)}%</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
