// 📹 Componente de Configuración de Video

'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Link, Play, FileVideo, AlertCircle } from 'lucide-react';
import { VideoConfig } from '@/types';
import AISuggestionsModal from './AISuggestionsModal';
import { uploadVideo } from '@/lib/api/client';

interface VideoConfigSectionProps {
  videoConfig: VideoConfig | null;
  onVideoConfigChange: (config: VideoConfig) => void;
  onVideoDurationChange: (duration: number) => void;
  onApplyAISuggestion?: (suggestion: any) => void;
}

export default function VideoConfigSection({
  videoConfig,
  onVideoConfigChange,
  onVideoDurationChange,
  onApplyAISuggestion,
}: VideoConfigSectionProps) {
  const [inputMode, setInputMode] = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAIModal, setShowAIModal] = useState(false);
  const [currentVideoDuration, setCurrentVideoDuration] = useState<number | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleUrlSubmit = () => {
    if (videoUrl.trim()) {
      const config: VideoConfig = {
        url: videoUrl.trim(),
        title: `Video desde URL`,
      };
      onVideoConfigChange(config);
      // Mostrar modal de IA automáticamente después de configurar el video
      setTimeout(() => {
        setShowAIModal(true);
      }, 500);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Primero, obtener la duración del video localmente
      const video = document.createElement('video');
      video.preload = 'metadata';

      const getDuration = new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video.duration);
        };
        video.src = URL.createObjectURL(file);
      });

      const duration = await getDuration;
      onVideoDurationChange(duration);
      setCurrentVideoDuration(duration);

      // Ahora hacer el upload real al backend
      setUploadProgress(30);
      const uploadResponse = await uploadVideo(file);

      if (uploadResponse.success) {
        setUploadProgress(100);
        setUploadedVideoUrl(uploadResponse.videoUrl);
        setUploadId(uploadResponse.uploadId);

        // Actualizar la configuración con la URL real del servidor
        const config: VideoConfig = {
          url: uploadResponse.videoUrl,
          uploadId: uploadResponse.uploadId,
          title: file.name,
          file: file, // Mantener referencia al archivo original
        };
        onVideoConfigChange(config);

        // Mostrar modal de IA automáticamente después de subir el archivo
        setTimeout(() => {
          setShowAIModal(true);
        }, 500);
      } else {
        throw new Error(uploadResponse.error || 'Error al subir el video');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadError(error instanceof Error ? error.message : 'Error al subir el video');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const quickTestUrls = [
    {
      name: 'Test Video (10s, 1MB)',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      icon: '🐰',
    },
    {
      name: 'Big Buck Bunny (9min, 720p)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      icon: '🎬',
    },
    {
      name: 'Sintel (52s, 720p)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      icon: '🎨',
    },
  ];

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <FileVideo className="w-6 h-6 text-blue-400" />
        📹 Configuración del Video
      </h2>

      {/* Selector de modo */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setInputMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            inputMode === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Link className="w-4 h-4" />
          URL del Video
        </button>
        <button
          onClick={() => setInputMode('file')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            inputMode === 'file'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Upload className="w-4 h-4" />
          Subir Video Local
        </button>
      </div>

      {/* Input de URL */}
      {inputMode === 'url' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Video URL *
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://ejemplo.com/video.mp4"
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!videoUrl.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Debe ser HTTPS y accesible públicamente
            </p>
          </div>

          {/* URLs de prueba rápidas */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">
              URLs de prueba rápidas:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickTestUrls.map((testUrl, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setVideoUrl(testUrl.url);
                    const config: VideoConfig = {
                      url: testUrl.url,
                      title: testUrl.name,
                    };
                    onVideoConfigChange(config);
                    // Mostrar modal de IA automáticamente
                    setTimeout(() => {
                      setShowAIModal(true);
                    }, 500);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  <span>{testUrl.icon}</span>
                  {testUrl.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input de archivo */}
      {inputMode === 'file' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Selecciona un video local *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">
                Haz clic para seleccionar un archivo
              </p>
              <p className="text-xs text-gray-400">
                Formatos soportados: MP4, MOV, AVI (máx 500MB recomendado)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Progreso de subida */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Subiendo:</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video actual */}
      {videoConfig && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Video actual:</h3>
            <p className="text-white">{videoConfig.title}</p>
            {videoConfig.url && (
              <p className="text-xs text-gray-400 mt-1 break-all">{videoConfig.url}</p>
            )}
            {uploadId && (
              <p className="text-xs text-gray-400 mt-1">Upload ID: {uploadId}</p>
            )}
          </div>

          {/* Video Preview */}
          {(videoConfig.url || uploadedVideoUrl) && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Vista previa del video:</h3>
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  controls
                  className="w-full max-h-[400px] object-contain"
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    const video = e.target as HTMLVideoElement;
                    if (!currentVideoDuration) {
                      const duration = video.duration;
                      onVideoDurationChange(duration);
                      setCurrentVideoDuration(duration);
                    }
                  }}
                >
                  <source src={videoConfig.url || uploadedVideoUrl || ''} type="video/mp4" />
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
              {currentVideoDuration && (
                <p className="text-xs text-gray-400 mt-2">
                  Duración: {Math.floor(currentVideoDuration / 60)}:{String(Math.floor(currentVideoDuration % 60)).padStart(2, '0')}
                </p>
              )}
            </div>
          )}

          {/* Error de upload */}
          {uploadError && (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300">{uploadError}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Sugerencias de IA */}
      <AISuggestionsModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApplySuggestion={(suggestion) => {
          if (onApplyAISuggestion) {
            onApplyAISuggestion(suggestion);
          }
          setShowAIModal(false);
        }}
        videoDuration={currentVideoDuration || undefined}
        videoUrl={videoConfig?.url}
      />
    </div>
  );
}
