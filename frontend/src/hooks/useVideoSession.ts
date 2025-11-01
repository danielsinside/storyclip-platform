import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sessionSchema } from '@/lib/validation';
import { z } from 'zod';

export interface VideoSessionData {
  // Video metadata
  filename?: string;
  filesize?: number;
  duration?: number;
  videoUrl?: string;
  
  // Configuration state
  seed?: string;
  delayMode?: string;
  title?: string;
  description?: string;
  keywords?: string;
  
  // Audio settings
  ambientNoise?: boolean;
  amplitude?: number;
  cutStart?: number;
  cutEnd?: number;
  
  // Audio originality
  audioUnique?: boolean;
  audioMode?: string;
  audioScope?: string;
  audioSeed?: string;
  
  // Clip indicators
  clipIndicator?: string;
  indicatorPosition?: string;
  indicatorSize?: number;
  indicatorTextColor?: string;
  indicatorBgColor?: string;
  indicatorOpacity?: number;
  indicatorStyle?: string;
  
  // Visual filters
  filterType?: string;
  filterIntensity?: number;
  customFilterCss?: string;
  customFilterName?: string;
  
  // Animated overlays
  overlayType?: string;
  overlayIntensity?: number;
  customOverlayName?: string;
  customOverlayConfig?: any;
  
  // Visual transformations
  horizontalFlip?: boolean;
  cameraZoom?: boolean;
  cameraZoomDuration?: number;
  cameraPan?: boolean;
  cameraTilt?: boolean;
  cameraRotate?: boolean;
  cameraDolly?: boolean;
  cameraShake?: boolean;
  
  // Manual clips configuration
  manualClips?: Array<{ start: number; end: number }>;
  
  // Status
  status?: string;
  jobId?: string;
}

