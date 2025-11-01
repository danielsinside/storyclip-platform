# 💻 Ejemplos de Código para Lovable

## 🎯 Integración Completa con Story API

### **1. Hook Personalizado para Video Upload**

```typescript
// hooks/useVideoUpload.ts
import { useState, useCallback } from 'react';

interface VideoUploadResult {
  success: boolean;
  videoUrl?: string;
  uploadId?: string;
  error?: string;
}

interface ProcessingResult {
  success: boolean;
  jobId?: string;
  outputUrl?: string;
  error?: string;
}

export const useVideoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadVideo = useCallback(async (file: File): Promise<VideoUploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://story.creatorsflow.app/api/videos/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setProgress(100);

      if (result.success) {
        return {
          success: true,
          videoUrl: result.videoUrl,
          uploadId: result.uploadId
        };
      } else {
        return {
          success: false,
          error: result.message || 'Upload failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setUploading(false);
    }
  }, []);

  const processVideo = useCallback(async (
    uploadId: string, 
    options: {
      resolution?: string;
      quality?: string;
      filters?: Array<{type: string; params: any}>;
    } = {}
  ): Promise<ProcessingResult> => {
    setProcessing(true);

    try {
      const response = await fetch('https://story.creatorsflow.app/api/v1/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uploadId,
          options: {
            resolution: options.resolution || '1080x1920',
            quality: options.quality || 'high',
            filters: options.filters || []
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          jobId: result.jobId
        };
      } else {
        return {
          success: false,
          error: result.message || 'Processing failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setProcessing(false);
    }
  }, []);

  const checkProcessingStatus = useCallback(async (jobId: string): Promise<ProcessingResult> => {
    try {
      const response = await fetch(`https://story.creatorsflow.app/api/v1/jobs/${jobId}/status`);
      const result = await response.json();

      if (result.success) {
        if (result.status === 'completed') {
          return {
            success: true,
            outputUrl: result.outputUrl
          };
        } else if (result.status === 'failed') {
          return {
            success: false,
            error: 'Processing failed'
          };
        } else {
          return {
            success: true,
            jobId: result.jobId
          };
        }
      } else {
        return {
          success: false,
          error: result.message || 'Status check failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  return {
    uploading,
    processing,
    progress,
    uploadVideo,
    processVideo,
    checkProcessingStatus
  };
};
```

### **2. Componente de Upload de Video**

```typescript
// components/VideoUploader.tsx
import React, { useState, useRef } from 'react';
import { useVideoUpload } from '../hooks/useVideoUpload';

interface VideoUploaderProps {
  onVideoReady?: (url: string) => void;
  onProcessingComplete?: (url: string) => void;
  className?: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoReady,
  onProcessingComplete,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');

  const {
    uploading,
    processing,
    progress,
    uploadVideo,
    processVideo,
    checkProcessingStatus
  } = useVideoUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadVideo(selectedFile);
    
    if (result.success && result.videoUrl) {
      setPreviewUrl(result.videoUrl);
      onVideoReady?.(result.videoUrl);
    } else {
      alert(`Upload failed: ${result.error}`);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    // Primero subir el video
    const uploadResult = await uploadVideo(selectedFile);
    if (!uploadResult.success || !uploadResult.uploadId) {
      alert(`Upload failed: ${uploadResult.error}`);
      return;
    }

    // Luego procesar
    const processResult = await processVideo(uploadResult.uploadId, {
      resolution: '1080x1920',
      quality: 'high',
      filters: [
        {
          type: 'upscale',
          params: { scale: '2x' }
        }
      ]
    });

    if (processResult.success && processResult.jobId) {
      setJobId(processResult.jobId);
      // Iniciar polling para verificar el estado
      pollProcessingStatus(processResult.jobId);
    } else {
      alert(`Processing failed: ${processResult.error}`);
    }
  };

  const pollProcessingStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      const result = await checkProcessingStatus(jobId);
      
