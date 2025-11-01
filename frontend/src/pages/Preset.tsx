import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PresetCard } from '@/components/PresetCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import type { Preset } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { buildPresetContext } from '@/lib/presetContext';
import AISuggestionsModal from '@/components/AISuggestionsModal';

export default function PresetPage() {
  const { presetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showPreset, setShowPreset] = useState(false);
  const [thinkingDots, setThinkingDots] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  
  // Construir contexto robusto usando el helper
  const ctx = buildPresetContext(presetId, location);
  
  // Si no tenemos lo mínimo indispensable, mostrar mensaje y volver
  if (!ctx) {
    return (
      <div className="p-6 text-sm text-red-300">
        Missing upload context. Please upload a video again.
        <button className="ml-3 underline" onClick={() => navigate('/')}>Go back</button>
      </div>
    );
  }
  
  // Usar ctx en lugar de las variables individuales
  const duration = ctx.duration;
  const filename = ctx.filename;
  const filesize = ctx.filesize;
  const videoUrl = ctx.videoUrl;

  useEffect(() => {
    console.log('📹 Preset page - videoUrl:', videoUrl);
    console.log('📊 Preset page - ctx:', ctx);
    console.log('🆔 Preset page - presetId:', presetId);
    console.log('📍 Preset page - location.state:', location.state);
  }, [videoUrl, ctx, presetId, location.state]);

  // Animate thinking dots
  useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      setThinkingDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [loading]);

  const generateAIPreset = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verify we have duration information
      if (!duration || duration <= 0) {
        throw new Error('Video duration information is missing. Please re-upload the video.');
      }

      // Check if Supabase is disabled
      const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';
      if (!useSupabase) {
        console.warn('[Preset] Supabase disabled, using local presets');
        
        // Use local presets instead of Supabase
        const localPreset = {
          id: 'local-auto',
          name: 'Story Optimized',
          title: 'Story Optimized', // <- asegurar título
          description: 'Optimized for social media stories',
          clipDuration: Math.min(15, Math.max(5, Math.floor((ctx.duration || 60) / 4))),
          maxClips: Math.min(10, Math.max(3, Math.floor((ctx.duration || 60) / 10))),
          audio: {
            normalize: true,
            loudnessTarget: -16,
            ambientNoise: false,
            amplitude: 0.8,
            unique: true,
            mode: 'medio',
            scope: 'clip',
            seed: 'auto',
            cutStart: 0,
            cutEnd: duration
          },
          effects: {
            color: {
              enabled: true,
              filterType: 'vivid',
              intensity: 75
            },
            cameraMovement: {
              zoom: { enabled: true, duration: 2 },
              pan: { enabled: false },
              tilt: { enabled: false },
              rotate: { enabled: false },
              dolly: { enabled: false },
              shake: { enabled: false }
            }
          },
          clipIndicator: {
            enabled: true,
            type: 'box',
            position: 'top-left',
            size: 80,
            textColor: '#ffffff',
            bgColor: '#000000',
            opacity: 0.8,
            style: 'box'
          }
        };
        
        setPreset(localPreset);
        setLoading(false);
        return;
      }

      // Call edge function to generate AI preset with higher temperature for variety
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-preset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploadId: presetId,
            filename: filename || 'video.mp4',
            filesize: filesize || null,
            duration: duration
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate preset: ${response.status}`);
      }

      const aiPreset = await response.json();
      
      // Use AI preset directly (it already has the correct structure)
      const newPreset = {
        presetId: aiPreset.presetId,
        creatorId: aiPreset.creatorId,
        seed: aiPreset.seed,
        delayMode: aiPreset.delayMode,
        clips: aiPreset.clips || [],
        duration: aiPreset.duration || 60,
        audio: aiPreset.audio,
        clipIndicator: aiPreset.clipIndicator,
        metadata: aiPreset.metadata,
        explanation: aiPreset.explanation
      };
      
      setPreset(newPreset);
      
      // Add a brief delay before showing the preset for better UX
      setTimeout(() => {
        setShowPreset(true);
      }, 800);

    } catch (err: any) {
      console.error('Error generating AI preset:', err);
      setError(err.message || 'Failed to generate AI preset');
      
      toast({
        title: 'AI Generation Failed',
        description: 'Using fallback configuration...',
        variant: 'destructive'
      });

      // Fallback to mock preset if AI fails
      setTimeout(() => {
        setPreset({
          presetId: presetId!,
          creatorId: 'fallback',
          seed: 'viral',
          delayMode: 'NATURAL',
          clips: [
            { start: 0, end: 15 },
            { start: 20, end: 35 },
            { start: 40, end: 55 }
          ],
          duration: 60,
          audio: {
            ambientNoise: true,
            amplitude: 0.7
          },
          metadata: {
            title: 'StoryClips (Fallback)',
            description: 'Default configuration',
            keywords: 'viral,natural,storyclips'
          },
          explanation: 'Usando configuración por defecto debido a error en generación de IA.'
        });
        setError(null);
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!presetId) return;

    // Verificar si viene de la página Manual con indicación de mostrar modal
    const shouldShowModal = location.state?.showModal !== false;

    if (shouldShowModal) {
      // Mostrar el modal de sugerencias
      setShowAIModal(true);
      setLoading(false); // No mostrar la animación de carga original
    } else {
      // Si explícitamente no debe mostrar modal, no hacer nada
      setLoading(false);
    }
  }, [presetId, location.state?.showModal]);

  const loadSessionData = async () => {
    try {
      // Skip Supabase if disabled
      if (import.meta.env.VITE_USE_SUPABASE === 'false' || import.meta.env.VITE_PRESET_SOURCE === 'local') {
        console.warn('[Preset] Supabase disabled, skipping session data load');
        setShowPreset(false);
        generateAIPreset();
        return;
      }
      
      const { data, error } = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/video_sessions?upload_id=eq.${presetId}&select=*`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          }
        }
      ).then(r => r.json());

      if (error) throw error;
      if (data && data.length > 0) {
        const session = data[0];
        // Update location state with loaded data
        Object.assign(location.state || {}, {
          duration: session.duration,
          filename: session.filename,
          filesize: session.filesize,
          videoUrl: session.video_url
        });
        setShowPreset(false);
        generateAIPreset();
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la sesión del video',
        variant: 'destructive'
      });
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setShowPreset(false);
    toast({
      title: 'Generando nueva sugerencia',
      description: 'La IA está creando una configuración diferente...',
    });
    await generateAIPreset();
    setIsRegenerating(false);
    toast({
      title: '¡Nueva sugerencia lista!',
      description: 'Revisa la nueva configuración optimizada',
    });
  };

  const handleAccept = async () => {
    if (!presetId || !preset) return;

    try {
      console.log('🔄 Accepting preset with clipIndicator:', preset.clipIndicator);
      
      // Skip Supabase if disabled
      if (import.meta.env.VITE_USE_SUPABASE !== 'false' && import.meta.env.VITE_PRESET_SOURCE !== 'local') {
        // Import supabase only if enabled
        const { supabase } = await import('@/integrations/supabase/client');
        
        // First, save clip indicator configuration to video_sessions
        if (preset.clipIndicator && supabase) {
          console.log('💾 Saving clip indicator to database:', {
            clip_indicator: preset.clipIndicator.type,
            indicator_position: preset.clipIndicator.position,
            indicator_size: preset.clipIndicator.size,
            indicator_text_color: preset.clipIndicator.textColor,
            indicator_bg_color: preset.clipIndicator.bgColor,
            indicator_opacity: preset.clipIndicator.opacity,
            indicator_style: preset.clipIndicator.style
          });
          
          const { error: updateError } = await supabase
            .from('video_sessions')
            .update({
              clip_indicator: preset.clipIndicator.type,
              indicator_position: preset.clipIndicator.position,
              indicator_size: preset.clipIndicator.size,
              indicator_text_color: preset.clipIndicator.textColor,
              indicator_bg_color: preset.clipIndicator.bgColor,
              indicator_opacity: preset.clipIndicator.opacity,
              indicator_style: preset.clipIndicator.style
            })
            .eq('upload_id', presetId);
          
          if (updateError) {
            console.error('❌ Error updating clip indicator:', updateError);
          } else {
            console.log('✅ Clip indicator configuration saved to session');
          }
        } else {
          console.warn('⚠️ No clipIndicator in preset to save or Supabase disabled');
        }
      } else {
        console.warn('⚠️ Supabase disabled, skipping database operations');
      }
      
      // Send the AI-generated preset configuration to the backend
      const response = await api.processVideo({
        uploadId: presetId,
        mode: 'manual',
        manual: {
          seed: preset.seed,
          delayMode: preset.delayMode,
          clips: preset.clips,
          duration: preset.duration,
          audio: preset.audio,
          metadata: preset.metadata
        }
      });
      
      toast({
        title: 'Procesando con IA',
        description: 'Generando tus StoryClips con la configuración optimizada...',
      });
      
      // Store preset metadata in localStorage to use later when clips are ready
      localStorage.setItem(`preset_${response.jobId}`, JSON.stringify({
        metadata: preset.metadata,
        clipCount: preset.clips.length,
        seed: preset.seed,
        uploadId: presetId // Include uploadId for navigation back to manual config
      }));
      
      navigate(`/process/${response.jobId}`);
    } catch (error) {
      console.error('Error accepting preset:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start processing',
        variant: 'destructive',
      });
    }
  };

  const handleCustomize = () => {
    navigate(`/manual/${presetId}`, {
      state: {
        duration,
        filename,
        filesize,
        videoUrl // Pass the video URL to manual page
      }
    });
  };

  const handleCloseAIModal = () => {
    setShowAIModal(false);
    navigate(`/manual/${presetId}`, {
      state: {
        duration,
        filename,
        filesize,
        videoUrl,
        showModal: false  // Para que no vuelva a mostrar el modal si regresa
      }
    });
  };

  // Handler para aplicar sugerencia del modal y procesar directamente
  const handleApplyAISuggestion = async (suggestion: any) => {
    // Cerrar el modal
    setShowAIModal(false);

    // Mostrar notificación
    toast({
      title: '✨ Procesando con configuración seleccionada',
      description: `Aplicando: ${suggestion.title}`,
    });

    // Procesar directamente con el preset seleccionado
    try {
      // Construir la configuración manual basada en la sugerencia
      const manualConfig = {
        seed: suggestion.preset.seed || 'viral',
        delayMode: suggestion.preset.delayMode || 'NATURAL',
        clips: suggestion.preset.maxClips
          ? Array.from({ length: suggestion.preset.maxClips }, (_, i) => ({
              start: i * suggestion.preset.clipDuration,
              end: (i + 1) * suggestion.preset.clipDuration
            }))
          : [],
        audio: suggestion.preset.audio || {
          mode: 'medio',
          amplitude: 0.8,
          normalize: true,
        },
        metadata: {
          title: suggestion.title,
          description: suggestion.description,
          keywords: `${suggestion.preset.seed}, story, clips, ${suggestion.category}`
        }
      };

      // Llamar a processVideo con el formato correcto
      const response = await api.processVideo({
        uploadId: presetId!,
        mode: 'manual',
        manual: manualConfig
      });

      console.log('Process response:', response);

      toast({
        title: 'Procesando con IA',
        description: 'Generando tus StoryClips con la configuración optimizada...',
      });

      // Store preset metadata in localStorage para la página de proceso
      localStorage.setItem(`story_${response.jobId}`, JSON.stringify({
        storyId: response.storyId || presetId,
        uploadId: presetId,
        metadata: manualConfig.metadata
      }));

      // También guardar en el formato antiguo por compatibilidad
      localStorage.setItem(`preset_${response.jobId}`, JSON.stringify({
        metadata: manualConfig.metadata,
        clipCount: manualConfig.clips.length,
        seed: manualConfig.seed,
        uploadId: presetId
      }));

      // Navegar a la página de procesamiento
      navigate(`/process/${response.jobId}`);
    } catch (error) {
      console.error('Error processing with AI suggestion:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar con la sugerencia',
        variant: 'destructive',
      });
    }
  };


  if (error && !preset) {
    return (
      <div className="min-h-screen gradient-subtle">
        <Header />
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
          <Card className="p-6 max-w-md">
            <p className="text-destructive mb-4">⚠️ {error}</p>
            <Button onClick={() => navigate('/')}>Volver al inicio</Button>
          </Card>
        </div>
      </div>
    );
  }

  // Mostrar la página principal con el modal mientras no hay preset
  return (
    <div className="min-h-screen gradient-subtle">
      <Header />
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
        
        {/* Solo mostrar contenido cuando hay preset */}
        {preset ? (
          <>
            {/* Title with delayed fade-in */}
            <h1 className={`text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center transition-all duration-700 ${
              showPreset ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}>
              <span className="text-gradient">✨ Sugerencia de IA</span>
            </h1>

            {/* Preset card with staggered fade-in */}
            <div className={`transition-all duration-700 delay-200 ${
              showPreset ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <PresetCard
                preset={preset}
                onAccept={handleAccept}
                onCustomize={handleCustomize}
                onRegenerate={handleRegenerate}
                isRegenerating={isRegenerating}
              />
            </div>
          </>
        ) : (
          // Placeholder mientras se muestra el modal
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center text-gray-400">
              {/* Empty - modal will show */}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Sugerencias de IA */}
      <AISuggestionsModal
        isOpen={showAIModal}
        onClose={handleCloseAIModal}
        onApplySuggestion={handleApplyAISuggestion}
        videoDuration={duration}
        videoUrl={videoUrl}
        onCloseToManual={true}
      />
    </div>
  );
}
