// Store global para manejar URLs de video de forma estable
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VideoState {
  // URLs estables de video
  originalUrl: string | null;
  filteredPreviewUrl: string | null;
  
  // Job ID actual
  currentJobId: string | null;
  
  // Acciones
  setOriginalUrl: (url: string) => void;
  setFilteredPreviewUrl: (url: string | null) => void;
  setCurrentJobId: (jobId: string) => void;
  clearFilteredPreview: () => void;
  reset: () => void;
  
  // Helpers
  getCurrentVideoUrl: () => string | null;
  hasFilteredPreview: () => boolean;
}

export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      originalUrl: null,
      filteredPreviewUrl: null,
      currentJobId: null,
      
      // Acciones
      setOriginalUrl: (url: string) => {
        console.log('🎬 Setting original URL:', url);
        set({ originalUrl: url });
      },
      
      setFilteredPreviewUrl: (url: string | null) => {
        console.log('🎬 Setting filtered preview URL:', url);
        set({ filteredPreviewUrl: url });
      },
      
      setCurrentJobId: (jobId: string) => {
        console.log('🎬 Setting current job ID:', jobId);
        set({ currentJobId: jobId });
      },
      
      clearFilteredPreview: () => {
        console.log('🎬 Clearing filtered preview');
        set({ filteredPreviewUrl: null });
      },
      
      reset: () => {
        console.log('🎬 Resetting video store');
        set({
          originalUrl: null,
          filteredPreviewUrl: null,
          currentJobId: null
        });
      },
      
      // Helpers
      getCurrentVideoUrl: () => {
        const state = get();
        // Regla crítica: Si hay filteredPreviewUrl úsala, sino usar originalUrl
        return state.filteredPreviewUrl ?? state.originalUrl;
      },
      
      hasFilteredPreview: () => {
        const state = get();
        return state.filteredPreviewUrl !== null;
      }
    }),
    {
      name: 'video-store',
      // Solo persistir las URLs, no el jobId (se regenera en cada sesión)
      partialize: (state) => ({
        originalUrl: state.originalUrl,
        filteredPreviewUrl: state.filteredPreviewUrl
      })
    }
  )
);

// Hook helper para usar el store fácilmente
export const useVideoUrls = () => {
  const store = useVideoStore();
  
  return {
    originalUrl: store.originalUrl,
    filteredPreviewUrl: store.filteredPreviewUrl,
    currentJobId: store.currentJobId,
    currentVideoUrl: store.getCurrentVideoUrl(),
    hasFilteredPreview: store.hasFilteredPreview,
    
    // Acciones
    setOriginalUrl: store.setOriginalUrl,
    setFilteredPreviewUrl: store.setFilteredPreviewUrl,
    setCurrentJobId: store.setCurrentJobId,
    clearFilteredPreview: store.clearFilteredPreview,
    reset: store.reset
  };
};
