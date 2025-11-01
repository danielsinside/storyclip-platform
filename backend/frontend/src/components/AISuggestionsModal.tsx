// 🤖 Modal de Sugerencias de IA con Animación de Análisis
'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Brain, Zap, Check, ChevronRight, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  filters: string[];
  distribution: {
    mode: 'automatic' | 'manual' | 'mixed';
    clipDuration: number;
    maxClips: number;
  };
  overlay?: {
    style: string;
    position: string;
  };
  category: 'trending' | 'creative' | 'engagement' | 'optimal';
}

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestion: (suggestion: AISuggestion) => void;
  videoDuration?: number;
  videoUrl?: string;
}

const mockSuggestions: AISuggestion[] = [
  {
    id: 'trend-1',
    title: '🔥 Viral Short-Form',
    description: 'Optimizado para máxima viralidad en redes sociales. Clips cortos con transiciones dinámicas.',
    confidence: 95,
    filters: ['vintage', 'saturate'],
    distribution: {
      mode: 'automatic',
      clipDuration: 3,
      maxClips: 10,
    },
    overlay: {
      style: 'gradient',
      position: 'bottom',
    },
    category: 'trending',
  },
  {
    id: 'creative-1',
    title: '🎨 Estilo Cinematográfico',
    description: 'Look profesional con filtros de cine y distribución equilibrada.',
    confidence: 88,
    filters: ['cinematic', 'grayscale'],
    distribution: {
      mode: 'manual',
      clipDuration: 5,
      maxClips: 6,
    },
    overlay: {
      style: 'film',
      position: 'top',
    },
    category: 'creative',
  },
  {
    id: 'engagement-1',
    title: '💬 Máximo Engagement',
    description: 'Diseñado para generar comentarios y compartidos. Clips con ganchos visuales.',
    confidence: 92,
    filters: ['sharpen', 'vibrance'],
    distribution: {
      mode: 'mixed',
      clipDuration: 4,
      maxClips: 8,
    },
    overlay: {
      style: 'neon',
      position: 'center',
    },
    category: 'engagement',
  },
  {
    id: 'optimal-1',
    title: '⚡ Rendimiento Óptimo',
    description: 'Balance perfecto entre calidad y velocidad de procesamiento.',
    confidence: 85,
    filters: ['enhance'],
    distribution: {
      mode: 'automatic',
      clipDuration: 3,
      maxClips: 7,
    },
    category: 'optimal',
  },
];

export default function AISuggestionsModal({
  isOpen,
  onClose,
  onApplySuggestion,
  videoDuration,
  videoUrl,
}: AISuggestionsModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Simular análisis de IA
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setSuggestions([]);
      setSelectedSuggestion(null);

      // Animación de progreso
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Mostrar sugerencias después del análisis
      setTimeout(() => {
        setIsAnalyzing(false);
        setSuggestions(mockSuggestions);
      }, 2500);

      return () => clearInterval(progressInterval);
    }
  }, [isOpen]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trending':
        return '🔥';
      case 'creative':
        return '🎨';
      case 'engagement':
        return '💬';
      case 'optimal':
        return '⚡';
      default:
        return '✨';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trending':
        return 'from-red-500 to-orange-500';
      case 'creative':
        return 'from-purple-500 to-pink-500';
      case 'engagement':
        return 'from-blue-500 to-cyan-500';
      case 'optimal':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const handleApplySuggestion = () => {
    const suggestion = suggestions.find((s) => s.id === selectedSuggestion);
    if (suggestion) {
      onApplySuggestion(suggestion);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Sugerencias Inteligentes de IA
                    </h2>
                    <p className="text-white/80 text-sm mt-1">
                      Análisis basado en tendencias y mejores prácticas
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {isAnalyzing ? (
                // Animación de análisis
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12"
                >
                  <div className="flex flex-col items-center justify-center space-y-6">
                    {/* Icono animado */}
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 p-1"
                      >
                        <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-white" />
                        </div>
                      </motion.div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-30 blur-xl"
                      />
                    </div>

                    {/* Texto de estado */}
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Analizando tu video con IA
                      </h3>
                      <p className="text-gray-400">
                        Identificando las mejores opciones para maximizar el impacto
                      </p>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full max-w-md">
                      <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                          initial={{ width: '0%' }}
                          animate={{ width: `${analysisProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-center text-sm text-gray-400 mt-2">
                        {analysisProgress}% completado
                      </p>
                    </div>

                    {/* Pasos del análisis */}
                    <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
                      {[
                        { icon: Wand2, label: 'Detectando escenas', done: analysisProgress > 30 },
                        { icon: Zap, label: 'Analizando tendencias', done: analysisProgress > 60 },
                        { icon: Sparkles, label: 'Generando sugerencias', done: analysisProgress > 90 },
                      ].map((step, index) => (
                        <div
                          key={index}
                          className={`flex flex-col items-center gap-2 ${
                            step.done ? 'text-green-400' : 'text-gray-500'
                          }`}
                        >
                          <step.icon className="w-5 h-5" />
                          <span className="text-xs text-center">{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                // Mostrar sugerencias
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Recomendaciones personalizadas para tu video
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Selecciona una sugerencia para aplicar automáticamente la configuración óptima
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {suggestions.map((suggestion) => (
                      <motion.div
                        key={suggestion.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedSuggestion(suggestion.id)}
                        className={`relative cursor-pointer rounded-xl border-2 transition-all ${
                          selectedSuggestion === suggestion.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                      >
                        {/* Badge de confianza */}
                        <div className="absolute top-4 right-4">
                          <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(suggestion.category)} text-white text-xs font-semibold`}>
                            {suggestion.confidence}% match
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            {/* Icono de categoría */}
                            <div className={`text-3xl`}>
                              {getCategoryIcon(suggestion.category)}
                            </div>

                            {/* Contenido */}
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-white mb-2">
                                {suggestion.title}
                              </h4>
                              <p className="text-gray-400 text-sm mb-4">
                                {suggestion.description}
                              </p>

                              {/* Detalles */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Filtros</p>
                                  <div className="flex flex-wrap gap-1">
                                    {suggestion.filters.map((filter) => (
                                      <span
                                        key={filter}
                                        className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                                      >
                                        {filter}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Distribución</p>
                                  <p className="text-sm text-gray-300">
                                    {suggestion.distribution.maxClips} clips de {suggestion.distribution.clipDuration}s
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Indicador de selección */}
                            {selectedSuggestion === suggestion.id && (
                              <div className="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-full">
                                <Check className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Botón de aplicar */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Configurar manualmente
                    </button>
                    <button
                      onClick={handleApplySuggestion}
                      disabled={!selectedSuggestion}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                        selectedSuggestion
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Aplicar sugerencia
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}