export function useVideoSession(uploadId: string | undefined) {
  const [sessionData, setSessionData] = useState<VideoSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load session on mount or when uploadId changes
  useEffect(() => {
    if (!uploadId) {
      setIsLoading(false);
      return;
    }

    // Reset sessionData when uploadId changes to force reload
    setSessionData(null);
    setIsLoading(true);
    loadSession();
  }, [uploadId]);

  const loadSession = async () => {
    if (!uploadId) return;

    // Skip Supabase if not configured
    if (!supabase) {
      console.warn('Supabase not configured, skipping session load');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('upload_id', uploadId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        console.log('Session loaded:', data);
        
        // Fix video URL to use correct domain with multiple fallbacks
        let videoUrl = data.video_url || "";
        let urlWasCorrected = false;
        
        console.log('🔍 Original video_url from DB:', videoUrl);
        
        if (videoUrl) {
          // Replace incorrect domain with correct one
          const correctedUrl = videoUrl.replace('https://api.creatorsflow.app/', 'https://story.creatorsflow.app/');
          if (correctedUrl !== videoUrl) {
            videoUrl = correctedUrl;
            urlWasCorrected = true;
            console.log('🔧 Corrected video URL (domain fix):', videoUrl);
          }
        } else {
          // Try localStorage first
          const cachedUrl = localStorage.getItem(`videoUrl_${data.upload_id}`);
          if (cachedUrl) {
            videoUrl = cachedUrl;
            urlWasCorrected = true;
            console.log('📦 Retrieved video URL from localStorage:', videoUrl);
          } else if (data.upload_id) {
            // Fallback: construct URL if not in DB or localStorage (use local server)
            videoUrl = `http://144.126.129.34:3000/outputs/uploads/${data.upload_id}.mp4`;
            urlWasCorrected = true;
            console.log('🔧 Constructed video URL from uploadId (local):', videoUrl);
          }
        }
        
        // Update DB with corrected URL if needed
        if (urlWasCorrected && videoUrl) {
          console.log('💾 Updating session with corrected video URL...');
          await supabase
            .from('video_sessions')
            .update({ video_url: videoUrl })
            .eq('upload_id', uploadId);
        }
        
        console.log('✅ Final video URL:', videoUrl);
        
        setSessionData({
          filename: data.filename,
          filesize: data.filesize,
          duration: data.duration,
          videoUrl: videoUrl,
          seed: data.seed,
          delayMode: data.delay_mode,
          title: data.title,
          description: data.description,
          keywords: data.keywords,
          ambientNoise: data.ambient_noise,
          amplitude: data.amplitude,
          cutStart: data.cut_start,
          cutEnd: data.cut_end,
          audioUnique: data.audio_unique,
          audioMode: data.audio_mode,
          audioScope: data.audio_scope,
          audioSeed: data.audio_seed,
          clipIndicator: data.clip_indicator,
          indicatorPosition: data.indicator_position,
          indicatorSize: data.indicator_size,
          indicatorTextColor: data.indicator_text_color,
          indicatorBgColor: data.indicator_bg_color,
          indicatorOpacity: data.indicator_opacity,
          indicatorStyle: data.indicator_style,
          filterType: data.filter_type,
          filterIntensity: data.filter_intensity,
          customFilterCss: data.custom_filter_css,
          customFilterName: data.custom_filter_name,
          overlayType: data.overlay_type,
          overlayIntensity: data.overlay_intensity,
          customOverlayName: data.custom_overlay_name,
          customOverlayConfig: data.custom_overlay_config,
          horizontalFlip: data.horizontal_flip,
          cameraZoom: data.camera_zoom,
          cameraZoomDuration: data.camera_zoom_duration,
          cameraPan: data.camera_pan,
          cameraTilt: data.camera_tilt,
          cameraRotate: data.camera_rotate,
          cameraDolly: data.camera_dolly,
          cameraShake: data.camera_shake,
          manualClips: Array.isArray(data.manual_clips) 
            ? data.manual_clips as Array<{ start: number; end: number }>
            : [{ start: 0, end: 59 }],
          status: data.status,
          jobId: data.job_id,
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = useCallback(async (data: VideoSessionData) => {
    if (!uploadId) return;

    // Skip Supabase if not configured
    if (!supabase) {
      console.warn('Supabase not configured, skipping session save');
      return;
    }

    setIsSaving(true);
    try {
      // Validate input data
      const validated = sessionSchema.parse(data);

      const sessionRecord = {
        upload_id: uploadId,
        filename: validated.filename,
        filesize: validated.filesize,
        duration: validated.duration,
        video_url: validated.videoUrl,
        seed: validated.seed,
        delay_mode: validated.delayMode,
        title: validated.title,
        description: validated.description,
        keywords: validated.keywords,
        ambient_noise: validated.ambientNoise,
        amplitude: validated.amplitude,
        cut_start: validated.cutStart,
        cut_end: validated.cutEnd,
        audio_unique: validated.audioUnique,
        audio_mode: validated.audioMode,
        audio_scope: validated.audioScope,
        audio_seed: validated.audioSeed,
        clip_indicator: validated.clipIndicator,
        indicator_position: validated.indicatorPosition,
        indicator_size: validated.indicatorSize,
        indicator_text_color: validated.indicatorTextColor,
        indicator_bg_color: validated.indicatorBgColor,
        indicator_opacity: validated.indicatorOpacity,
        indicator_style: validated.indicatorStyle,
        filter_type: validated.filterType,
        filter_intensity: validated.filterIntensity ? Math.round(validated.filterIntensity) : undefined,
        custom_filter_css: validated.customFilterCss,
        custom_filter_name: validated.customFilterName,
        overlay_type: validated.overlayType,
        overlay_intensity: validated.overlayIntensity ? Math.round(validated.overlayIntensity) : undefined,
        custom_overlay_name: validated.customOverlayName,
        custom_overlay_config: validated.customOverlayConfig,
        horizontal_flip: validated.horizontalFlip,
        camera_zoom: validated.cameraZoom,
        camera_zoom_duration: validated.cameraZoomDuration,
        camera_pan: validated.cameraPan,
        camera_tilt: validated.cameraTilt,
        camera_rotate: validated.cameraRotate,
        camera_dolly: validated.cameraDolly,
        camera_shake: validated.cameraShake,
        manual_clips: validated.manualClips,
        status: validated.status,
        job_id: validated.jobId,
      };

      const { error } = await supabase
        .from('video_sessions')
        .upsert(sessionRecord, { onConflict: 'upload_id' });

      if (error) throw error;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error',
        description: 'No se pudo guardar la sesión',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [uploadId, toast]);

  const completeSession = useCallback(async (jobId: string) => {
    if (!uploadId) return;

    // Skip Supabase if not configured
    if (!supabase) {
      console.warn('Supabase not configured, skipping session completion');
      return;
    }

    try {
      const { error } = await supabase
        .from('video_sessions')
        .update({
          status: 'completed',
          job_id: jobId,
          completed_at: new Date().toISOString(),
        })
        .eq('upload_id', uploadId);

      if (error) throw error;

      console.log('Session completed');
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [uploadId]);

  return {
    sessionData,
    isLoading,
    isSaving,
    saveSession,
    completeSession,
  };
}
