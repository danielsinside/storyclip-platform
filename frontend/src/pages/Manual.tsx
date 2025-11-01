import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useVideoSession } from '@/hooks/useVideoSession';
import { api } from '@/lib/api';
import { processVideo } from '@/lib/storyclipV2';
import type { ProcessVideoRequest } from '@/lib/storyclipV2';
import { Sparkles, ArrowLeft, RefreshCw, Wand2, Volume2, Hash, Download, Save, Eye, FlipHorizontal, Music, ZoomIn, Move, ArrowUpDown, RotateCw, Camera, Zap, Clock, AlertTriangle, Loader2, Info } from 'lucide-react';
import type { SeedType, DelayMode } from '@/types';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoDebug } from '@/components/VideoDebug';
import { useVideoUrls } from '@/lib/videoStore';
import { useFilters } from '@/hooks/useFilters';
export default function Manual() {
  const {
    uploadId
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  
  // Usar el store global para URLs de video estables
  const {
    originalUrl,
    filteredPreviewUrl,
    hasFilteredPreview,
    setOriginalUrl,
    setCurrentJobId,
    clearFilteredPreview
  } = useVideoUrls();
  
  // Hook para aplicar filtros
  const { 
    applyFilter, 
    resetFilters, 
    isApplyingFilter, 
    hasFilteredPreview: hasFilteredPreviewFromHook,
    currentJobId 
  } = useFilters();
  
  // State for processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Get video metadata from navigation state
  const locationState = location.state as {
    duration?: number;
    filename?: string;
    filesize?: number;
    videoUrl?: string;
  } || {};
  const {
    duration,
    filename,
    filesize,
    videoUrl: initialVideoUrl
  } = locationState;

  // Initialize session hook
  const {
    sessionData,
    isLoading: isLoadingSession,
    isSaving,
    saveSession,
    completeSession
  } = useVideoSession(uploadId);

  // Use videoUrl from multiple sources with localStorage as backup
  const getVideoUrl = () => {
    // Priority 1: Session data
    if (sessionData?.videoUrl) return sessionData.videoUrl;
    
    // Priority 2: Location state
    if (initialVideoUrl) return initialVideoUrl;
    
    // Priority 3: localStorage
    if (uploadId) {
      const cachedUrl = localStorage.getItem(`videoUrl_${uploadId}`);
      if (cachedUrl) {
        console.log('📦 Using cached videoUrl from localStorage:', cachedUrl);
        return cachedUrl;
      }
      
      // Priority 4: Construct URL based on uploadId format
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://story.creatorsflow.app';
      
      if (uploadId.startsWith('job_')) {
        // New stable media system
        const constructedUrl = `${origin}/media/${uploadId}/source.mp4`;
        console.log('🔧 Constructed videoUrl from jobId (stable media):', constructedUrl);
        return constructedUrl;
      } else {
        // Legacy system - use outputs/uploads
        const constructedUrl = `${origin}/outputs/uploads/${uploadId}.mp4`;
        console.log('🔧 Constructed videoUrl from uploadId (legacy system):', constructedUrl);
        return constructedUrl;
      }
    }
    
    return null;
  };
  
  const videoUrl = getVideoUrl();
  
  // Establecer originalUrl cuando se carga la página
  useEffect(() => {
    if (videoUrl && !originalUrl) {
      console.log('🎬 Setting originalUrl from Manual page:', videoUrl);
      setOriginalUrl(videoUrl);
      // Limpiar cualquier preview filtrado obsoleto cuando se carga un nuevo video
      clearFilteredPreview();
    }
    if (uploadId) {
      setCurrentJobId(uploadId);
    }
  }, [videoUrl, originalUrl, setOriginalUrl, uploadId, setCurrentJobId, clearFilteredPreview]);

  // Get video duration from multiple sources with priority system
  const getDuration = () => {
    // Priority 1: Session data (from database)
    if (sessionData?.duration) return sessionData.duration;
    
    // Priority 2: Location state (when navigating from Upload)
    if (duration) return duration;
    
    // Priority 3: localStorage (backup/cache)
    if (uploadId) {
      const cachedDuration = localStorage.getItem(`duration_${uploadId}`);
      if (cachedDuration) {
        console.log('📦 Using cached duration from localStorage:', cachedDuration);
        return parseFloat(cachedDuration);
      }
    }
    
    return null;
  };

  const videoDuration = getDuration();

  // Save videoUrl and duration to localStorage and debug log
  useEffect(() => {
    console.log('📹 Manual page - videoUrl:', videoUrl);
    console.log('⏱️ Manual page - videoDuration:', videoDuration);
    console.log('📊 Manual page - sessionData:', sessionData);
    console.log('🆔 Manual page - uploadId:', uploadId);
    
    // Save to localStorage for persistence
    if (videoUrl && uploadId) {
      console.log('💾 Saving videoUrl to localStorage:', videoUrl);
      localStorage.setItem(`videoUrl_${uploadId}`, videoUrl);
    }

    if (videoDuration && uploadId) {
      console.log('💾 Saving duration to localStorage:', videoDuration);
      localStorage.setItem(`duration_${uploadId}`, videoDuration.toString());
    }
    
    if (!videoUrl && uploadId && !isLoadingSession) {
      console.warn('⚠️ videoUrl no disponible después de cargar la sesión');
      console.warn('⚠️ Session video_url:', sessionData?.videoUrl);
      console.warn('⚠️ Location state videoUrl:', initialVideoUrl);
      console.warn('⚠️ localStorage videoUrl:', localStorage.getItem(`videoUrl_${uploadId}`));
    }
    
    if (videoUrl) {
      console.log('✅ Video URL disponible:', videoUrl);
    }
  }, [videoUrl, videoDuration, uploadId, sessionData, isLoadingSession, initialVideoUrl]);

  // Form state
  const [seed, setSeed] = useState<SeedType>('natural');
  const [delayMode, setDelayMode] = useState<DelayMode>('NATURAL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [ambientNoise, setAmbientNoise] = useState(false);
  const [amplitude, setAmplitude] = useState(1.0);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(59);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

  // Audio originality settings
  const [audioUnique, setAudioUnique] = useState(false);
  const [audioMode, setAudioMode] = useState<'suave' | 'medio' | 'fuerte' | 'personalizado'>('medio');
  const [audioScope, setAudioScope] = useState<'clip' | 'creator' | 'pagina'>('clip');
  const [audioSeed, setAudioSeed] = useState<string>('auto');
  const [isGeneratingAudioProfile, setIsGeneratingAudioProfile] = useState(false);

  // Clip indicators
  const [clipIndicator, setClipIndicator] = useState<'none' | 'temporal' | 'permanent'>('none');
  const [indicatorPosition, setIndicatorPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [indicatorSize, setIndicatorSize] = useState(75);
  const [indicatorTextColor, setIndicatorTextColor] = useState('#ffffff');
  const [indicatorBgColor, setIndicatorBgColor] = useState('#000000');
  const [indicatorOpacity, setIndicatorOpacity] = useState(0.7);
  const [indicatorStyle, setIndicatorStyle] = useState<'simple' | 'badge' | 'rounded'>('badge');

  // Filtros visuales
  const [filterType, setFilterType] = useState<'none' | 'vintage' | 'vivid' | 'cool' | 'warm' | 'bw' | 'ai-custom'>('none');
  const [filterIntensity, setFilterIntensity] = useState(50);
  const [customFilterCSS, setCustomFilterCSS] = useState('');
  const [customFilterName, setCustomFilterName] = useState('');
  const [isGeneratingFilter, setIsGeneratingFilter] = useState(false);

  // Overlays animados
  const [overlayType, setOverlayType] = useState<'none' | 'particles' | 'sparkles' | 'glitch' | 'vhs' | 'bokeh' | 'light-leak' | 'film-grain' | 'chromatic' | 'lens-flare' | 'rain' | 'matrix' | 'dna' | 'hexagon' | 'wave' | 'ai-custom'>('none');
  const [overlayIntensity, setOverlayIntensity] = useState(50);
  const [customOverlayName, setCustomOverlayName] = useState('');
  const [customOverlayConfig, setCustomOverlayConfig] = useState<any>(null);
  const [isGeneratingOverlay, setIsGeneratingOverlay] = useState(false);
  const [isGeneratingIndicator, setIsGeneratingIndicator] = useState(false);
  const [isGeneratingCameraMovement, setIsGeneratingCameraMovement] = useState(false);

  // Visual transformations
  const [horizontalFlip, setHorizontalFlip] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(false);
  const [cameraZoomDuration, setCameraZoomDuration] = useState(8.0);
  const [cameraPan, setCameraPan] = useState(false);
  const [cameraTilt, setCameraTilt] = useState(false);
  const [cameraRotate, setCameraRotate] = useState(false);
  const [cameraDolly, setCameraDolly] = useState(false);
  const [cameraShake, setCameraShake] = useState(false);

  // Video distribution configuration
  const [clipDuration, setClipDuration] = useState<number>(59);
  const [clipCount, setClipCount] = useState<number>(1);
  const [manualClips, setManualClips] = useState<Array<{
    start: number;
    end: number;
  }>>([{
    start: 0,
    end: 59
  }]);

  // Comparison modal
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // Force re-render of modal videos when effects change
  useEffect(() => {
    if (showComparisonModal) {
      // The key changes will automatically trigger re-render
      console.log('🔄 Effects updated, modal videos will sync');
    }
  }, [showComparisonModal, horizontalFlip, cameraZoom, cameraPan, cameraTilt, cameraRotate, cameraDolly, cameraShake, filterType, filterIntensity, overlayType, overlayIntensity]);

  // Helper function to generate clips distribution with automatic remaining time distribution
  const generateClipsDistribution = (dur: number, count: number) => {
    const currentDuration = getDuration();
    const MAX_CLIPS = 50; // Límite de Facebook
    const MAX_CLIP_DURATION = 60; // Máximo 60 segundos por clip

    // Validar límites
    if (count > MAX_CLIPS) {
      toast({
        title: "Límite excedido",
        description: `Facebook solo permite 50 clips máximo. Ajustando a 50 clips.`,
        variant: "destructive"
      });
      count = MAX_CLIPS;
      setClipCount(MAX_CLIPS);
    }

    if (dur > MAX_CLIP_DURATION) {
      toast({
        title: "Duración excedida",
        description: `La duración máxima por clip es 60s. Ajustando a 60s.`,
        variant: "destructive"
      });
      dur = MAX_CLIP_DURATION;
      setClipDuration(MAX_CLIP_DURATION);
    }

    const clips: Array<{
      start: number;
      end: number;
    }> = [];
    let currentStart = 0;

    // Si no tenemos duración del video, usar distribución simple
    if (!currentDuration) {
      for (let i = 0; i < count; i++) {
        const end = currentStart + dur;
        clips.push({
          start: currentStart,
          end
        });
        currentStart = end;
      }
      setManualClips(clips);
      return;
    }

    // Calcular distribución inteligente
    const totalRequestedTime = dur * count;

    if (totalRequestedTime <= currentDuration) {
      // Caso 1: El tiempo solicitado NO cubre todo el video
      // Distribuir el tiempo restante entre los últimos 2-5 clips

      const remainingTime = currentDuration - totalRequestedTime;

      // Determinar cuántos clips usar para la distribución (2-5, dependiendo del tiempo restante)
      let clipsForDistribution = 1;
      if (remainingTime > 5 && count >= 2) clipsForDistribution = 2;
      if (remainingTime > 10 && count >= 3) clipsForDistribution = 3;
      if (remainingTime > 20 && count >= 4) clipsForDistribution = 4;
      if (remainingTime > 30 && count >= 5) clipsForDistribution = 5;

      // Calcular tiempo extra por clip para los últimos clips
      const extraTimePerClip = remainingTime / clipsForDistribution;

      // Generar clips normales hasta los últimos N
      const normalClipsCount = count - clipsForDistribution;
      for (let i = 0; i < normalClipsCount; i++) {
        const end = currentStart + dur;
        clips.push({
          start: currentStart,
          end
        });
        currentStart = end;
      }

      // Generar los últimos N clips con tiempo extra distribuido
      for (let i = 0; i < clipsForDistribution; i++) {
        const adjustedDuration = Math.min(dur + extraTimePerClip, MAX_CLIP_DURATION);
        const end = Math.min(currentStart + adjustedDuration, currentDuration);
        clips.push({
          start: currentStart,
          end
        });
        currentStart = end;
      }

      setManualClips(clips);

      // Mostrar mensaje informativo sobre la distribución
      if (remainingTime > 0.5) {
        toast({
          title: "Distribución optimizada",
          description: `${remainingTime.toFixed(1)}s distribuidos en los últimos ${clipsForDistribution} clip${clipsForDistribution > 1 ? 's' : ''} para cubrir el 100% del video.`,
        });
      }
    } else {
      // Caso 2: El tiempo solicitado EXCEDE el video
      // Distribuir equitativamente sin exceder la duración del video
      for (let i = 0; i < count; i++) {
        const end = Math.min(currentStart + dur, currentDuration);

        if (currentStart >= currentDuration) {
          break; // Ya cubrimos todo el video
        }

        clips.push({
          start: currentStart,
          end
        });
        currentStart = end;
      }

      setManualClips(clips);

      if (clips.length < count) {
        toast({
          title: "Clips ajustados",
          description: `Se generaron ${clips.length} clips de ${count} solicitados (video completo cubierto)`,
        });
        setClipCount(clips.length);
      }
    }
  };

  // Helper function to generate fixed duration distribution
  const generateFixedDurationDistribution = (fixedDuration: number) => {
    const currentDuration = getDuration();
    
    if (!currentDuration) {
      toast({
        title: "Error",
        description: "No se puede calcular sin duración del video",
        variant: "destructive"
      });
      return;
    }
    const clips: Array<{
      start: number;
      end: number;
    }> = [];
    let currentStart = 0;
    const MAX_CLIPS = 50; // Límite de Facebook

    while (currentStart < currentDuration && clips.length < MAX_CLIPS) {
      const end = Math.min(currentStart + fixedDuration, currentDuration);
      clips.push({
        start: currentStart,
        end
      });
      currentStart = end;
    }
    setManualClips(clips);
    setClipCount(clips.length);
    setClipDuration(fixedDuration);
    if (clips.length === MAX_CLIPS) {
      toast({
        title: "Límite alcanzado",
        description: `Se generaron ${MAX_CLIPS} clips de ${fixedDuration}s (límite de Facebook para 24hr)`
      });
    } else {
      toast({
        title: "Distribución generada",
        description: `Se generaron ${clips.length} clips de ${fixedDuration}s`
      });
    }
  };

  // Helper function to render distribution summary
  const renderDistributionSummary = () => {
    const currentDuration = getDuration();
    if (!currentDuration) return null;

    // Calcular duración REAL de los clips (no asumir todos iguales)
    const totalClipsDuration = manualClips.reduce((sum, clip) => sum + (clip.end - clip.start), 0);
    const remainingTime = currentDuration - totalClipsDuration;
    const coveragePercent = ((totalClipsDuration / currentDuration) * 100).toFixed(1);

    // Verificar si el último clip excede 60s
    const lastClip = manualClips[manualClips.length - 1];
    const lastClipDuration = lastClip ? (lastClip.end - lastClip.start) : 0;

    // Considerar "completo" si quedan menos de 0.5s sin cubrir (tolerancia por redondeo)
    if (remainingTime > 0.5) {
      return <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                ⚠️ Tiempo sin cubrir detectado
              </p>
              <div className="mt-2 space-y-1 text-blue-700 dark:text-blue-300">
                <p>📊 Video total: {currentDuration}s</p>
                <p>✂️ Clips actuales: {totalClipsDuration}s ({coveragePercent}% cubierto)</p>
                <p>⏱️ Tiempo restante: {remainingTime.toFixed(1)}s</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={() => {
                // Calcular distribución óptima
                const optimalCount = Math.min(
                  Math.ceil(currentDuration / clipDuration),
                  50 // Límite de Facebook
                );
                setClipCount(optimalCount);
                generateClipsDistribution(clipDuration, optimalCount);
              }}>
                ✨ Distribuir automáticamente
              </Button>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                💡 El último clip se ajustará automáticamente para cubrir el tiempo restante (máx 60s)
              </p>
            </div>
          </div>
        </div>;
    }

    // Video completamente cubierto
    const videoMinutes = Math.floor(currentDuration / 60);
    const videoSeconds = currentDuration % 60;
    const videoTimeDisplay = videoMinutes > 0 ? `${videoMinutes}min ${videoSeconds}s` : `${currentDuration}s`;

    return <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="text-sm space-y-2">
          <p className="font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
            ✅ Video completamente cubierto
          </p>
          <div className="text-green-700 dark:text-green-300 space-y-1">
            <p>📊 Video total: {videoTimeDisplay}</p>
            <p>✂️ {manualClips.length} clips • {totalClipsDuration}s ({coveragePercent}% cubierto)</p>
            {lastClipDuration > 60 && (
              <p className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                ⚠️ Último clip: {lastClipDuration.toFixed(1)}s (excede 60s)
              </p>
            )}
            {lastClipDuration <= 60 && lastClipDuration > 0 && (
              <p>🎬 Último clip: {lastClipDuration.toFixed(1)}s</p>
            )}
          </div>
          {manualClips.length > 50 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-2">
              <AlertTriangle className="w-3 h-3" />
              Excede límite de Facebook (50 stories/24hr)
            </p>
          )}
        </div>
      </div>;
  };

  // Load session data when available
  useEffect(() => {
    if (sessionData && !isLoadingSession) {
      console.log('Loading session data into state:', sessionData);

      // Set all state from session
      if (sessionData.seed) setSeed(sessionData.seed as SeedType);
      if (sessionData.delayMode) setDelayMode(sessionData.delayMode as DelayMode);
      if (sessionData.title) setTitle(sessionData.title);
      if (sessionData.description) setDescription(sessionData.description);
      if (sessionData.keywords) setKeywords(sessionData.keywords);
      if (sessionData.ambientNoise !== undefined) setAmbientNoise(sessionData.ambientNoise);
      if (sessionData.amplitude !== undefined) setAmplitude(sessionData.amplitude);
      if (sessionData.cutStart !== undefined) setCutStart(sessionData.cutStart);
      if (sessionData.cutEnd !== undefined) setCutEnd(sessionData.cutEnd);
      if (sessionData.audioUnique !== undefined) setAudioUnique(sessionData.audioUnique);
      if (sessionData.audioMode) setAudioMode(sessionData.audioMode as any);
      if (sessionData.audioScope) setAudioScope(sessionData.audioScope as any);
      if (sessionData.audioSeed) setAudioSeed(sessionData.audioSeed);
      if (sessionData.clipIndicator) setClipIndicator(sessionData.clipIndicator as any);
      if (sessionData.indicatorPosition) setIndicatorPosition(sessionData.indicatorPosition as any);
      if (sessionData.indicatorSize !== undefined) setIndicatorSize(sessionData.indicatorSize);
      if (sessionData.indicatorTextColor) setIndicatorTextColor(sessionData.indicatorTextColor);
      if (sessionData.indicatorBgColor) setIndicatorBgColor(sessionData.indicatorBgColor);
      if (sessionData.indicatorOpacity !== undefined) setIndicatorOpacity(sessionData.indicatorOpacity);
      if (sessionData.indicatorStyle) setIndicatorStyle(sessionData.indicatorStyle as any);
      if (sessionData.filterType) setFilterType(sessionData.filterType as any);
      if (sessionData.filterIntensity !== undefined) setFilterIntensity(sessionData.filterIntensity);
      if (sessionData.customFilterCss) setCustomFilterCSS(sessionData.customFilterCss);
      if (sessionData.customFilterName) setCustomFilterName(sessionData.customFilterName);
      if (sessionData.overlayType) setOverlayType(sessionData.overlayType as any);
      if (sessionData.overlayIntensity !== undefined) setOverlayIntensity(sessionData.overlayIntensity);
      if (sessionData.customOverlayName) setCustomOverlayName(sessionData.customOverlayName);
      if (sessionData.customOverlayConfig) setCustomOverlayConfig(sessionData.customOverlayConfig);
      if (sessionData.horizontalFlip !== undefined) setHorizontalFlip(sessionData.horizontalFlip);
      if (sessionData.cameraZoom !== undefined) setCameraZoom(sessionData.cameraZoom);
      if (sessionData.cameraZoomDuration !== undefined) setCameraZoomDuration(sessionData.cameraZoomDuration);
      if (sessionData.cameraPan !== undefined) setCameraPan(sessionData.cameraPan);
      if (sessionData.cameraTilt !== undefined) setCameraTilt(sessionData.cameraTilt);
      if (sessionData.cameraRotate !== undefined) setCameraRotate(sessionData.cameraRotate);
      if (sessionData.cameraDolly !== undefined) setCameraDolly(sessionData.cameraDolly);
      if (sessionData.cameraShake !== undefined) setCameraShake(sessionData.cameraShake);

      // Load manual clips if available
      if (sessionData.manualClips && Array.isArray(sessionData.manualClips)) {
        const clips = sessionData.manualClips;
        setManualClips(clips);
        if (clips.length > 0) {
          setClipDuration(clips[0].end - clips[0].start);
          setClipCount(clips.length);
        }
      }
    }
  }, [sessionData, isLoadingSession]);

  // Save initial session when coming from Preset page with videoUrl
  useEffect(() => {
    if (!uploadId || isLoadingSession || isSaving) return;
    if (sessionData) return; // Already has session data
    if (!initialVideoUrl) return; // No video URL from navigation

    console.log('Creating initial session with videoUrl:', initialVideoUrl);

    // Use the video URL as-is from the upload response
    const videoUrl = initialVideoUrl;

    // Create initial session with the video URL as-is
    saveSession({
      filename,
      filesize,
      duration,
      videoUrl: videoUrl,
      seed,
      delayMode,
      title,
      description,
      keywords,
      ambientNoise,
      amplitude,
      cutStart,
      cutEnd,
      audioUnique,
      audioMode,
      audioScope,
      audioSeed,
      clipIndicator,
      indicatorPosition,
      indicatorSize,
      indicatorTextColor,
      indicatorBgColor,
      indicatorOpacity,
      indicatorStyle,
      filterType,
      filterIntensity,
      customFilterCss: customFilterCSS,
      customFilterName,
      overlayType,
      overlayIntensity,
      customOverlayName,
      customOverlayConfig,
      horizontalFlip,
      cameraZoom,
      cameraZoomDuration,
      cameraPan,
      cameraTilt,
      cameraRotate,
      cameraDolly,
      cameraShake,
      manualClips,
      status: 'configuring'
    });
  }, [uploadId, isLoadingSession, sessionData, initialVideoUrl]); // Removed isSaving and saveSession to prevent loop

  // Auto-save session when state changes
  useEffect(() => {
    if (!uploadId || isLoadingSession) return;
    const timeoutId = setTimeout(() => {
      saveSession({
        filename,
        filesize,
        duration,
        videoUrl: videoUrl || undefined,
        seed,
        delayMode,
        title,
        description,
        keywords,
        ambientNoise,
        amplitude,
        cutStart,
        cutEnd,
        audioUnique,
        audioMode,
        audioScope,
        audioSeed,
        clipIndicator,
        indicatorPosition,
        indicatorSize,
        indicatorTextColor,
        indicatorBgColor,
        indicatorOpacity,
        indicatorStyle,
        filterType,
        filterIntensity,
        customFilterCss: customFilterCSS,
        customFilterName,
        overlayType,
        overlayIntensity,
        customOverlayName,
        customOverlayConfig,
        horizontalFlip,
        cameraZoom,
        cameraZoomDuration,
        cameraPan,
        cameraTilt,
        cameraRotate,
        cameraDolly,
        cameraShake,
        manualClips,
        status: 'configuring'
      });
    }, 1000); // Debounce auto-save by 1 second

    return () => clearTimeout(timeoutId);
  }, [uploadId, isLoadingSession, filename, filesize, duration, videoUrl, seed, delayMode, title, description, keywords, ambientNoise, amplitude, cutStart, cutEnd, audioUnique, audioMode, audioScope, audioSeed, clipIndicator, indicatorPosition, indicatorSize, indicatorTextColor, indicatorBgColor, indicatorOpacity, indicatorStyle, filterType, filterIntensity, customFilterCSS, customFilterName, overlayType, overlayIntensity, customOverlayName, customOverlayConfig, horizontalFlip, cameraZoom, cameraZoomDuration, cameraPan, cameraTilt, cameraRotate, cameraDolly, cameraShake, manualClips, saveSession]);
  useEffect(() => {
    if (uploadId && filename) {
      generateMetadata();
    }
  }, [uploadId, filename]);
  const generateMetadata = async () => {
    if (!uploadId) return;
    setIsGeneratingMetadata(true);
    try {
      // Check if Supabase is configured
      if (!import.meta.env.VITE_SUPABASE_URL) {
        throw new Error('Supabase not configured');
      }

      // Call edge function to generate metadata suggestions
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-preset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uploadId: uploadId,
          filename: filename || 'video.mp4',
          filesize: filesize || null,
          duration: duration || 60
        })
      });
      if (!response.ok) {
        throw new Error('Failed to generate metadata');
      }
      const aiPreset = await response.json();

      // Set the AI-generated metadata
      if (aiPreset.metadata) {
        setTitle(aiPreset.metadata.title || '');
        setDescription(aiPreset.metadata.description || '');
        setKeywords(aiPreset.metadata.keywords || '');
      }
      toast({
        title: 'Metadatos sugeridos',
        description: 'La IA ha generado sugerencias basadas en tu video. Puedes editarlos libremente.'
      });
    } catch (error) {
      console.error('Error generating metadata:', error);
      // Set fallback metadata based on filename
      const cleanFilename = filename?.replace(/\.[^/.]+$/, '') || 'Mi Video';
      setTitle(cleanFilename);
      setDescription(`Contenido increíble de ${cleanFilename}`);
      setKeywords('#viral, #trending, #contenido');
    } finally {
      setIsGeneratingMetadata(false);
    }
  };
  const generateAudioProfile = async () => {
    setIsGeneratingAudioProfile(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: filename || 'video.mp4',
          duration: duration || 60,
          mode: audioMode,
          scope: audioScope
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Audio profile generation failed:', response.status, errorText);
        throw new Error(`Failed to generate audio profile: ${response.status}`);
      }
      const profile = await response.json();
      console.log('Generated audio profile:', profile);
      setAmbientNoise(profile.ambientNoise);
      setAmplitude(profile.amplitude);
      toast({
        title: '✨ Perfil de audio generado',
        description: profile.explanation || `Configuración optimizada para modo ${audioMode}`
      });
    } catch (error) {
      console.error('Error generating audio profile:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar el perfil de audio',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingAudioProfile(false);
    }
  };
  const generateAIFilter = async () => {
    setIsGeneratingFilter(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar filtro');
      }
      const filterData = await response.json();
      console.log('AI Filter generated:', filterData);
      setCustomFilterCSS(filterData.filter);
      setCustomFilterName(filterData.name);
      setFilterType('ai-custom');
      setFilterIntensity(filterData.intensity);
      toast({
        title: `✨ ${filterData.name}`,
        description: filterData.description
      });
    } catch (error) {
      console.error('Error generating AI filter:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar el filtro',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingFilter(false);
    }
  };
  const generateAIOverlay = async () => {
    setIsGeneratingOverlay(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-overlay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar overlay');
      }
      const overlayData = await response.json();
      console.log('AI Overlay generated:', overlayData);
      setCustomOverlayConfig(overlayData);
      setCustomOverlayName(overlayData.name);
      setOverlayType('ai-custom');
      setOverlayIntensity(overlayData.intensity);
      toast({
        title: `✨ ${overlayData.name}`,
        description: overlayData.description
      });
    } catch (error) {
      console.error('Error generating AI overlay:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar el overlay',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingOverlay(false);
    }
  };
  const generateAIIndicator = async () => {
    setIsGeneratingIndicator(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-clip-indicator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar indicador');
      }
      const indicatorData = await response.json();
      console.log('AI Indicator generated:', indicatorData);
      setClipIndicator(indicatorData.type as any);
      setIndicatorPosition(indicatorData.position as any);
      setIndicatorSize(indicatorData.size);
      setIndicatorTextColor(indicatorData.textColor);
      setIndicatorBgColor(indicatorData.bgColor);
      setIndicatorOpacity(indicatorData.opacity);
      setIndicatorStyle(indicatorData.style as any);
      toast({
        title: `✨ ${indicatorData.name}`,
        description: indicatorData.description
      });
    } catch (error) {
      console.error('Error generating AI indicator:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar el indicador',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingIndicator(false);
    }
  };
  const generateAICameraMovement = async () => {
    setIsGeneratingCameraMovement(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-camera-movement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar movimiento');
      }
      const movementData = await response.json();
      console.log('AI Camera Movement generated:', movementData);

      // Apply all generated camera movements
      setCameraZoom(movementData.zoom || false);
      setCameraZoomDuration(movementData.zoomDuration || 8.0);
      setCameraPan(movementData.pan || false);
      setCameraTilt(movementData.tilt || false);
      setCameraRotate(movementData.rotate || false);
      setCameraDolly(movementData.dolly || false);
      setCameraShake(movementData.shake || false);
      toast({
        title: `✨ ${movementData.name}`,
        description: movementData.description
      });
    } catch (error) {
      console.error('Error generating AI camera movement:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar el movimiento',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingCameraMovement(false);
    }
  };
  const downloadPreview = () => {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#a855f7');
    gradient.addColorStop(1, '#ec4899');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw VIDEO text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'bold 240px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VIDEO', canvas.width / 2, canvas.height / 2);

    // Setup font for measuring
    ctx.font = `bold ${indicatorSize}px Arial`;
    const metrics = ctx.measureText('5');

    // Calculate indicator position (center point)
    const padding = 60;
    const positions: Record<string, {
      x: number;
      y: number;
    }> = {
      'top-left': {
        x: padding,
        y: padding
      },
      'top-right': {
        x: canvas.width - padding,
        y: padding
      },
      'bottom-left': {
        x: padding,
        y: canvas.height - padding
      },
      'bottom-right': {
        x: canvas.width - padding,
        y: canvas.height - padding
      }
    };
    let pos = positions[indicatorPosition];

    // Draw background and calculate text center based on style
    if (indicatorStyle !== 'simple') {
      const bgColor = indicatorBgColor + Math.round(indicatorOpacity * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = bgColor;
      if (indicatorStyle === 'badge') {
        const badgeW = metrics.width + 40;
        const badgeH = indicatorSize + 20;

        // Calculate badge position
        let badgeX, badgeY;
        if (indicatorPosition === 'top-left') {
          badgeX = pos.x;
          badgeY = pos.y;
        } else if (indicatorPosition === 'top-right') {
          badgeX = pos.x - badgeW;
          badgeY = pos.y;
        } else if (indicatorPosition === 'bottom-left') {
          badgeX = pos.x;
          badgeY = pos.y - badgeH;
        } else {
          badgeX = pos.x - badgeW;
          badgeY = pos.y - badgeH;
        }
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

        // Center text in badge
        pos = {
          x: badgeX + badgeW / 2,
          y: badgeY + badgeH / 2
        };
      } else if (indicatorStyle === 'rounded') {
        const radius = Math.max(metrics.width, indicatorSize) / 2 + 20;

        // Calculate circle center
        let circleX, circleY;
        if (indicatorPosition === 'top-left') {
          circleX = pos.x + radius;
          circleY = pos.y + radius;
        } else if (indicatorPosition === 'top-right') {
          circleX = pos.x - radius;
          circleY = pos.y + radius;
        } else if (indicatorPosition === 'bottom-left') {
          circleX = pos.x + radius;
          circleY = pos.y - radius;
        } else {
          circleX = pos.x - radius;
          circleY = pos.y - radius;
        }
        ctx.beginPath();
        ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Center text in circle
        pos = {
          x: circleX,
          y: circleY
        };
      }
    } else {
      // For simple style, adjust position based on corner
      if (indicatorPosition === 'top-right' || indicatorPosition === 'bottom-right') {
        pos = {
          x: pos.x - metrics.width / 2,
          y: pos.y
        };
      } else {
        pos = {
          x: pos.x + metrics.width / 2,
          y: pos.y
        };
      }
      if (indicatorPosition === 'bottom-left' || indicatorPosition === 'bottom-right') {
        pos = {
          x: pos.x,
          y: pos.y - indicatorSize / 2
        };
      } else {
        pos = {
          x: pos.x,
          y: pos.y + indicatorSize / 2
        };
      }
    }

    // Draw number centered
    ctx.fillStyle = indicatorTextColor;
    ctx.font = `bold ${indicatorSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('5', pos.x, pos.y);

    // Download
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preview-indicador-${clipIndicator}-${indicatorPosition}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: '✅ Preview descargado',
        description: 'Imagen guardada en descargas'
      });
    }, 'image/png');
  };
  const handleProcess = async () => {
    if (!uploadId) {
      toast({
        title: 'Error',
        description: 'No hay video cargado para procesar',
        variant: 'destructive'
      });
      return;
    }

    if (!manualClips || manualClips.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay clips configurados. Configura al menos un clip antes de procesar.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Guardar TODA la configuración en la sesión antes de procesar
      const completeSessionData = {
        filename,
        filesize,
        duration,
        videoUrl,
        seed,
        delayMode,
        title,
        description,
        keywords,
        ambientNoise,
        amplitude,
        cutStart,
        cutEnd,
        audioUnique,
        audioMode,
        audioScope,
        audioSeed,
        clipIndicator,
        indicatorPosition,
        indicatorSize,
        indicatorTextColor,
        indicatorBgColor,
        indicatorOpacity,
        indicatorStyle,
        filterType,
        filterIntensity,
        customFilterCss: customFilterCSS,
        customFilterName,
        overlayType,
        overlayIntensity,
        customOverlayName,
        customOverlayConfig,
        horizontalFlip,
        cameraZoom,
        cameraZoomDuration,
        cameraPan,
        cameraTilt,
        cameraRotate,
        cameraDolly,
        cameraShake,
        manualClips,
        status: 'processing'
      };

      // Guardar la sesión completa
      await saveSession(completeSessionData);
      toast({
        title: 'Configuración guardada',
        description: 'Iniciando procesamiento...'
      });

      // Convert CSS filter preview to FFmpeg command
      const getFFmpegFilterCommand = (type: string, intensity: number): string => {
        const i = intensity / 100; // Normalize to 0-1

        switch(type) {
          case 'vintage':
            // Sepia tone approximation using colorchannelmixer
            return `colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=${1 + i * 0.2}:saturation=${1 - i * 0.1}:brightness=${i * 0.05}`;

          case 'vivid':
            // Increase saturation and contrast
            return `eq=saturation=${1 + i * 1.5}:contrast=${1 + i * 0.4}`;

          case 'cool':
            // Cool tone: blue hue shift
            return `hue=h=${i * 18}:s=${1 + i * 0.3},eq=brightness=${-i * 0.1}`;

          case 'warm':
            // Warm tone: orange hue shift
            return `hue=h=${-i * 10.8}:s=${1 + i * 0.3},eq=brightness=${i * 0.1}`;

          case 'bw':
            // Black and white
            return `hue=s=${1 - i}`;

          case 'ai-custom':
            if (customFilterCSS) {
              // Try to convert CSS filter to FFmpeg (basic conversion)
              return customFilterCSS;
            }
            return '';

          default:
            return '';
        }
      };

      // Build process request for /api/process-video
      setIsProcessing(true);

      // Debug: Log manual clips before building request
      console.log('🔍 DEBUG - manualClips before building request:', {
        count: manualClips.length,
        clips: manualClips,
        filterType,
        clipIndicator,
        horizontalFlip
      });

      const processRequest: ProcessVideoRequest = {
        uploadId: uploadId || '',
        videoUrl: videoUrl || '', // Agregar videoUrl para validación
        mode: 'manual' as const,
        preset: 'storyclip_social_916',
        clips: manualClips.map((clip, i) => ({
          start: clip.start,
          end: clip.end,
          effects: {
            mirrorHorizontal: horizontalFlip,
            ...(filterType !== 'none' ? {
              color: {
                ffmpegCommand: getFFmpegFilterCommand(filterType, filterIntensity)
              }
            } : {}),
            ...(clipIndicator !== 'none' ? {
              indicator: {
                enabled: true,
                type: clipIndicator, // 'temporal' or 'permanent'
                duration: clipIndicator === 'temporal' ? 0.1 : undefined, // 100ms (0.1s) - visible en thumbnail pero desaparece al reproducir
                label: String(i + 1),
                position: indicatorPosition || 'top-left',
                size: indicatorSize || 90,
                textColor: indicatorTextColor || '#FFFFFF',
                bgColor: indicatorBgColor || '#FF2D55',
                opacity: indicatorOpacity ?? 0.8,
                style: indicatorStyle || 'rounded'
              }
            } : {})
          }
        })),
        /* REMOVIDO: duplicados de efectos - usar SOLO clips[].effects
          filters: {
            color: {
              brightness: 0.05,
              contrast: 1.2,
              saturation: 1.1
            },
            mirrorHorizontal: horizontalFlip
          }
        } : {}), */
        ...(overlayType !== 'none' ? {
          overlays: {
            type: overlayType,
            intensity: overlayIntensity,
            ...(overlayType === 'ai-custom' ? {
              customName: customOverlayName,
              customConfig: customOverlayConfig
            } : {})
          }
        } : {}),
        ...(cameraZoom || cameraPan || cameraTilt || cameraRotate || cameraDolly || cameraShake ? {
          camera: {
            ...(cameraZoom ? { zoom: 1.2, zoomDuration: cameraZoomDuration || 2 } : {}),
            ...(cameraPan ? { pan: 1 } : {}),
            ...(cameraTilt ? { tilt: 1 } : {}),
            ...(cameraRotate ? { rotate: 1 } : {}),
            ...(cameraDolly ? { dolly: 1 } : {}),
            ...(cameraShake ? { shake: 0.5 } : {})
          }
        } : {}),
        audio: {
          volume: amplitude,
          ...(ambientNoise ? { fadeIn: 0.5, fadeOut: 0.5 } : {})
        },
        metadata: {
          title,
          description,
          keywords,
          seed,
          delayMode
          /* REMOVIDO: duplicados de efectos en metadata.visual */
        }
      };
      
      console.log('🚀 Sending process video request:', JSON.stringify(processRequest, null, 2));
      const result = await processVideo(processRequest);
      
      if (!result.jobId) {
        throw new Error('No job ID received from server');
      }

      const jobId = result.jobId;
      setIsProcessing(false);
      
      if (!jobId) {
        throw new Error('No job ID received from server');
      }

      const storyId = jobId;

      console.log('✅ Processing started - jobId:', jobId, 'storyId:', storyId);

      // Mark session as completed - save the jobId/storyId  
      await completeSession(storyId);
      
      // Store jobId for process page (use jobId as the key since that's what we'll track)
      localStorage.setItem(`story_${storyId}`, JSON.stringify({
        storyId,
        jobId,
        uploadId: uploadId,
        metadata: {
          title,
          description,
          keywords
        }
      }));
      
      toast({
        title: 'Processing started',
        description: 'Generating your StoryClips...'
      });
      
      // Navigate using storyId (which is same as jobId)
      navigate(`/process/${storyId}`);
    } catch (error) {
      console.error('Process error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to start processing';
      
      // Check for specific error types
      const is502Error = errorMessage.includes('502');
      const isUploadNotFound = errorMessage.includes('Upload not found') || errorMessage.includes('not found');
      
      toast({
        title: isUploadNotFound ? '⚠️ Video No Encontrado' : is502Error ? '⚠️ Servidor Backend Inactivo' : 'Error',
        description: isUploadNotFound 
          ? `El video (${uploadId}) no fue encontrado en el servidor. Esto puede ocurrir si el servidor se reinició o el upload no se completó correctamente. Por favor, vuelve a subir tu video.`
          : is502Error 
            ? '🔧 El servidor de procesamiento (story.creatorsflow.app) está caído o en mantenimiento. Por favor verifica el estado del servidor PM2 en Contabo.'
            : errorMessage,
        variant: 'destructive',
        duration: isUploadNotFound ? 10000 : is502Error ? 10000 : 5000,
      });
      
      // If upload not found, redirect back to upload page after showing error
      if (isUploadNotFound) {
        setTimeout(() => {
          navigate('/upload');
        }, 3000);
      }
    }
  };
  
  return (
    <div className="min-h-screen gradient-subtle">
      <Header />
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              // Volver a la página de preset con el modal abierto
              navigate(`/preset/${uploadId}`, {
                state: {
                  ...location.state,
                  showModal: true  // Indicador para reabrir el modal
                }
              });
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a sugerencias
          </Button>
          
          {isSaving && <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Save className="h-4 w-4 animate-pulse" />
              Guardando sesión...
            </div>}
        </div>
        
        <h1 className="text-4xl font-bold mb-8 text-center">
          <span className="text-gradient">Configuración Manual</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Cantidad de Clips a Generar - Sección independiente */}
            <Card className="p-6 shadow-card">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Configuración de Distribución</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Número de clips</Label>
                      {clipCount > 50 && <div className="group relative">
                          <Info className="w-4 h-4 text-yellow-500 cursor-help" />
                          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-popover border rounded-lg shadow-lg text-xs z-50">
                            <p className="font-medium mb-1">⚠️ Límite de Facebook</p>
                            <p className="text-muted-foreground">
                              Facebook solo permite publicar 50 Stories en 24 horas. Si generas más de 50 clips, deberás publicarlos en días diferentes.
                            </p>
                          </div>
                        </div>}
                    </div>
                    <Input type="number" min={1} max={200} value={clipCount || ''} onChange={e => {
                    const value = e.target.value;
                    if (value === '') {
                      setClipCount(0);
                      return;
                    }
                    const count = Number(value);
                    if (count >= 1) {
                      setClipCount(count);
                      generateClipsDistribution(clipDuration, count);
                    }
                  }} placeholder="50" className={clipCount > 50 ? "border-yellow-500" : ""} />
                    {clipCount === 50 && <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        ✓ Cantidad recomendada para Facebook (50 stories/24hr)
                      </p>}
                    {clipCount > 50 && <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Excede el límite de Facebook (50 stories/24hr)
                      </p>}
                    {clipCount < 50 && clipCount > 0 && <p className="text-xs text-muted-foreground mt-1">
                        Facebook recomienda 50 clips para máximo alcance
                      </p>}
                  </div>

                  <div>
                    <Label className="text-sm">Duración por clip (segundos)</Label>
                    <Input type="number" min={1} value={clipDuration || ''} onChange={e => {
                    const value = e.target.value;
                    if (value === '') {
                      setClipDuration(0);
                      return;
                    }
                    const dur = Number(value);
                    if (dur >= 1) {
                      setClipDuration(dur);
                      generateClipsDistribution(dur, clipCount);
                    }
                  }} placeholder="Segundos" className={clipDuration < 3 && clipDuration > 0 ? "border-yellow-500" : ""} />
                    {clipDuration >= 3 && clipDuration <= 10 && <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        ✓ Ha escogido una duración perfecta para tus clips
                      </p>}
                    {clipDuration < 3 && clipDuration > 0 && <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ Clips menores a 3s no se pueden publicar automáticamente
                      </p>}
                    {clipDuration > 10 && <p className="text-xs text-muted-foreground mt-1">
                        Clips largos pueden reducir el engagement
                      </p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Distribución Rápida</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => generateFixedDurationDistribution(3)}>
                      Clips de 3s
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => generateFixedDurationDistribution(6)}>
                      Clips de 6s
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => generateFixedDurationDistribution(10)}>
                      Clips de 10s
                    </Button>
                  </div>
                </div>

                {renderDistributionSummary()}
              </div>
            </Card>

            {/* Voltear horizontalmente - Sección independiente */}
            <Card className="p-6 shadow-card">
              <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${horizontalFlip ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-all duration-300 ${horizontalFlip ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <FlipHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-base font-semibold cursor-pointer">Voltear horizontalmente</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invierte el video de izquierda a derecha (efecto espejo)
                    </p>
                  </div>
                </div>
                <Switch checked={horizontalFlip} onCheckedChange={setHorizontalFlip} />
              </div>
            </Card>

            <Accordion type="single" collapsible defaultValue="visual" className="space-y-4">
              
              {/* Visual Settings */}
              <AccordionItem value="visual" className="border rounded-lg px-6 bg-card shadow-card">
                <AccordionTrigger className="flex items-center justify-between w-full pr-4 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold">Visual Settings</span>
                  </div>
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      generateMetadata();
                    }} 
                    disabled={isGeneratingMetadata} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className={`h-4 w-4 ${isGeneratingMetadata ? 'animate-spin' : ''}`} />
                    {isGeneratingMetadata ? 'Generando...' : '✨ Optimizar'}
                  </button>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div>
                    <Label>Visual Seed</Label>
                    <Select value={seed} onValueChange={v => setSeed(v as SeedType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="viral">Viral</SelectItem>
                        <SelectItem value="cinematica">Cinematic</SelectItem>
                        <SelectItem value="humor">Humor</SelectItem>
                        <SelectItem value="impacto">Impact</SelectItem>
                        <SelectItem value="no_flip_texto">No Flip Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Delay Mode</Label>
                    <Select value={delayMode} onValueChange={v => setDelayMode(v as DelayMode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HYPE">Hype (Fast-paced)</SelectItem>
                        <SelectItem value="FAST">Fast</SelectItem>
                        <SelectItem value="NATURAL">Natural</SelectItem>
                        <SelectItem value="PRO">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cut Start (seconds)</Label>
                      <Input type="number" min="0" step="0.1" value={cutStart} onChange={e => setCutStart(parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <Label>Cut End (seconds)</Label>
                      <Input type="number" min="0" step="0.1" value={cutEnd} onChange={e => setCutEnd(parseFloat(e.target.value))} />
                    </div>
                  </div>

                </AccordionContent>
              </AccordionItem>

              {/* Audio Originality */}
              <AccordionItem value="audio" className="border rounded-lg px-6 bg-card shadow-card">
                <AccordionTrigger className="flex items-center justify-between w-full pr-4 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold">Originalidad de Audio</span>
                  </div>
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      generateAudioProfile();
                    }} 
                    disabled={isGeneratingAudioProfile} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className={`h-4 w-4 ${isGeneratingAudioProfile ? 'animate-spin' : ''}`} />
                    {isGeneratingAudioProfile ? 'Generando...' : '✨ Generar'}
                  </button>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Hacer que cada clip suene ligeramente diferente
                  </p>
                  
                  {/* Toggle principal */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${audioUnique ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${audioUnique ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Music className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">Hacer audio único por variante</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Genera variaciones de audio para cada clip o usa el audio original
                        </p>
                      </div>
                    </div>
                    <Switch checked={audioUnique} onCheckedChange={setAudioUnique} />
                  </div>

                  {audioUnique && <div className="space-y-4 animate-fade-in">
                      {/* Modos rápidos */}
                      <div>
                        <Label className="text-sm mb-3 block">Modo de variación</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {['suave', 'medio', 'fuerte', 'personalizado'].map(mode => <button key={mode} onClick={() => setAudioMode(mode as any)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${audioMode === mode ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted hover:bg-muted/80'}`}>
                              {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>)}
                        </div>
                      </div>

                      {/* Ámbito */}
                      <div className="border-t pt-4">
                        <Label className="text-sm mb-3 block">Ámbito de variación</Label>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm">Por clip</Label>
                              <p className="text-xs text-muted-foreground">Cada clip es único</p>
                            </div>
                            <Switch checked={audioScope === 'clip'} onCheckedChange={checked => checked && setAudioScope('clip')} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm">Por creator</Label>
                              <p className="text-xs text-muted-foreground">Firma única por creator</p>
                            </div>
                            <Switch checked={audioScope === 'creator'} onCheckedChange={checked => checked && setAudioScope('creator')} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm">Por página</Label>
                              <p className="text-xs text-muted-foreground">Compartido por página</p>
                            </div>
                            <Switch checked={audioScope === 'pagina'} onCheckedChange={checked => checked && setAudioScope('pagina')} />
                          </div>
                        </div>
                      </div>

                      {/* Semilla de variación */}
                      <div>
                        <Label className="text-sm mb-2 block">Semilla de variación (opcional)</Label>
                        <Input value={audioSeed} onChange={e => setAudioSeed(e.target.value)} placeholder="auto" className="bg-card" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Deja en "auto" o ingresa un valor para reproducibilidad
                        </p>
                      </div>

                      {/* Vista previa */}
                      <Button variant="secondary" className="w-full gap-2" disabled>
                        <Volume2 className="h-4 w-4" />
                        Escuchar muestra (próximamente)
                      </Button>
                    </div>}
                </AccordionContent>
              </AccordionItem>


              {/* Clip Indicators */}
              <AccordionItem value="indicators" className="border rounded-lg px-6 bg-card shadow-card">
                <AccordionTrigger className="flex items-center justify-between w-full pr-4 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold">Indicadores de Clips</span>
                  </div>
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      generateAIIndicator();
                    }} 
                    disabled={isGeneratingIndicator} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className={`h-4 w-4 ${isGeneratingIndicator ? 'animate-spin' : ''}`} />
                    {isGeneratingIndicator ? 'Generando...' : '✨ Sugerir'}
                  </button>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Números que aparecen en tus clips para identificarlos
                  </p>
                  
            <div className="space-y-6">
                {/* Tipo de indicador */}
                <div>
                  <Label className="text-base mb-3 block">Tipo de Indicador</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setClipIndicator('none')} className={`p-4 rounded-lg border-2 transition-all text-center ${clipIndicator === 'none' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🚫</div>
                      <p className="font-semibold text-sm">Sin Indicador</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sin números
                      </p>
                    </button>
                    
                    <button onClick={() => setClipIndicator('temporal')} className={`p-4 rounded-lg border-2 transition-all text-center ${clipIndicator === 'temporal' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">⚡</div>
                      <p className="font-semibold text-sm">Temporal</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Flash 0.1s
                      </p>
                    </button>
                    
                    <button onClick={() => setClipIndicator('permanent')} className={`p-4 rounded-lg border-2 transition-all text-center ${clipIndicator === 'permanent' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🔢</div>
                      <p className="font-semibold text-sm">Permanente</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Todo el clip
                      </p>
                    </button>
                  </div>
                </div>

                {/* Descripción del tipo seleccionado */}
                {clipIndicator !== 'none' && <div className="p-4 bg-muted/30 rounded-lg">
                    {clipIndicator === 'temporal' ? <div>
                        <p className="font-semibold text-sm mb-2">⏱️ Indicador Temporal (0.1s)</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          El número aparece solo por un instante al inicio del clip
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Ideal para:</strong> Organización personal, importar a iOS, contenido limpio
                        </p>
                      </div> : <div>
                        <p className="font-semibold text-sm mb-2">🔢 Indicador Permanente</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          El número aparece durante TODO el clip
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Ideal para:</strong> Tutoriales, series episódicas, contenido numerado
                        </p>
                      </div>}
                  </div>}

                {/* Posición del indicador */}
                {clipIndicator !== 'none' && <div>
                    <Label className="text-base mb-3 block">Posición del Indicador</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setIndicatorPosition('top-left')} className={`p-3 rounded-lg border-2 transition-all ${indicatorPosition === 'top-left' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                        <div className="flex items-center gap-2">
                          <div className="text-lg">🔝⬅️</div>
                          <div className="text-left">
                            <p className="font-semibold text-sm">Superior Izquierda</p>
                            <p className="text-xs text-muted-foreground">Esquina arriba izquierda</p>
                          </div>
                        </div>
                      </button>
                      
                      <button onClick={() => setIndicatorPosition('top-right')} className={`p-3 rounded-lg border-2 transition-all ${indicatorPosition === 'top-right' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                        <div className="flex items-center gap-2">
                          <div className="text-lg">🔝➡️</div>
                          <div className="text-left">
                            <p className="font-semibold text-sm">Superior Derecha</p>
                            <p className="text-xs text-muted-foreground">Esquina arriba derecha</p>
                          </div>
                        </div>
                      </button>
                      
                      <button onClick={() => setIndicatorPosition('bottom-left')} className={`p-3 rounded-lg border-2 transition-all ${indicatorPosition === 'bottom-left' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                        <div className="flex items-center gap-2">
                          <div className="text-lg">⬇️⬅️</div>
                          <div className="text-left">
                            <p className="font-semibold text-sm">Inferior Izquierda</p>
                            <p className="text-xs text-muted-foreground">Esquina abajo izquierda</p>
                          </div>
                        </div>
                      </button>
                      
                      <button onClick={() => setIndicatorPosition('bottom-right')} className={`p-3 rounded-lg border-2 transition-all ${indicatorPosition === 'bottom-right' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                        <div className="flex items-center gap-2">
                          <div className="text-lg">⬇️➡️</div>
                          <div className="text-left">
                            <p className="font-semibold text-sm">Inferior Derecha</p>
                            <p className="text-xs text-muted-foreground">Esquina abajo derecha</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>}

                {/* Estilos del indicador */}
                {clipIndicator !== 'none' && <div className="border-t pt-4">
                    <Label className="text-base mb-4 block">Estilo del Indicador</Label>
                    
                    <div className="space-y-4">
                      {/* Estilo visual */}
                      <div>
                        <Label className="text-sm mb-2 block">Tipo de estilo</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => setIndicatorStyle('simple')} className={`p-3 rounded-lg border-2 transition-all text-center ${indicatorStyle === 'simple' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                            <div className="text-2xl mb-1 font-bold">5</div>
                            <p className="text-xs font-medium">Simple</p>
                          </button>
                          
                          <button onClick={() => setIndicatorStyle('badge')} className={`p-3 rounded-lg border-2 transition-all text-center ${indicatorStyle === 'badge' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                            <div className="inline-block text-xl mb-1 px-3 py-1 bg-black/70 text-white rounded font-bold">5</div>
                            <p className="text-xs font-medium">Badge</p>
                          </button>
                          
                          <button onClick={() => setIndicatorStyle('rounded')} className={`p-3 rounded-lg border-2 transition-all text-center ${indicatorStyle === 'rounded' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                            <div className="text-xl mb-1 w-10 h-10 mx-auto flex items-center justify-center bg-black/70 text-white rounded-full font-bold">5</div>
                            <p className="text-xs font-medium">Circular</p>
                          </button>
                        </div>
                      </div>

                      {/* Tamaño */}
                      <div>
                        <Label className="text-sm mb-2 block">Tamaño del texto</Label>
                        <div className="flex items-center gap-3">
                          <Input type="number" min="72" max="97" step="1" value={indicatorSize} onChange={e => setIndicatorSize(parseInt(e.target.value))} className="w-20" />
                          <input type="range" min="72" max="97" step="1" value={indicatorSize} onChange={e => setIndicatorSize(parseInt(e.target.value))} className="flex-1" />
                          <span className="text-sm font-medium w-12">{indicatorSize}px</span>
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                          <span>Mínimo: 72px</span>
                          <span className="text-primary font-medium">⭐ Recomendado: 75px</span>
                          <span>Máximo: 97px</span>
                        </div>
                      </div>

                      {/* Colores */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm mb-2 block">Color del texto</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={indicatorTextColor} onChange={e => setIndicatorTextColor(e.target.value)} className="w-16 h-10 p-1 cursor-pointer" />
                            <Input type="text" value={indicatorTextColor} onChange={e => setIndicatorTextColor(e.target.value)} className="flex-1" placeholder="#ffffff" />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm mb-2 block">Color de fondo</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={indicatorBgColor} onChange={e => setIndicatorBgColor(e.target.value)} className="w-16 h-10 p-1 cursor-pointer" />
                            <Input type="text" value={indicatorBgColor} onChange={e => setIndicatorBgColor(e.target.value)} className="flex-1" placeholder="#000000" />
                          </div>
                        </div>
                      </div>

                      {/* Opacidad */}
                      <div>
                        <Label className="text-sm mb-2 block">Opacidad del fondo</Label>
                        <div className="flex items-center gap-3">
                          <input type="range" min="0" max="1" step="0.1" value={indicatorOpacity} onChange={e => setIndicatorOpacity(parseFloat(e.target.value))} className="flex-1" />
                          <span className="text-sm font-medium w-12">{Math.round(indicatorOpacity * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>}
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Camera Movements */}
              <AccordionItem value="camera" className="border rounded-lg px-6 bg-card shadow-card">
                <AccordionTrigger className="flex items-center justify-between w-full pr-4 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold">Movimientos de Cámara</span>
                  </div>
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      generateAICameraMovement();
                    }} 
                    disabled={isGeneratingCameraMovement} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className={`h-4 w-4 ${isGeneratingCameraMovement ? 'animate-spin' : ''}`} />
                    {isGeneratingCameraMovement ? 'Generando...' : '✨ Optimizar'}
                  </button>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Agrega movimiento dinámico a tus videos con efectos profesionales
                  </p>
                  
                  {/* Zoom In/Out */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${cameraZoom ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${cameraZoom ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <ZoomIn className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">Zoom In/Out</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Acercamiento o alejamiento suave
                        </p>
                      </div>
                    </div>
                    <Switch checked={cameraZoom} onCheckedChange={setCameraZoom} />
                  </div>

                  {cameraZoom && <div className="p-4 border rounded-lg bg-muted/30 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Suavidad del Movimiento</Label>
                        <span className="text-sm font-semibold text-primary">{cameraZoomDuration.toFixed(1)}s</span>
                      </div>
                      <div className="space-y-2">
                        <input type="range" min="4" max="12" step="0.5" value={cameraZoomDuration} onChange={e => setCameraZoomDuration(parseFloat(e.target.value))} className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Rápido (4s)</span>
                          <span>Medio (8s)</span>
                          <span>Suave (12s)</span>
                        </div>
                      </div>
                    </div>}

                  {/* Pan (Paneo horizontal) */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${cameraPan ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${cameraPan ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Move className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">Pan (Paneo)</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Movimiento horizontal de izquierda a derecha
                        </p>
                      </div>
                    </div>
                    <Switch checked={cameraPan} onCheckedChange={setCameraPan} />
                  </div>

                  {/* Tilt (Inclinación) */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${cameraTilt ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${cameraTilt ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <ArrowUpDown className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">Tilt (Inclinación)</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Movimiento vertical de arriba a abajo
                        </p>
                      </div>
                    </div>
                    <Switch checked={cameraTilt} onCheckedChange={setCameraTilt} />
                  </div>

                  {/* Rotate (Rotación) */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${cameraRotate ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${cameraRotate ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <RotateCw className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">Rotate (Rotación)</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Giro suave del encuadre
                        </p>
                      </div>
                    </div>
                    <Switch checked={cameraRotate} onCheckedChange={setCameraRotate} />
                  </div>

                  {/* Dolly (Travelling) */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${cameraDolly ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${cameraDolly ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Camera className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">Dolly (Travelling)</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Acercamiento con desplazamiento
                        </p>
                      </div>
                    </div>
                    <Switch checked={cameraDolly} onCheckedChange={setCameraDolly} />
                  </div>

                  {/* Shake (Vibración) */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${cameraShake ? 'bg-primary/10 border-primary shadow-glow' : 'bg-muted/30 border-transparent hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${cameraShake ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">Shake (Vibración)</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Efecto de cámara en mano para impacto
                        </p>
                      </div>
                    </div>
                    <Switch checked={cameraShake} onCheckedChange={setCameraShake} />
                  </div>
                </AccordionContent>
              </AccordionItem>


              {/* Visual Filters */}
              <AccordionItem value="filters" className="border rounded-lg px-6 bg-card shadow-card">
                <AccordionTrigger className="flex items-center justify-between w-full pr-4 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold">Filtros Visuales</span>
                  </div>
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      generateAIFilter();
                    }} 
                    disabled={isGeneratingFilter} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className={`h-4 w-4 ${isGeneratingFilter ? 'animate-spin' : ''}`} />
                    {isGeneratingFilter ? 'Generando...' : '✨ Filtro'}
                  </button>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Aplica efectos de color y estilo a tus clips
                  </p>
                  
            <div className="space-y-6">
                {/* Tipo de filtro */}
                <div>
                  <Label className="text-base mb-3 block">Tipo de Filtro</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setFilterType('none')} className={`aspect-square p-6 rounded-xl border-2 transition-all flex items-center justify-center ${filterType === 'none' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`} title="Sin Filtro">
                      <div className="text-4xl">🚫</div>
                    </button>
                    
                    <button onClick={() => setFilterType('vintage')} className={`aspect-square p-6 rounded-xl border-2 transition-all flex items-center justify-center ${filterType === 'vintage' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`} title="Vintage - Sepia retro">
                      <div className="text-4xl">📷</div>
                    </button>
                    
                    <button onClick={() => setFilterType('vivid')} className={`aspect-square p-6 rounded-xl border-2 transition-all flex items-center justify-center ${filterType === 'vivid' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`} title="Vívido - Colores intensos">
                      <div className="text-4xl">🌈</div>
                    </button>
                    
                    <button onClick={() => setFilterType('cool')} className={`aspect-square p-6 rounded-xl border-2 transition-all flex items-center justify-center ${filterType === 'cool' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`} title="Frío - Tonos azules">
                      <div className="text-4xl">❄️</div>
                    </button>
                    
                    <button onClick={() => setFilterType('warm')} className={`aspect-square p-6 rounded-xl border-2 transition-all flex items-center justify-center ${filterType === 'warm' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`} title="Cálido - Tonos naranjas">
                      <div className="text-4xl">🔥</div>
                    </button>
                    
                    <button onClick={() => setFilterType('bw')} className={`aspect-square p-6 rounded-xl border-2 transition-all flex items-center justify-center ${filterType === 'bw' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`} title="Blanco y Negro - Escala de grises">
                      <div className="text-4xl">⚫</div>
                    </button>
                    
                    {filterType === 'ai-custom' && customFilterName && <button onClick={() => setFilterType('ai-custom')} className="aspect-square p-6 rounded-xl border-2 border-primary bg-primary/10 shadow-md transition-all flex items-center justify-center" title={`${customFilterName} - Generado por IA`}>
                        <div className="text-4xl">✨</div>
                      </button>}
                  </div>
                </div>
                
                {/* Intensidad del filtro */}
                {filterType !== 'none' && <div>
                    <Label className="text-sm mb-2 block">Intensidad del Filtro</Label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="100" step="5" value={filterIntensity} onChange={e => setFilterIntensity(parseInt(e.target.value))} className="flex-1" />
                      <span className="text-sm font-medium w-12">{filterIntensity}%</span>
                    </div>
                  </div>}
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Overlays */}
              <AccordionItem value="overlays" className="border rounded-lg px-6 bg-card shadow-card">
                <AccordionTrigger className="flex items-center justify-between w-full pr-4 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold">Overlays Animados</span>
                  </div>
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      generateAIOverlay();
                    }} 
                    disabled={isGeneratingOverlay} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className={`h-4 w-4 ${isGeneratingOverlay ? 'animate-spin' : ''}`} />
                    {isGeneratingOverlay ? 'Generando...' : '✨ Overlay'}
                  </button>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Agrega efectos animados sobre tus videos
                  </p>
                  
            <div className="space-y-6">
                <Button onClick={generateAIOverlay} disabled={isGeneratingOverlay} className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all" size="sm">
                  <Wand2 className={`h-4 w-4 ${isGeneratingOverlay ? 'animate-spin' : ''}`} />
                  {isGeneratingOverlay ? 'Generando...' : '✨ Overlay con IA'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Agrega efectos animados sobre tus videos
              </p>
              
              <div className="space-y-6">
                {/* Tipo de overlay */}
                <div>
                  <Label className="text-base mb-3 block">Efectos Básicos</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setOverlayType('none')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'none' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🚫</div>
                      <p className="font-semibold text-sm">Sin Overlay</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('particles')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'particles' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">✨</div>
                      <p className="font-semibold text-sm">Partículas</p>
                      <p className="text-xs text-muted-foreground mt-1">Efecto flotante</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('sparkles')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'sparkles' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">💫</div>
                      <p className="font-semibold text-sm">Destellos</p>
                      <p className="text-xs text-muted-foreground mt-1">Brillos animados</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('glitch')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'glitch' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">📺</div>
                      <p className="font-semibold text-sm">Glitch</p>
                      <p className="text-xs text-muted-foreground mt-1">Efecto digital</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('vhs')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'vhs' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">📼</div>
                      <p className="font-semibold text-sm">VHS</p>
                      <p className="text-xs text-muted-foreground mt-1">Retro 90s</p>
                    </button>
                  </div>
                </div>
                
                {/* Overlays Cinematográficos */}
                <div>
                  <Label className="text-base mb-3 block">Efectos Cinematográficos</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setOverlayType('bokeh')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'bokeh' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🌟</div>
                      <p className="font-semibold text-sm">Bokeh</p>
                      <p className="text-xs text-muted-foreground mt-1">Luces desenfocadas</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('light-leak')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'light-leak' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">☀️</div>
                      <p className="font-semibold text-sm">Light Leak</p>
                      <p className="text-xs text-muted-foreground mt-1">Fuga de luz</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('film-grain')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'film-grain' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🎞️</div>
                      <p className="font-semibold text-sm">Film Grain</p>
                      <p className="text-xs text-muted-foreground mt-1">Grano de película</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('chromatic')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'chromatic' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🌈</div>
                      <p className="font-semibold text-sm">Chromatic</p>
                      <p className="text-xs text-muted-foreground mt-1">Aberración RGB</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('lens-flare')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'lens-flare' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">💫</div>
                      <p className="font-semibold text-sm">Lens Flare</p>
                      <p className="text-xs text-muted-foreground mt-1">Destello de lente</p>
                    </button>
                  </div>
                </div>
                
                {/* Overlays Atmosféricos */}
                <div>
                  <Label className="text-base mb-3 block">Efectos Atmosféricos</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setOverlayType('rain')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'rain' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🌧️</div>
                      <p className="font-semibold text-sm">Rain</p>
                      <p className="text-xs text-muted-foreground mt-1">Efecto lluvia</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('matrix')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'matrix' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🟢</div>
                      <p className="font-semibold text-sm">Matrix</p>
                      <p className="text-xs text-muted-foreground mt-1">Código lluvia</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('dna')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'dna' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🧬</div>
                      <p className="font-semibold text-sm">DNA Helix</p>
                      <p className="text-xs text-muted-foreground mt-1">Hélice animada</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('hexagon')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'hexagon' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">⬡</div>
                      <p className="font-semibold text-sm">Hexágonos</p>
                      <p className="text-xs text-muted-foreground mt-1">Patrón tech</p>
                    </button>
                    
                    <button onClick={() => setOverlayType('wave')} className={`p-4 rounded-lg border-2 transition-all text-center ${overlayType === 'wave' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/50 bg-card'}`}>
                      <div className="text-2xl mb-2">🌊</div>
                      <p className="font-semibold text-sm">Ondas</p>
                      <p className="text-xs text-muted-foreground mt-1">Distorsión wave</p>
                    </button>
                  </div>
                </div>
                
                {/* Overlay personalizado por IA */}
                {overlayType === 'ai-custom' && customOverlayName && <div>
                    <Label className="text-base mb-3 block">Overlay Generado por IA</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => setOverlayType('ai-custom')} className="p-4 rounded-lg border-2 border-primary bg-primary/10 shadow-md transition-all text-center">
                        <div className="text-2xl mb-2">✨</div>
                        <p className="font-semibold text-sm">{customOverlayName}</p>
                        <p className="text-xs text-muted-foreground mt-1">Generado por IA</p>
                      </button>
                    </div>
                  </div>}
                
                
                {/* Intensidad del overlay */}
                {overlayType !== 'none' && <div>
                    <Label className="text-sm mb-2 block">Intensidad del Overlay</Label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="100" step="5" value={overlayIntensity} onChange={e => setOverlayIntensity(parseInt(e.target.value))} className="flex-1" />
                      <span className="text-sm font-medium w-12">{overlayIntensity}%</span>
                    </div>
                  </div>}
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Metadata */}
              <AccordionItem value="metadata" className="border rounded-lg px-6 bg-card shadow-card">
                <AccordionTrigger className="flex items-center justify-between w-full pr-4 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold">Metadata</span>
                  </div>
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      generateMetadata();
                    }} 
                    disabled={isGeneratingMetadata} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGeneratingMetadata ? 'animate-spin' : ''}`} />
                    {isGeneratingMetadata ? 'Generando...' : '✨ Regenerar'}
                  </button>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título sugerido por IA..." disabled={isGeneratingMetadata} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sugerido por IA - Edítalo como prefieras
                  </p>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Descripción sugerida por IA..." disabled={isGeneratingMetadata} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sugerido por IA - Edítalo como prefieras
                  </p>
                </div>

                <div>
                  <Label>Keywords</Label>
                  <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="keyword1, keyword2, keyword3" disabled={isGeneratingMetadata} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sugeridos por IA - Edítalos como prefieras
                  </p>
                </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="space-y-6">
            {/* Vista previa del indicador */}
            <Card className="p-6 shadow-card sticky top-6 bg-gradient-to-br from-card/50 to-card backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                <h2 className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Preview</h2>
              </div>
              
              {/* Debug Component */}
              <VideoDebug 
                uploadId={uploadId}
                videoUrl={videoUrl}
                sessionData={sessionData}
              />
              
              <div className="relative">
                {/* Glow effect container */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl opacity-50 animate-pulse" />
                
                <div id="video-preview" className="relative aspect-[9/16] max-h-[500px] bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden shadow-2xl mx-auto border border-white/10 transition-transform hover:scale-[1.02] duration-300">
                  {/* Video del usuario - capa base */}
                  {isLoadingSession ? (
                    /* Pantalla de carga mientras se obtiene la sesión */
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 z-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white animate-fade-in">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                          <p className="text-lg font-medium mb-1">Cargando video...</p>
                          <p className="text-sm opacity-70">Recuperando sesión</p>
                        </div>
                      </div>
                    </div>
                  ) : videoUrl ? (
                    <VideoPlayer
                      key={`preview-${videoUrl}-${horizontalFlip}-${cameraZoom}-${cameraPan}-${cameraTilt}-${cameraRotate}-${cameraDolly}-${cameraShake}-${filterType}-${filterIntensity}-${overlayType}-${overlayIntensity}`}
                      uploadId={uploadId}
                      videoUrl={videoUrl}
                      className="absolute inset-0 w-full h-full object-cover z-20 transition-all duration-500"
                      autoPlay
                      muted
                      loop
                      controls={false}
                      onLoadError={(error) => {
                        toast({
                          title: 'Error cargando video',
                          description: error,
                          variant: 'destructive'
                        });
                      }}
                      style={{
                        transform: (() => {
                          const transforms = [];
                          // Aplicar flip horizontal SOLO al video
                          if (horizontalFlip) transforms.push('scaleX(-1)');
                          // Aplicar transforms de cámara
                          if (cameraZoom) transforms.push('scale(1.2)');
                          if (cameraPan) transforms.push('translateX(10%)');
                          if (cameraTilt) transforms.push('translateY(10%)');
                          if (cameraRotate) transforms.push('rotate(5deg)');
                          return transforms.length > 0 ? transforms.join(' ') : 'none';
                        })(),
                        animation: (() => {
                          const animations = [];
                          if (cameraDolly) animations.push('dollyEffect 4s ease-in-out infinite');
                          if (cameraShake) animations.push('shakeEffect 0.3s ease-in-out infinite');
                          return animations.length > 0 ? animations.join(', ') : 'none';
                        })(),
                        filter: (() => {
                          if (filterType === 'vintage') return `sepia(${filterIntensity}%) contrast(${100 + filterIntensity * 0.2}%)`;
                          if (filterType === 'vivid') return `saturate(${100 + filterIntensity * 1.5}%) contrast(${100 + filterIntensity * 0.4}%)`;
                          if (filterType === 'cool') return `hue-rotate(${filterIntensity * 0.5}deg) saturate(${100 + filterIntensity * 0.3}%) brightness(${100 - filterIntensity * 0.1}%)`;
                          if (filterType === 'warm') return `hue-rotate(${-filterIntensity * 0.3}deg) saturate(${100 + filterIntensity * 0.3}%) brightness(${100 + filterIntensity * 0.1}%)`;
                          if (filterType === 'bw') return `grayscale(${filterIntensity}%)`;
                          if (filterType === 'ai-custom' && customFilterCSS) return customFilterCSS;
                          return 'none';
                        })(),
                        ...(filterType === 'ai-custom' && customFilterCSS && {
                          opacity: filterIntensity / 100
                        })
                      }}
                    />
                  ) : (
                    /* Fondo con gradiente - solo cuando NO hay video */
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 animate-gradient z-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white/30 animate-fade-in">
                          <div className="text-4xl mb-2">🎬</div>
                          <p className="text-sm font-medium mb-1">Vista Previa</p>
                          <p className="text-xs">del Indicador</p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Capa de overlays animados - sobre el video pero bajo el indicador */}
                  {overlayType !== 'none' && <div className="absolute inset-0 z-[25] pointer-events-none transition-opacity duration-500" style={{
                  opacity: overlayIntensity / 100
                }}>
                      {(overlayType === 'particles' || overlayType === 'ai-custom' && customOverlayConfig?.type === 'particles') && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(30)].map((_, i) => <div key={i} className="absolute rounded-full shadow-xl" style={{
                      width: `${6 + Math.random() * 10}px`,
                      height: `${6 + Math.random() * 10}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: overlayType === 'ai-custom' && customOverlayConfig?.colorScheme ? customOverlayConfig.colorScheme.includes('magenta') ? 'rgba(255, 0, 255, 0.9)' : customOverlayConfig.colorScheme.includes('cyan') ? 'rgba(0, 255, 255, 0.9)' : customOverlayConfig.colorScheme.includes('green') ? 'rgba(0, 255, 100, 0.9)' : 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                      animation: `float ${customOverlayConfig?.animationSpeed || '3s'} ease-in-out infinite`,
                      animationDelay: `${Math.random() * 2}s`,
                      boxShadow: '0 0 20px currentColor'
                    }} />)}
                        </div>}
                      
                      {(overlayType === 'sparkles' || overlayType === 'ai-custom' && customOverlayConfig?.type === 'sparkles') && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(25)].map((_, i) => <div key={i} className="absolute animate-pulse" style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      fontSize: `${20 + Math.random() * 30}px`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: customOverlayConfig?.animationSpeed || `${1.5 + Math.random() * 2}s`,
                      filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))',
                      opacity: 0.8
                    }}>
                              ✨
                            </div>)}
                        </div>}
                      
                      {(overlayType === 'glitch' || overlayType === 'ai-custom' && customOverlayConfig?.type === 'glitch') && <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute inset-0" style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.5) 50%, transparent 100%)',
                      animation: `glitch ${customOverlayConfig?.animationSpeed || '2s'} steps(10) infinite`
                    }} />
                          <div className="absolute inset-0" style={{
                      background: 'linear-gradient(0deg, transparent 0%, rgba(255, 0, 255, 0.4) 50%, transparent 100%)',
                      animation: `glitch ${customOverlayConfig?.animationSpeed || '1.5s'} steps(8) infinite reverse`
                    }} />
                          <div className="absolute inset-0" style={{
                      background: 'linear-gradient(45deg, transparent 0%, rgba(0, 255, 0, 0.3) 50%, transparent 100%)',
                      animation: `glitch ${customOverlayConfig?.animationSpeed || '1.8s'} steps(12) infinite`
                    }} />
                        </div>}
                      
                      {(overlayType === 'vhs' || overlayType === 'ai-custom' && customOverlayConfig?.type === 'vhs') && <div className="absolute inset-0 overflow-hidden">
                          {/* Scanlines */}
                          <div className="absolute inset-0 opacity-60" style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.2) 3px)'
                    }} />
                          {/* Tracking lines */}
                          <div className="absolute inset-0" style={{
                      background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                      animation: `vhsTracking ${customOverlayConfig?.animationSpeed || '4s'} linear infinite`
                    }} />
                          {/* Color distortion */}
                          <div className="absolute inset-0 mix-blend-color-dodge opacity-30" style={{
                      background: 'linear-gradient(90deg, rgba(255,0,0,0.3), rgba(0,255,0,0.3), rgba(0,0,255,0.3))'
                    }} />
                        </div>}
                      
                      {/* Geometric overlay para AI custom */}
                      {overlayType === 'ai-custom' && customOverlayConfig?.type === 'geometric' && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(12)].map((_, i) => <div key={i} className="absolute border-2" style={{
                      width: `${50 + Math.random() * 100}px`,
                      height: `${50 + Math.random() * 100}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      borderColor: customOverlayConfig.colorScheme.includes('magenta') ? 'rgba(255, 0, 255, 0.6)' : customOverlayConfig.colorScheme.includes('cyan') ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                      transform: `rotate(${Math.random() * 360}deg)`,
                      animation: `float ${customOverlayConfig.animationSpeed} ease-in-out infinite`,
                      animationDelay: `${Math.random() * 2}s`,
                      boxShadow: '0 0 20px currentColor'
                    }} />)}
                        </div>}
                      
                      {/* Neon overlay para AI custom */}
                      {overlayType === 'ai-custom' && customOverlayConfig?.type === 'neon' && <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute inset-0" style={{
                      background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent)',
                      animation: `glitch ${customOverlayConfig.animationSpeed} linear infinite`
                    }} />
                          <div className="absolute inset-0" style={{
                      background: 'linear-gradient(0deg, transparent, rgba(255, 0, 255, 0.3), transparent)',
                      animation: `glitch ${customOverlayConfig.animationSpeed} linear infinite reverse`
                    }} />
                        </div>}
                      
                      {/* Bokeh - Luces desenfocadas cinematográficas */}
                      {overlayType === 'bokeh' && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(25)].map((_, i) => <div key={i} className="absolute rounded-full" style={{
                      width: `${30 + Math.random() * 80}px`,
                      height: `${30 + Math.random() * 80}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: `radial-gradient(circle, ${['rgba(255, 200, 100, 0.6)', 'rgba(100, 200, 255, 0.6)', 'rgba(255, 100, 200, 0.6)'][Math.floor(Math.random() * 3)]}, transparent 70%)`,
                      filter: 'blur(15px)',
                      animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
                      animationDelay: `${Math.random() * 3}s`
                    }} />)}
                        </div>}
                      
                      {/* Light Leak - Fugas de luz cinematográfica */}
                      {overlayType === 'light-leak' && <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute w-full h-full" style={{
                      background: 'radial-gradient(ellipse at top right, rgba(255, 150, 100, 0.4) 0%, transparent 50%)',
                      animation: 'float 8s ease-in-out infinite'
                    }} />
                          <div className="absolute w-full h-full" style={{
                      background: 'radial-gradient(ellipse at bottom left, rgba(100, 150, 255, 0.3) 0%, transparent 50%)',
                      animation: 'float 6s ease-in-out infinite reverse'
                    }} />
                        </div>}
                      
                      {/* Film Grain - Grano de película */}
                      {overlayType === 'film-grain' && <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute inset-0" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
                      opacity: 0.4,
                      mixBlendMode: 'overlay'
                    }} />
                        </div>}
                      
                      {/* Chromatic Aberration - Aberración cromática */}
                      {overlayType === 'chromatic' && <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute inset-0" style={{
                      background: 'linear-gradient(90deg, rgba(255, 0, 0, 0.1) 0%, transparent 50%, rgba(0, 0, 255, 0.1) 100%)',
                      animation: 'glitch 3s steps(5) infinite'
                    }} />
                        </div>}
                      
                      {/* Lens Flare - Destello de lente */}
                      {overlayType === 'lens-flare' && <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute" style={{
                      width: '200px',
                      height: '200px',
                      left: '70%',
                      top: '20%',
                      background: 'radial-gradient(circle, rgba(255, 255, 200, 0.8) 0%, rgba(255, 200, 100, 0.4) 30%, transparent 70%)',
                      filter: 'blur(20px)',
                      animation: 'float 5s ease-in-out infinite'
                    }} />
                          {[...Array(5)].map((_, i) => <div key={i} className="absolute rounded-full" style={{
                      width: `${20 + i * 15}px`,
                      height: `${20 + i * 15}px`,
                      left: `${60 - i * 8}%`,
                      top: `${15 + i * 10}%`,
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent)',
                      filter: 'blur(5px)'
                    }} />)}
                        </div>}
                      
                      {/* Rain - Efecto lluvia */}
                      {overlayType === 'rain' && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(50)].map((_, i) => <div key={i} className="absolute" style={{
                      width: '2px',
                      height: `${20 + Math.random() * 30}px`,
                      left: `${Math.random() * 100}%`,
                      top: `-${Math.random() * 100}%`,
                      background: 'linear-gradient(to bottom, transparent, rgba(200, 220, 255, 0.8))',
                      animation: `rainDrop ${1 + Math.random() * 2}s linear infinite`,
                      animationDelay: `${Math.random() * 3}s`
                    }} />)}
                        </div>}
                      
                      {/* Matrix - Código lluvia */}
                      {overlayType === 'matrix' && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(15)].map((_, i) => <div key={i} className="absolute font-mono text-green-400" style={{
                      left: `${i / 15 * 100}%`,
                      top: `-${Math.random() * 100}%`,
                      fontSize: '14px',
                      textShadow: '0 0 8px rgba(0, 255, 0, 0.8)',
                      animation: `matrixRain ${3 + Math.random() * 4}s linear infinite`,
                      animationDelay: `${Math.random() * 2}s`,
                      opacity: 0.7
                    }}>
                              {Array.from({
                        length: 20
                      }, () => String.fromCharCode(33 + Math.floor(Math.random() * 94))).join('\n')}
                            </div>)}
                        </div>}
                      
                      {/* DNA Helix - Hélice de ADN animada */}
                      {overlayType === 'dna' && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(20)].map((_, i) => <div key={i} className="absolute rounded-full" style={{
                      width: '10px',
                      height: '10px',
                      left: `${50 + Math.sin(i * 0.5) * 30}%`,
                      top: `${i / 20 * 100}%`,
                      background: i % 2 === 0 ? 'rgba(0, 150, 255, 0.7)' : 'rgba(255, 0, 150, 0.7)',
                      boxShadow: '0 0 10px currentColor',
                      animation: `dnaRotate ${4}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`
                    }} />)}
                        </div>}
                      
                      {/* Hexagon Pattern - Patrón hexagonal tech */}
                      {overlayType === 'hexagon' && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(15)].map((_, i) => <div key={i} className="absolute" style={{
                      width: `${40 + Math.random() * 60}px`,
                      height: `${40 + Math.random() * 60}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      border: '2px solid rgba(0, 255, 255, 0.4)',
                      animation: `float ${4 + Math.random() * 4}s ease-in-out infinite`,
                      animationDelay: `${Math.random() * 2}s`,
                      boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
                    }} />)}
                        </div>}
                      
                      {/* Wave Distortion - Distorsión de ondas */}
                      {overlayType === 'wave' && <div className="absolute inset-0 overflow-hidden">
                          {[...Array(8)].map((_, i) => <div key={i} className="absolute w-full h-8" style={{
                      top: `${i / 8 * 100}%`,
                      background: 'linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.2), transparent)',
                      animation: `wave ${2 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`
                    }} />)}
                        </div>}
                    </div>}
                  
                  {/* Clip Indicator - FUERA del contenedor de flip para que NO se vea afectado por filtros/efectos */}
                  {clipIndicator !== 'none' && (
                    <div className="absolute inset-0 z-[30] pointer-events-none">
                      {/* Indicador en la posición seleccionada */}
                      <div className={`absolute ${indicatorPosition === 'top-left' ? 'top-3 left-3' : indicatorPosition === 'top-right' ? 'top-3 right-3' : indicatorPosition === 'bottom-left' ? 'bottom-3 left-3' : 'bottom-3 right-3'} ${indicatorStyle === 'simple' ? '' : indicatorStyle === 'badge' ? 'px-2 py-1 rounded backdrop-blur-sm' : 'rounded-full flex items-center justify-center backdrop-blur-sm'} transition-all duration-300 hover:scale-110 animate-fade-in`} style={{
                        fontSize: `${indicatorSize * 0.3}px`,
                        color: indicatorTextColor,
                        backgroundColor: indicatorStyle !== 'simple' ? `${indicatorBgColor}${Math.round(indicatorOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
                        fontWeight: 'bold',
                        lineHeight: 1,
                        textShadow: indicatorStyle === 'simple' ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
                        ...(indicatorStyle === 'rounded' ? {
                          width: `${indicatorSize * 0.45}px`,
                          height: `${indicatorSize * 0.45}px`,
                          minWidth: `${indicatorSize * 0.45}px`,
                          minHeight: `${indicatorSize * 0.45}px`
                        } : {})
                      }}>
                        5
                      </div>
                      
                      {/* Tipo de indicador badge */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 animate-fade-in">
                        <div className="px-3 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] rounded-full border border-white/20 shadow-lg">
                          {clipIndicator === 'temporal' ? '⚡ Temporal 0.1s' : '🔢 Permanente'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Corner decorations */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30 rounded-tl-xl pointer-events-none" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30 rounded-tr-xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30 rounded-bl-xl pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30 rounded-br-xl pointer-events-none" />
                </div>
              </div>
              
              {/* Info badge */}
              {clipIndicator !== 'none' && <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50 animate-fade-in">
                  <p className="text-xs text-muted-foreground text-center">
                    ✨ Vista previa en tiempo real de tu indicador
                  </p>
                </div>}
              
              {/* Botón Comparar con diseño mejorado */}
              {videoUrl && <div className="mt-4 p-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-lg">
                  <Button onClick={async () => {
                setShowComparisonModal(true);
                setIsLoadingAnalysis(true);
                try {
                  const {
                    data,
                    error
                  } = await supabase.functions.invoke('analyze-edits', {
                    body: {
                      effects: {
                        horizontalFlip,
                        cameraZoom,
                        cameraZoomDuration,
                        filterType,
                        filterIntensity,
                        overlayType,
                        overlayIntensity,
                        clipIndicator,
                        ambientNoise,
                        amplitude,
                        audioUnique,
                        cutStart,
                        cutEnd
                      }
                    }
                  });
                  if (error) throw error;
                  setAiAnalysis(data?.analysis || "");
                } catch (error) {
                  console.error('Error getting AI analysis:', error);
                  setAiAnalysis("Las ediciones aplicadas mejoran la calidad profesional del video.");
                } finally {
                  setIsLoadingAnalysis(false);
                }
              }} variant="outline" className="w-full gap-2 bg-background hover:bg-muted/50">
                    <Eye className="h-4 w-4" />
                    Ver antes/después
                  </Button>
                </div>}
              
              {/* Botón Aplicar Filtros */}
              {filterType !== 'none' && (
                <div className="mt-4">
                  <Button 
                    onClick={async () => {
                      // Determinar el ID correcto para aplicar filtros
                      const filterJobId = uploadId?.startsWith('job_') ? uploadId : currentJobId;
                      
                      if (!filterJobId) {
                        toast({
                          title: 'Error',
                          description: 'No hay un video cargado para aplicar filtros',
                          variant: 'destructive'
                        });
                        return;
                      }

                      // Convertir filtros CSS a parámetros FFmpeg
                      let filterConfig = {};
                      
                      if (filterType === 'vintage') {
                        filterConfig = {
                          brightness: 0.1,
                          contrast: 1.2,
                          saturation: 0.8
                        };
                      } else if (filterType === 'vivid') {
                        filterConfig = {
                          saturation: 1.5,
                          contrast: 1.4
                        };
                      } else if (filterType === 'cool') {
                        filterConfig = {
                          hue: 0.5,
                          saturation: 1.3,
                          brightness: 0.9
                        };
                      } else if (filterType === 'warm') {
                        filterConfig = {
                          hue: -0.3,
                          saturation: 1.3,
                          brightness: 1.1
                        };
                      } else if (filterType === 'bw') {
                        filterConfig = {
                          saturation: 0
                        };
                      }
                      
                      // Aplicar intensidad
                      Object.keys(filterConfig).forEach(key => {
                        filterConfig[key] = filterConfig[key] * (filterIntensity / 100);
                      });
                      
                      console.log('🎨 Applying filter to:', filterJobId, 'with config:', filterConfig);
                      await applyFilter(filterConfig);
                    }}
                    disabled={isApplyingFilter}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Wand2 className={`h-4 w-4 ${isApplyingFilter ? 'animate-spin' : ''}`} />
                    {isApplyingFilter ? 'Aplicando filtro...' : 'Aplicar Filtro'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Genera preview con filtro aplicado
                  </p>
                </div>
              )}
              
              {/* Botón Resetear Filtros */}
              {hasFilteredPreview() && (
                <div className="mt-2">
                  <Button 
                    onClick={resetFilters}
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Resetear Filtros
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Volver al video original
                  </p>
                </div>
              )}
              
              {/* Botón Procesar */}
              <div className="mt-4">
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing || !uploadId}
                  className="w-full shadow-glow"
                >
                  <Sparkles className={`mr-2 h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Procesando...' : 'Procesar'}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {isProcessing ? 'Generando clips...' : 'Genera 50 clips optimizados'}
                </p>
                {!uploadId && (
                  <p className="text-xs text-red-500 text-center mt-1">
                    ⚠️ No hay video cargado
                  </p>
                )}
              </div>
            </Card>

          </div>
        </div>
      </div>
      
      {/* Modal de Comparación */}
      <Dialog open={showComparisonModal} onOpenChange={(open) => {
        console.log('🎥 Modal opened, videoUrl:', videoUrl);
        setShowComparisonModal(open);
      }}>
        <DialogContent className="max-w-[90vw] sm:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-gradient-to-br from-background to-muted/20 p-3 sm:p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>Comparación de videos</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4">
            {/* Nivel de mejora - ARRIBA */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl sm:rounded-2xl border border-border/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Nivel de mejora</span>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {(() => {
                  let changePercentage = 0;
                  if (horizontalFlip) changePercentage += 15;
                  if (cameraZoom) changePercentage += 18;
                  if (filterType !== 'none') changePercentage += filterIntensity * 0.3;
                  if (overlayType !== 'none') changePercentage += overlayIntensity * 0.25;
                  if (clipIndicator !== 'none') changePercentage += 10;
                  if (ambientNoise) changePercentage += 8;
                  if (amplitude !== 1.0) changePercentage += Math.abs(amplitude - 1.0) * 10;
                  if (audioUnique) changePercentage += 12;
                  if (cutStart !== 0 || cutEnd !== 59) changePercentage += 5;
                  return Math.min(Math.round(changePercentage), 100);
                })()}%
                </span>
              </div>
              <div className="relative bg-muted rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all duration-1000 ease-out relative overflow-hidden" style={{
                width: `${(() => {
                  let changePercentage = 0;
                  if (horizontalFlip) changePercentage += 15;
                  if (cameraZoom) changePercentage += 18;
                  if (filterType !== 'none') changePercentage += filterIntensity * 0.3;
                  if (overlayType !== 'none') changePercentage += overlayIntensity * 0.25;
                  if (clipIndicator !== 'none') changePercentage += 10;
                  if (ambientNoise) changePercentage += 8;
                  if (amplitude !== 1.0) changePercentage += Math.abs(amplitude - 1.0) * 10;
                  if (audioUnique) changePercentage += 12;
                  if (cutStart !== 0 || cutEnd !== 59) changePercentage += 5;
                  return Math.min(Math.round(changePercentage), 100);
                })()}%`
              }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>

            {/* Análisis de IA - DEBAJO DEL NIVEL */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 rounded-xl sm:rounded-2xl border border-primary/30 backdrop-blur-sm shadow-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg sm:rounded-xl">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-bold text-primary mb-1 sm:mb-2">Análisis de IA</p>
                  {isLoadingAnalysis ? <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span>Analizando ediciones...</span>
                    </div> : <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">{aiAnalysis}</p>}
                </div>
              </div>
            </div>
            
            {/* Comparación lado a lado */}
            <div className="relative flex flex-col md:flex-row justify-center items-stretch gap-5 md:gap-8 max-w-full">

              {/* Video Original */}
              <div className="flex-1 max-w-full md:max-w-[22%] space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                  Original
                </div>
                <div className="relative w-full aspect-[9/16] bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-border/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl group">
                  {videoUrl ? (
                    <VideoPlayer
                      key={`original-${videoUrl}`}
                      uploadId={uploadId}
                      videoUrl={videoUrl}
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 z-20"
                      autoPlay
                      muted
                      loop
                      controls={false}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                      No video URL
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-3 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/20 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="h-1 w-8 bg-muted-foreground/30 rounded-full" />
                    Sin efectos
                  </p>
                  <ul className="text-xs text-muted-foreground/80 space-y-1 pl-3">
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground/50 mt-0.5">•</span>
                      Video en estado natural
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground/50 mt-0.5">•</span>
                      Audio original sin modificaciones
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Video Editado */}
              <div className="flex-1 max-w-full md:max-w-[22%] space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Editado
                </div>
                <div className="relative w-full aspect-[9/16] bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-500 hover:scale-[1.02] group" style={{
                borderColor: (() => {
                  let changePercentage = 0;
                  if (horizontalFlip) changePercentage += 15;
                  if (cameraZoom) changePercentage += 18;
                  if (filterType !== 'none') changePercentage += filterIntensity * 0.3;
                  if (overlayType !== 'none') changePercentage += overlayIntensity * 0.25;
                  if (clipIndicator !== 'none') changePercentage += 10;
                  if (ambientNoise) changePercentage += 8;
                  if (amplitude !== 1.0) changePercentage += Math.abs(amplitude - 1.0) * 10;
                  if (audioUnique) changePercentage += 12;
                  if (cutStart !== 0 || cutEnd !== 59) changePercentage += 5;
                  const percentage = Math.min(Math.round(changePercentage), 100);
                  if (percentage >= 60) return 'hsl(142, 76%, 36%)';
                  if (percentage < 20) return 'hsl(0, 84%, 60%)';
                  return 'hsl(var(--primary))';
                })(),
                boxShadow: (() => {
                  let changePercentage = 0;
                  if (horizontalFlip) changePercentage += 15;
                  if (cameraZoom) changePercentage += 18;
                  if (filterType !== 'none') changePercentage += filterIntensity * 0.3;
                  if (overlayType !== 'none') changePercentage += overlayIntensity * 0.25;
                  if (clipIndicator !== 'none') changePercentage += 10;
                  if (ambientNoise) changePercentage += 8;
                  if (amplitude !== 1.0) changePercentage += Math.abs(amplitude - 1.0) * 10;
                  if (audioUnique) changePercentage += 12;
                  if (cutStart !== 0 || cutEnd !== 59) changePercentage += 5;
                  const percentage = Math.min(Math.round(changePercentage), 100);
                  if (percentage >= 60) return '0 0 30px hsla(142, 76%, 36%, 0.5), 0 0 50px hsla(142, 76%, 36%, 0.2)';
                  if (percentage < 20) return '0 0 30px hsla(0, 84%, 60%, 0.5), 0 0 50px hsla(0, 84%, 60%, 0.2)';
                  return '0 0 30px hsla(var(--primary), 0.5), 0 0 50px hsla(var(--primary), 0.2)';
                })()
                }}>
                  {videoUrl ? (
                    <div className="relative w-full h-full">
                      <VideoPlayer
                        key={`edited-${hasFilteredPreview() ? filteredPreviewUrl : videoUrl}-${horizontalFlip}-${cameraZoom}-${cameraPan}-${cameraTilt}-${cameraRotate}-${cameraDolly}-${cameraShake}-${filterType}-${filterIntensity}-${overlayType}-${overlayIntensity}`}
                        uploadId={uploadId}
                        videoUrl={hasFilteredPreview() ? filteredPreviewUrl : videoUrl}
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 z-20"
                        autoPlay
                        muted
                        loop
                        controls={false}
                        style={{
                          transform: (() => {
                            const transforms = [];
                            // Aplicar flip horizontal SOLO al video
                            if (horizontalFlip) transforms.push('scaleX(-1)');
                            // Aplicar transforms de cámara
                            if (cameraZoom) transforms.push('scale(1.2)');
                            if (cameraPan) transforms.push('translateX(10%)');
                            if (cameraTilt) transforms.push('translateY(10%)');
                            if (cameraRotate) transforms.push('rotate(5deg)');
                            return transforms.length > 0 ? transforms.join(' ') : 'none';
                          })(),
                          animation: (() => {
                            const animations = [];
                            if (cameraDolly) animations.push('dollyEffect 4s ease-in-out infinite');
                            if (cameraShake) animations.push('shakeEffect 0.3s ease-in-out infinite');
                            return animations.length > 0 ? animations.join(', ') : 'none';
                          })(),
                          filter: (() => {
                            if (filterType === 'vintage') {
                              return `sepia(${filterIntensity}%) contrast(${100 + filterIntensity * 0.2}%)`;
                            }
                            if (filterType === 'vivid') {
                              return `saturate(${100 + filterIntensity * 1.5}%) contrast(${100 + filterIntensity * 0.4}%)`;
                            }
                            if (filterType === 'cool') {
                              return `hue-rotate(${filterIntensity * 0.5}deg) saturate(${100 + filterIntensity * 0.3}%) brightness(${100 - filterIntensity * 0.1}%)`;
                            }
                            if (filterType === 'warm') {
                              return `hue-rotate(${-filterIntensity * 0.3}deg) saturate(${100 + filterIntensity * 0.3}%) brightness(${100 + filterIntensity * 0.1}%)`;
                            }
                            if (filterType === 'bw') {
                              return `grayscale(${filterIntensity}%)`;
                            }
                            if (filterType === 'ai-custom' && customFilterCSS) {
                              return customFilterCSS;
                            }
                            return 'none';
                          })(),
                          opacity: filterType === 'ai-custom' && customFilterCSS ? filterIntensity / 100 : 1
                        }}
                      />
                    
                    {/* Capa de overlays animados - sobre el video pero bajo el indicador */}
                      {overlayType !== 'none' && (
                        <div className="absolute inset-0 z-[25] pointer-events-none transition-opacity duration-500" style={{ opacity: overlayIntensity / 100 }}>
                          {(overlayType === 'particles' || (overlayType === 'ai-custom' && customOverlayConfig?.type === 'particles')) && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(30)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute rounded-full shadow-xl"
                                  style={{
                                    width: `${6 + Math.random() * 10}px`,
                                    height: `${6 + Math.random() * 10}px`,
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    background: overlayType === 'ai-custom' && customOverlayConfig?.colorScheme
                                      ? customOverlayConfig.colorScheme.includes('magenta') ? 'rgba(255, 0, 255, 0.9)'
                                      : customOverlayConfig.colorScheme.includes('cyan') ? 'rgba(0, 255, 255, 0.9)'
                                      : customOverlayConfig.colorScheme.includes('green') ? 'rgba(0, 255, 100, 0.9)'
                                      : 'rgba(255, 255, 255, 0.9)'
                                      : 'rgba(255, 255, 255, 0.9)',
                                    animation: `float ${customOverlayConfig?.animationSpeed || '3s'} ease-in-out infinite`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    boxShadow: '0 0 20px currentColor'
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {(overlayType === 'sparkles' || (overlayType === 'ai-custom' && customOverlayConfig?.type === 'sparkles')) && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(25)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute animate-pulse"
                                  style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    fontSize: `${20 + Math.random() * 30}px`,
                                    animationDelay: `${Math.random() * 3}s`,
                                    animationDuration: customOverlayConfig?.animationSpeed || `${1.5 + Math.random() * 2}s`,
                                    filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))',
                                    opacity: 0.8
                                  }}
                                >
                                  ✨
                                </div>
                              ))}
                            </div>
                          )}
                          {overlayType === 'glitch' && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.5) 50%, transparent 100%)', animation: 'glitch 2s steps(10) infinite' }} />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, transparent 0%, rgba(255, 0, 255, 0.4) 50%, transparent 100%)', animation: 'glitch 1.5s steps(8) infinite reverse' }} />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(45deg, transparent 0%, rgba(0, 255, 0, 0.3) 50%, transparent 100%)', animation: 'glitch 1.8s steps(12) infinite' }} />
                            </div>
                          )}
                          {overlayType === 'vhs' && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.2) 3px)' }} />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)', animation: 'vhsTracking 4s linear infinite' }} />
                              <div className="absolute inset-0 mix-blend-color-dodge opacity-30" style={{ background: 'linear-gradient(90deg, rgba(255,0,0,0.3), rgba(0,255,0,0.3), rgba(0,0,255,0.3))' }} />
                            </div>
                          )}
                          {overlayType === 'bokeh' && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(25)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute rounded-full"
                                  style={{
                                    width: `${30 + Math.random() * 80}px`,
                                    height: `${30 + Math.random() * 80}px`,
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    background: `radial-gradient(circle, ${['rgba(255, 200, 100, 0.6)', 'rgba(100, 200, 255, 0.6)', 'rgba(255, 100, 200, 0.6)'][Math.floor(Math.random() * 3)]}, transparent 70%)`,
                                    filter: 'blur(15px)',
                                    animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
                                    animationDelay: `${Math.random() * 3}s`
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {overlayType === 'light-leak' && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute w-full h-full" style={{ background: 'radial-gradient(ellipse at top right, rgba(255, 150, 100, 0.4) 0%, transparent 50%)', animation: 'float 8s ease-in-out infinite' }} />
                              <div className="absolute w-full h-full" style={{ background: 'radial-gradient(ellipse at bottom left, rgba(100, 150, 255, 0.3) 0%, transparent 50%)', animation: 'float 6s ease-in-out infinite reverse' }} />
                            </div>
                          )}
                          {overlayType === 'film-grain' && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`, opacity: 0.4, mixBlendMode: 'overlay' }} />
                            </div>
                          )}
                          {overlayType === 'chromatic' && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(255, 0, 0, 0.1) 0%, transparent 50%, rgba(0, 0, 255, 0.1) 100%)', animation: 'glitch 3s steps(5) infinite' }} />
                            </div>
                          )}
                          {overlayType === 'lens-flare' && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute" style={{ width: '200px', height: '200px', left: '70%', top: '20%', background: 'radial-gradient(circle, rgba(255, 255, 200, 0.8) 0%, rgba(255, 200, 100, 0.4) 30%, transparent 70%)', filter: 'blur(20px)', animation: 'float 5s ease-in-out infinite' }} />
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="absolute rounded-full" style={{ width: `${20 + i * 15}px`, height: `${20 + i * 15}px`, left: `${60 - i * 8}%`, top: `${15 + i * 10}%`, background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent)', filter: 'blur(5px)' }} />
                              ))}
                            </div>
                          )}
                          {overlayType === 'rain' && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(50)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute"
                                  style={{
                                    width: '2px',
                                    height: `${20 + Math.random() * 30}px`,
                                    left: `${Math.random() * 100}%`,
                                    top: `-${Math.random() * 100}%`,
                                    background: 'linear-gradient(to bottom, transparent, rgba(200, 220, 255, 0.8))',
                                    animation: `rainDrop ${1 + Math.random() * 2}s linear infinite`,
                                    animationDelay: `${Math.random() * 3}s`
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {overlayType === 'matrix' && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(15)].map((_, i) => (
                                <div key={i} className="absolute font-mono text-green-400" style={{ left: `${i / 15 * 100}%`, top: `-${Math.random() * 100}%`, fontSize: '14px', textShadow: '0 0 8px rgba(0, 255, 0, 0.8)', animation: `matrixRain ${3 + Math.random() * 4}s linear infinite`, animationDelay: `${Math.random() * 2}s`, opacity: 0.7 }}>
                                  {Array.from({ length: 20 }, () => String.fromCharCode(33 + Math.floor(Math.random() * 94))).join('\n')}
                                </div>
                              ))}
                            </div>
                          )}
                          {overlayType === 'dna' && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(20)].map((_, i) => (
                                <div key={i} className="absolute rounded-full" style={{ width: '10px', height: '10px', left: `${50 + Math.sin(i * 0.5) * 30}%`, top: `${i / 20 * 100}%`, background: i % 2 === 0 ? 'rgba(0, 150, 255, 0.7)' : 'rgba(255, 0, 150, 0.7)', boxShadow: '0 0 10px currentColor', animation: `dnaRotate 4s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
                              ))}
                            </div>
                          )}
                          {overlayType === 'hexagon' && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(15)].map((_, i) => (
                                <div key={i} className="absolute" style={{ width: `${40 + Math.random() * 60}px`, height: `${40 + Math.random() * 60}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', border: '2px solid rgba(0, 255, 255, 0.4)', animation: `float ${4 + Math.random() * 4}s ease-in-out infinite`, animationDelay: `${Math.random() * 2}s`, boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)' }} />
                              ))}
                            </div>
                          )}
                          {overlayType === 'wave' && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(8)].map((_, i) => (
                                <div key={i} className="absolute w-full h-8" style={{ top: `${i / 8 * 100}%`, background: 'linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.2), transparent)', animation: `wave ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
                              ))}
                            </div>
                          )}
                          {overlayType === 'ai-custom' && customOverlayConfig?.type === 'geometric' && (
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(12)].map((_, i) => (
                                <div key={i} className="absolute border-2" style={{ width: `${50 + Math.random() * 100}px`, height: `${50 + Math.random() * 100}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, borderColor: customOverlayConfig.colorScheme.includes('magenta') ? 'rgba(255, 0, 255, 0.6)' : customOverlayConfig.colorScheme.includes('cyan') ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.6)', transform: `rotate(${Math.random() * 360}deg)`, animation: `float ${customOverlayConfig.animationSpeed} ease-in-out infinite`, animationDelay: `${Math.random() * 2}s`, boxShadow: '0 0 20px currentColor' }} />
                              ))}
                            </div>
                          )}
                          {overlayType === 'ai-custom' && customOverlayConfig?.type === 'neon' && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent)', animation: `glitch ${customOverlayConfig.animationSpeed} linear infinite` }} />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, transparent, rgba(255, 0, 255, 0.3), transparent)', animation: `glitch ${customOverlayConfig.animationSpeed} linear infinite reverse` }} />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {clipIndicator !== 'none' && (
                        <div className="absolute inset-0 z-[30] pointer-events-none">
                          <div 
                            className={`absolute ${
                              indicatorPosition === 'top-left' ? 'top-2 left-2' : 
                              indicatorPosition === 'top-right' ? 'top-2 right-2' : 
                              indicatorPosition === 'bottom-left' ? 'bottom-2 left-2' : 
                              'bottom-2 right-2'
                            } ${
                              indicatorStyle === 'simple' ? '' : 
                              indicatorStyle === 'badge' ? 'px-1.5 py-0.5 rounded backdrop-blur-sm' : 
                              'rounded-full flex items-center justify-center backdrop-blur-sm'
                            }`} 
                            style={{
                              fontSize: `${indicatorSize * 0.2}px`,
                              color: indicatorTextColor,
                              backgroundColor: indicatorStyle !== 'simple' ? `${indicatorBgColor}${Math.round(indicatorOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
                              fontWeight: 'bold',
                              lineHeight: 1,
                              textShadow: indicatorStyle === 'simple' ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
                              ...(indicatorStyle === 'rounded' ? {
                                width: `${indicatorSize * 0.35}px`,
                                height: `${indicatorSize * 0.35}px`,
                                minWidth: `${indicatorSize * 0.35}px`,
                                minHeight: `${indicatorSize * 0.35}px`
                              } : {})
                            }}
                          >
                            5
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg">
                      <div className="text-center p-8 space-y-3">
                        <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Cargando vista previa del video...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Por favor espera un momento
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl border border-primary/20 backdrop-blur-sm space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-2">
                    <div className="h-1 w-8 bg-primary/50 rounded-full" />
                    Mejoras aplicadas
                  </p>
                  <div className="space-y-1">
                    {horizontalFlip && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">🔄</span>
                        <span className="flex-1">Volteo horizontal para mejor composición visual</span>
                      </div>}
                    {cameraZoom && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">📹</span>
                        <span className="flex-1">Zoom dinámico ({cameraZoomDuration}s) aumenta engagement</span>
                      </div>}
                    {filterType !== 'none' && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">🎨</span>
                        <span className="flex-1">Filtro {filterType === 'ai-custom' ? customFilterName : filterType} ({filterIntensity}%) mejora estética</span>
                      </div>}
                    {overlayType !== 'none' && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">✨</span>
                        <span className="flex-1">Overlay {overlayType === 'ai-custom' ? customOverlayName : overlayType} ({overlayIntensity}%) añade impacto</span>
                      </div>}
                    {clipIndicator !== 'none' && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">🔢</span>
                        <span className="flex-1">Indicador {clipIndicator} facilita organización</span>
                      </div>}
                    {ambientNoise && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">🔊</span>
                        <span className="flex-1">Ruido ambiental añade naturalidad al audio</span>
                      </div>}
                    {amplitude !== 1.0 && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">🎚️</span>
                        <span className="flex-1">Amplitud {amplitude.toFixed(1)}x optimiza volumen</span>
                      </div>}
                    {audioUnique && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">🎵</span>
                        <span className="flex-1">Audio único evita duplicados en {audioScope}</span>
                      </div>}
                    {(cutStart !== 0 || cutEnd !== 59) && <div className="text-[10px] flex items-start gap-2 p-1.5 rounded-lg bg-background/50 backdrop-blur-sm transition-all duration-300 hover:bg-background/70">
                        <span className="text-sm">✂️</span>
                        <span className="flex-1">Corte {cutStart}s-{cutEnd}s optimiza duración</span>
                      </div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}