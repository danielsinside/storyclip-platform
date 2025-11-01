import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVideoUrls } from '@/lib/videoStore';

interface VideoPlayerProps {
  uploadId?: string;
  videoUrl?: string | null;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  style?: React.CSSProperties;
  onLoadSuccess?: () => void;
  onLoadError?: (error: string) => void;
}

export function VideoPlayer({
  uploadId,
  videoUrl,
  className = '',
  autoPlay = false,
  muted = true,
  controls = true,
  loop = false,
  style,
  onLoadSuccess,
  onLoadError,
}: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const MAX_RETRIES = 3;
  
  // Usar el store global para obtener las URLs estables
  const { 
    currentVideoUrl, 
    originalUrl, 
    filteredPreviewUrl, 
    setOriginalUrl, 
    setCurrentJobId 
  } = useVideoUrls();

  // Determinar la URL del video usando el sistema estable
  useEffect(() => {
    console.log('🔍 VideoPlayer - Determining video URL...');
    console.log('📹 Props videoUrl:', videoUrl);
    console.log('🆔 Props uploadId:', uploadId);
    console.log('🎬 Store currentVideoUrl:', currentVideoUrl);
    console.log('🎬 Store originalUrl:', originalUrl);
    console.log('🎬 Store filteredPreviewUrl:', filteredPreviewUrl);

    // Si se proporciona videoUrl desde props (después del upload), establecerlo como originalUrl
    if (videoUrl && !originalUrl) {
      console.log('✅ Setting originalUrl from props:', videoUrl);
      setOriginalUrl(videoUrl);
      
      // Si el uploadId parece ser un jobId, establecerlo también
      if (uploadId && uploadId.startsWith('job_')) {
        setCurrentJobId(uploadId);
      }
    }
    
    // Determinar qué URL usar: props videoUrl tiene prioridad sobre store
    const finalVideoUrl = videoUrl || currentVideoUrl;
    
    // Si no hay URL disponible, mostrar error
    if (!finalVideoUrl) {
      console.warn('⚠️ No video URL available');
      console.warn('⚠️ Props videoUrl:', videoUrl);
      console.warn('⚠️ Store currentVideoUrl:', currentVideoUrl);
      console.warn('⚠️ Store originalUrl:', originalUrl);
      console.warn('⚠️ Store filteredPreviewUrl:', filteredPreviewUrl);
      setError('No se pudo determinar la URL del video');
      setIsLoading(false);
    } else {
      console.log('✅ Using video URL:', finalVideoUrl);
      setError(null);
      setIsLoading(true);
    }
  }, [videoUrl, uploadId, currentVideoUrl, originalUrl, filteredPreviewUrl, setOriginalUrl, setCurrentJobId]);

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    const finalVideoUrl = videoUrl || currentVideoUrl;
    console.log('📊 Video metadata loaded:', finalVideoUrl);
    if (videoRef.current) {
      console.log('📊 Video metadata:', {
        duration: videoRef.current.duration,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        currentTime: videoRef.current.currentTime
      });
    }
  };

  // Handle video can play
  const handleCanPlay = () => {
    const finalVideoUrl = videoUrl || currentVideoUrl;
    console.log('🎬 Video can play:', finalVideoUrl);
    console.log('🎬 Video ready state:', videoRef.current?.readyState);
    
    // Force video to play and render
    if (videoRef.current) {
      console.log('🎬 Forcing video to play...');
      videoRef.current.play().catch(err => {
        console.warn('⚠️ Autoplay failed:', err);
      });
    }
  };

  // Handle video load success
  const handleLoadedData = () => {
    const finalVideoUrl = videoUrl || currentVideoUrl;
    console.log('✅ Video loaded successfully:', finalVideoUrl);
    console.log('✅ Video element:', videoRef.current);
    console.log('✅ Video dimensions:', {
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight,
      clientWidth: videoRef.current?.clientWidth,
      clientHeight: videoRef.current?.clientHeight
    });
    setIsLoading(false);
    setError(null);
    setRetryCount(0);
    onLoadSuccess?.();
  };

  // Handle video load error
  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.currentTarget;
    const finalVideoUrl = videoUrl || currentVideoUrl;
    
    // Get detailed error information
    const errorCode = videoElement.error?.code;
    const errorMessage = videoElement.error?.message;
    const networkState = videoElement.networkState;
    
    // Network states: 0 = EMPTY, 1 = IDLE, 2 = LOADING, 3 = NO_SOURCE
    const networkStateText = ['EMPTY', 'IDLE', 'LOADING', 'NO_SOURCE'][networkState] || 'UNKNOWN';
    
    console.error('❌ Video load error:', {
      url: finalVideoUrl,
      networkState: `${networkState} (${networkStateText})`,
      readyState: videoElement.readyState,
      errorCode,
      errorMessage,
    });

    // Build user-friendly error message
    let userErrorMessage = 'Error al cargar el video';
    
    if (networkState === 3) {
      userErrorMessage = 'El video no está disponible. Posibles causas:\n• El archivo fue eliminado del servidor\n• El servidor de videos está inactivo\n• Intenta volver a subir el video';
    } else if (errorCode === 4) {
      userErrorMessage = 'El formato del video no es compatible con tu navegador.';
    } else if (errorCode === 3) {
      userErrorMessage = 'Error de decodificación del video. El archivo podría estar corrupto.';
    } else if (errorCode === 2) {
      userErrorMessage = 'Error de red al cargar el video. Verifica tu conexión.';
    }
    
    const fullErrorMessage = `${userErrorMessage} (intento ${retryCount + 1}/${MAX_RETRIES})`;
    setError(fullErrorMessage);
    setIsLoading(false);
    onLoadError?.(fullErrorMessage);

    // Auto-retry logic (only for network errors)
    if (retryCount < MAX_RETRIES && (networkState === 2 || errorCode === 2)) {
      console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoading(true);
        setError(null);
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 1000 * (retryCount + 1)); // Exponential backoff
    }
  };

  // Manual retry function
  const handleManualRetry = () => {
    console.log('🔄 Manual retry initiated');
    setRetryCount(0);
    setIsLoading(true);
    setError(null);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (!videoUrl && !currentVideoUrl) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No se pudo determinar la URL del video. Verifica que el archivo fue subido correctamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className} style={style}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando video...</p>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            <details className="text-xs opacity-70">
              <summary className="cursor-pointer">Detalles técnicos</summary>
              <p className="mt-1">URL: {videoUrl || currentVideoUrl}</p>
            </details>
            {retryCount >= MAX_RETRIES && (
              <Button onClick={handleManualRetry} variant="outline" size="sm" className="w-fit mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <video
        ref={videoRef}
        src={videoUrl || currentVideoUrl}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        loop={loop}
        style={{
          backgroundColor: 'transparent',
          display: 'block'
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={handleLoadedData}
        onCanPlay={handleCanPlay}
        onError={handleError}
        playsInline
      />
    </div>
  );
}
