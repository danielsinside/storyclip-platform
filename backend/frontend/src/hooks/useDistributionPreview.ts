// 📊 Hook para preview de distribución

import { useState, useEffect, useMemo } from 'react';
import { ClipDistribution, VideoConfig } from '@/types';
import { generateDistributionPreview, validateDistribution } from '@/utils/distribution';

export interface UseDistributionPreviewReturn {
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
}

export function useDistributionPreview(
  videoConfig: VideoConfig | null,
  distribution: ClipDistribution
): UseDistributionPreviewReturn {
  const [isLoading, setIsLoading] = useState(false);
  
  const validation = useMemo(() => {
    if (!videoConfig?.duration) {
      return { valid: false, errors: ['No hay video cargado'] };
    }
    
    return validateDistribution(videoConfig.duration, distribution);
  }, [videoConfig?.duration, distribution]);
  
  const preview = useMemo(() => {
    if (!videoConfig?.duration || !validation.valid) {
      return {
        totalClips: 0,
        totalDuration: 0,
        coverage: 0,
        clips: [],
      };
    }
    
    return generateDistributionPreview(videoConfig.duration, distribution);
  }, [videoConfig?.duration, distribution, validation.valid]);
  
  // Simular loading para UX
  useEffect(() => {
    if (videoConfig?.duration && validation.valid) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [videoConfig?.duration, distribution, validation.valid]);
  
  return {
    preview,
    validation,
    isLoading,
  };
}
