// 🎬 StoryClip + n8n — Tester Optimizado

'use client';

import { useState } from 'react';
import { Play, Square, RefreshCw } from 'lucide-react';
import { VideoConfig, ClipDistribution, FlipConfig, OverlayConfig, ExportConfig } from '@/types';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';
import { useDistributionPreview } from '@/hooks/useDistributionPreview';

// Componentes
import VideoConfigSection from '@/components/VideoConfigSection';
import DistributionConfigSection from '@/components/DistributionConfigSection';
import FiltersAndEffectsSection from '@/components/FiltersAndEffectsSection';
import ExportConfigSection from '@/components/ExportConfigSection';
import BatchProcessingSection from '@/components/BatchProcessingSection';
import DistributionPreview from '@/components/DistributionPreview';
import ResultsSection from '@/components/ResultsSection';
import { useToast } from '@/components/Toast';
import Toast from '@/components/Toast';

export default function HomePage() {
  // Estados principales
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [distribution, setDistribution] = useState<ClipDistribution>({
    mode: 'automatic',
    clipDuration: 3,
    maxClips: 10,
    randomOffset: true,
  });
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [flip, setFlip] = useState<FlipConfig>({
    horizontal: false,
    vertical: false,
  });
  const [overlay, setOverlay] = useState<OverlayConfig>({
    style: 'none',
    position: 'bottom',
    opacity: 80,
  });
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    compression: 80,
    fps: 30,
    codec: 'h264',
  });

  // Hooks
  const {
    currentJob,
    isProcessing,
    progress,
    error,
    startProcessing,
    downloadZip,
    clearError,
    reset,
    startPolling,
    stopPolling,
  } = useVideoProcessor();

  const { toasts, showSuccess, showError, removeToast } = useToast();

  const { preview, validation } = useDistributionPreview(
    videoConfig,
    distribution
  );

  // Handlers
  const handleVideoConfigChange = (config: VideoConfig) => {
    setVideoConfig(config);
  };

  // Handler para aplicar sugerencias de IA
  const handleApplyAISuggestion = (suggestion: any) => {
    // Aplicar filtros
    if (suggestion.filters) {
      setSelectedFilters(suggestion.filters);
    }

    // Aplicar distribución
    if (suggestion.distribution) {
      setDistribution({
        ...distribution,
        ...suggestion.distribution,
      });
    }

    // Aplicar overlay
    if (suggestion.overlay) {
      setOverlay({
        ...overlay,
        style: suggestion.overlay.style,
        position: suggestion.overlay.position,
        opacity: suggestion.overlay.opacity || 80,
      });
    }

    // Mostrar notificación
    showSuccess('Sugerencia aplicada', `Se ha aplicado la configuración: ${suggestion.title}`);
  };

  const handleVideoDurationChange = (duration: number) => {
    setVideoDuration(duration);
  };

  const handleProcessVideo = async () => {
    if (!videoConfig || !validation.valid) return;

    const request = {
      uploadId: videoConfig.uploadId,
      videoUrl: videoConfig.url,
      videoFile: videoConfig.file,
      distribution,
      filters: selectedFilters,
      flip,
      overlay,
      exportConfig,
      callbackUrl: process.env.NEXT_PUBLIC_CALLBACK_URL,
    };

    try {
      await startProcessing(request);
      showSuccess('Procesamiento iniciado', 'El video está siendo procesado');
    } catch (error) {
      showError('Error al procesar', 'No se pudo iniciar el procesamiento');
    }
  };

  const handleDownloadZip = async (jobId: string) => {
    try {
      await downloadZip(jobId);
      showSuccess('Descarga iniciada', 'El archivo ZIP se está descargando');
    } catch (error) {
      showError('Error en descarga', 'No se pudo descargar el archivo');
    }
  };

  const handleReprocess = () => {
    reset();
    handleProcessVideo();
  };

  const canProcess = videoConfig && validation.valid && !isProcessing;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                🎬 StoryClip + n8n — Tester
              </h1>
              <p className="text-gray-400 mt-1">
                Frontend de pruebas para procesamiento de videos
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isProcessing && (
                <button
                  onClick={stopPolling}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Detener Polling
                </button>
              )}
              {!isProcessing && currentJob && (
                <button
                  onClick={() => startPolling(currentJob.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Iniciar Polling
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda - Configuración */}
          <div className="space-y-8">
            {/* Configuración de Video */}
            <VideoConfigSection
              videoConfig={videoConfig}
              onVideoConfigChange={handleVideoConfigChange}
              onVideoDurationChange={handleVideoDurationChange}
              onApplyAISuggestion={handleApplyAISuggestion}
            />

            {/* Configuración de Distribución */}
            <DistributionConfigSection
              distribution={distribution}
              onDistributionChange={setDistribution}
              videoDuration={videoDuration}
            />

            {/* Filtros y Efectos */}
            <FiltersAndEffectsSection
              selectedFilters={selectedFilters}
              onFiltersChange={setSelectedFilters}
              flip={flip}
              onFlipChange={setFlip}
              overlay={overlay}
              onOverlayChange={setOverlay}
            />

            {/* Configuración de Exportación */}
            <ExportConfigSection
              exportConfig={exportConfig}
              onExportConfigChange={setExportConfig}
            />

            {/* Procesamiento por Lotes */}
            <BatchProcessingSection
              onBatchProcess={() => {}}
              onClearBatch={() => {}}
            />

            {/* Botón de procesamiento */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
              <button
                onClick={handleProcessVideo}
                disabled={!canProcess}
                className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
                  canProcess
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-6 h-6" />
                {isProcessing ? '⏳ Procesando...' : '▶️ Procesar Video'}
              </button>
              
              {error && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                  <button
                    onClick={clearError}
                    className="mt-2 text-red-400 hover:text-red-300 text-sm"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha - Preview y Resultados */}
          <div className="space-y-8">
            {/* Preview de Distribución */}
            <DistributionPreview
              preview={preview}
              validation={validation}
              isLoading={false}
              videoDuration={videoDuration}
            />

            {/* Resultados */}
            <ResultsSection
              currentJob={currentJob}
              isProcessing={isProcessing}
              progress={progress}
              onDownloadZip={handleDownloadZip}
              onReprocess={handleReprocess}
            />
          </div>
        </div>

        {/* Sección de Facebook Publishing */}
        <div className="mt-8">
          <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              📱 Publicar automáticamente a Facebook Stories
            </h2>
            <p className="text-gray-400 mb-4">
              Los clips se publicarán inmediatamente en Facebook Stories usando Metricool
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Página de Facebook
                </label>
                <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Selecciona una página...</option>
                </select>
                <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                  🔄 Cargar Páginas
                </button>
              </div>
              
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  🔐 Configuración de Publicación:
                </h3>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>• Usuario: Daniel (ID: 4172139)</div>
                  <div>• Tipo: Facebook Stories (publicación inmediata)</div>
                  <div>• Página: Se selecciona dinámicamente</div>
                </div>
                <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  🧪 Probar Publicación Manual
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Herramientas de Testing */}
        <div className="mt-8">
          <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">
              🧪 Herramientas de Testing
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Simular Callback (para desarrollo):
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Job ID
                    </label>
                    <input
                      type="text"
                      placeholder="Ingresa el Job ID"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    📋 Generar comando cURL
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  📍 Endpoints configurados:
                </h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>• API: <span className="text-white font-mono">-</span></div>
                  <div>• Status: <span className="text-white font-mono">-</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-400">
            StoryClip Tester Optimizado - Sistema de procesamiento de videos con distribución inteligente
          </p>
        </div>
      </footer>

      {/* Sistema de Toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
        />
      ))}
    </div>
  );
}