      if (result.success && result.outputUrl) {
        setProcessedUrl(result.outputUrl);
        onProcessingComplete?.(result.outputUrl);
        clearInterval(interval);
      } else if (!result.success) {
        alert(`Processing failed: ${result.error}`);
        clearInterval(interval);
      }
    }, 2000); // Verificar cada 2 segundos
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`video-uploader ${className}`}>
      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: selectedFile ? '#f0f8ff' : '#f9f9f9'
        }}
      >
        {selectedFile ? (
          <div>
            <p>📹 {selectedFile.name}</p>
            <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div>
            <p>📁 Drop a video file here or click to select</p>
            <p>Supported formats: MP4, WebM, MOV</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {previewUrl && (
        <div className="video-preview" style={{ marginTop: '20px' }}>
          <video
            src={previewUrl}
            controls
            style={{ width: '100%', maxWidth: '500px', borderRadius: '8px' }}
          />
        </div>
      )}

      {processedUrl && (
        <div className="processed-video" style={{ marginTop: '20px' }}>
          <h3>✨ Processed Video (Upscaled)</h3>
          <video
            src={processedUrl}
            controls
            style={{ width: '100%', maxWidth: '500px', borderRadius: '8px' }}
          />
        </div>
      )}

      <div className="controls" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>

        <button
          onClick={handleProcess}
          disabled={!selectedFile || uploading || processing}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: processing ? 'not-allowed' : 'pointer',
            opacity: processing ? 0.6 : 1
          }}
        >
          {processing ? 'Processing...' : 'Upload & Process'}
        </button>
      </div>

      {uploading && (
        <div className="progress" style={{ marginTop: '10px' }}>
          <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '20px',
                backgroundColor: '#007bff',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <p>Uploading... {progress}%</p>
        </div>
      )}

      {processing && (
        <div className="processing-status" style={{ marginTop: '10px' }}>
          <p>🔄 Processing video... This may take a few minutes.</p>
          <p>Job ID: {jobId}</p>
        </div>
      )}
    </div>
  );
};
```

### **3. Componente de Galería de Videos**

```typescript
// components/VideoGallery.tsx
import React, { useState, useEffect } from 'react';

interface VideoItem {
  id: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
  processed?: boolean;
  processedUrl?: string;
}

