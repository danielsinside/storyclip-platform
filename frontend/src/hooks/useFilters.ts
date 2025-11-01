import { useState } from 'react';
import { useVideoUrls } from '@/lib/videoStore';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useFilters() {
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const { toast } = useToast();
  const { 
    currentJobId, 
    setFilteredPreviewUrl, 
    clearFilteredPreview,
    hasFilteredPreview 
  } = useVideoUrls();

  const applyFilter = async (filterConfig: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue?: number;
  }) => {
    if (!currentJobId) {
      toast({
        title: 'Error',
        description: 'No hay un video cargado para aplicar filtros',
        variant: 'destructive'
      });
      return;
    }

    setIsApplyingFilter(true);
    
    try {
      console.log('🎨 Applying filter:', filterConfig);
      
      const response = await api.applyFilter(currentJobId, filterConfig);
      
      if (response.error) {
        // FFmpeg falló - NO romper el preview actual
        console.warn('⚠️ Filter application failed:', response.message);
        toast({
          title: 'Filtro no aplicado',
          description: response.message || 'Error al procesar el filtro',
          variant: 'destructive'
        });
        return;
      }
      
      if (response.success && response.filteredPreviewUrl) {
        console.log('✅ Filter applied successfully:', response.filteredPreviewUrl);
        setFilteredPreviewUrl(response.filteredPreviewUrl);
        
        toast({
          title: 'Filtro aplicado',
          description: 'El filtro se ha aplicado correctamente',
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error applying filter:', error);
      
      // NO romper el preview actual - solo mostrar error
      toast({
        title: 'Error',
        description: error.message || 'Error al aplicar el filtro',
        variant: 'destructive'
      });
    } finally {
      setIsApplyingFilter(false);
    }
  };

  const resetFilters = () => {
    console.log('🔄 Resetting filters');
    clearFilteredPreview();
    toast({
      title: 'Filtros reseteados',
      description: 'Se ha vuelto al video original',
    });
  };

  return {
    applyFilter,
    resetFilters,
    isApplyingFilter,
    hasFilteredPreview: hasFilteredPreview(),
    currentJobId
  };
}