export const VideoGallery: React.FC = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVideos = async () => {
    setLoading(true);
    try {
      // En una implementación real, tendrías un endpoint para listar videos
      // Por ahora, simulamos con videos de ejemplo
      const mockVideos: VideoItem[] = [
        {
          id: '1',
          url: 'https://story.creatorsflow.app/outputs/uploads/sample1.mp4',
          name: 'Sample Video 1',
          size: 1024000,
          uploadedAt: '2025-10-19T10:00:00Z',
          processed: true,
          processedUrl: 'https://story.creatorsflow.app/outputs/processed/sample1_processed.mp4'
        }
      ];
      setVideos(mockVideos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="video-gallery">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📹 Video Gallery</h2>
        <button
          onClick={loadVideos}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {videos.map((video) => (
          <div
            key={video.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <video
                src={video.url}
                controls
                style={{ width: '100%', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{video.name}</h3>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                Size: {formatFileSize(video.size)}
              </p>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                Uploaded: {formatDate(video.uploadedAt)}
              </p>
            </div>

            {video.processed && video.processedUrl && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#28a745' }}>
                  ✨ Processed Version
                </p>
                <video
                  src={video.processedUrl}
                  controls
                  style={{ width: '100%', borderRadius: '4px' }}
                />
              </div>
            )}

            <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
              <button
                onClick={() => window.open(video.url, '_blank')}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🔗 Open Original
              </button>
              
              {video.processed && video.processedUrl && (
                <button
                  onClick={() => window.open(video.processedUrl, '_blank')}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✨ Open Processed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No videos found. Upload your first video to get started!</p>
        </div>
      )}
    </div>
  );
};
```

### **4. Página Principal de la Aplicación**

```typescript
// pages/VideoApp.tsx
import React, { useState } from 'react';
import { VideoUploader } from '../components/VideoUploader';
import { VideoGallery } from '../components/VideoGallery';

export const VideoApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');
  const [recentVideo, setRecentVideo] = useState<string>('');

  const handleVideoReady = (url: string) => {
    setRecentVideo(url);
    setActiveTab('gallery');
  };

  const handleProcessingComplete = (url: string) => {
    setRecentVideo(url);
    setActiveTab('gallery');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>
          🎬 Story Video Processor
        </h1>
        <p style={{ color: '#666', fontSize: '18px' }}>
          Upload, process, and enhance your videos with AI-powered upscaling
        </p>
      </header>

      <nav style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'upload' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'upload' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📤 Upload Video
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'gallery' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'gallery' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🖼️ Video Gallery
          </button>
        </div>
      </nav>

      <main>
        {activeTab === 'upload' && (
          <div>
            <VideoUploader
              onVideoReady={handleVideoReady}
              onProcessingComplete={handleProcessingComplete}
            />
          </div>
        )}

        {activeTab === 'gallery' && (
          <div>
            <VideoGallery />
          </div>
        )}
      </main>

      {recentVideo && (
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '10px' }}>🎉 Recent Upload</h3>
          <video
            src={recentVideo}
            controls
            style={{ width: '100%', maxWidth: '500px', borderRadius: '8px' }}
          />
        </div>
      )}

      <footer style={{ marginTop: '60px', textAlign: 'center', color: '#666' }}>
        <p>Powered by Story API - Video Processing & AI Enhancement</p>
      </footer>
    </div>
  );
};
```

### **5. Configuración de TypeScript**

```typescript
// types/video.ts
export interface VideoUploadOptions {
  resolution?: '720x1280' | '1080x1920' | '1920x1080' | '3840x2160';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  videoBitrate?: string;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow' | 'veryslow';
  crf?: number;
  fps?: number;
  filters?: VideoFilter[];
}

export interface VideoFilter {
  type: 'upscale' | 'brightness' | 'contrast' | 'saturation';
  params: Record<string, any>;
}

export interface VideoUploadResponse {
  success: boolean;
  uploadId?: string;
  filename?: string;
  size?: number;
  videoUrl?: string;
  message?: string;
  error?: string;
}

export interface ProcessingResponse {
  success: boolean;
  jobId?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  outputUrl?: string;
  message?: string;
  error?: string;
}
```

### **6. Configuración de Environment Variables**

```typescript
// config/api.ts
export const API_CONFIG = {
  BASE_URL: 'https://story.creatorsflow.app',
  ENDPOINTS: {
    UPLOAD: '/api/videos/upload',
    UPLOAD_PREVIEW: '/api/upload-preview',
    PROCESS: '/api/v1/jobs',
    STATUS: '/api/v1/jobs'
  },
  TIMEOUT: 30000, // 30 seconds
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  SUPPORTED_FORMATS: ['video/mp4', 'video/webm', 'video/quicktime']
} as const;
```

---

## 🚀 Instalación y Uso

### **1. Instalar Dependencias**
```bash
npm install
# o
yarn install
```

### **2. Importar Componentes**
```typescript
import { VideoUploader } from './components/VideoUploader';
import { VideoGallery } from './components/VideoGallery';
import { useVideoUpload } from './hooks/useVideoUpload';
```

### **3. Usar en tu App**
```typescript
function App() {
  return (
    <div>
      <VideoUploader />
      <VideoGallery />
    </div>
  );
}
```

---

## 🎯 Características Principales

- ✅ **Upload de Videos** - Soporte para MP4, WebM, MOV
- ✅ **Procesamiento** - Upscaling, filtros, ajustes de calidad
- ✅ **CORS Configurado** - Compatible con todos los dominios de Lovable
- ✅ **TypeScript** - Tipado completo
- ✅ **Hooks Personalizados** - Fácil reutilización
- ✅ **Componentes Modulares** - Fácil integración
- ✅ **Manejo de Errores** - Robusto y user-friendly
- ✅ **Responsive** - Funciona en móviles y desktop

---

**¡Listo para usar en Lovable! 🎬✨**










