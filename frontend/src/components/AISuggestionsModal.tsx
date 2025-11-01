// 🤖 Modal de Sugerencias de IA con Animación de Análisis
import { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Brain, Zap, Check, ChevronRight, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  preset: {
    seed: string;
    delayMode: string;
    clipDuration: number;
    maxClips: number;
    audio?: {
      mode: string;
      amplitude: number;
      normalize: boolean;
    };
    effects?: {
      color?: {
        enabled: boolean;
        filterType: string;
        intensity: number;
      };
      cameraMovement?: {
        zoom?: { enabled: boolean; duration: number };
      };
    };
  };
  category: 'trending' | 'creative' | 'engagement' | 'optimal';
}

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestion: (suggestion: AISuggestion) => void;
  videoDuration?: number;
  videoUrl?: string;
  onCloseToManual?: boolean; // Si debe ir a manual al cerrar
}

const mockSuggestions: AISuggestion[] = [
  {
    id: 'trend-1',
    title: '🔥 Viral Short-Form',
    description: 'Optimizado para máxima viralidad en redes sociales. Clips cortos con transiciones dinámicas.',
    confidence: 95,
    preset: {
      seed: 'viral',
      delayMode: 'NATURAL',
      clipDuration: 3,
      maxClips: 10,
      audio: {
        mode: 'alto',
        amplitude: 0.9,
        normalize: true,
      },
      effects: {
        color: {
          enabled: true,
          filterType: 'vivid',
          intensity: 85,
        },
        cameraMovement: {
          zoom: { enabled: true, duration: 2 },
        },
      },
    },
    category: 'trending',
  },
  {
    id: 'creative-1',
    title: '🎨 Estilo Cinematográfico',
    description: 'Look profesional con filtros de cine y distribución equilibrada.',
    confidence: 88,
    preset: {
      seed: 'cinematic',
      delayMode: 'CONSISTENT',
      clipDuration: 5,
      maxClips: 6,
      audio: {
        mode: 'medio',
        amplitude: 0.7,
        normalize: true,
      },
      effects: {
        color: {
          enabled: true,
          filterType: 'cinematic',
          intensity: 70,
        },
      },
    },
    category: 'creative',
  },
  {
    id: 'engagement-1',
    title: '💬 Máximo Engagement',
    description: 'Diseñado para generar comentarios y compartidos. Clips con ganchos visuales.',
    confidence: 92,
    preset: {
      seed: 'engagement',
      delayMode: 'MIXED',
      clipDuration: 4,
      maxClips: 8,
      audio: {
        mode: 'alto',
        amplitude: 0.85,
        normalize: true,
      },
      effects: {
        color: {
          enabled: true,
          filterType: 'vibrant',
          intensity: 80,
        },
        cameraMovement: {
          zoom: { enabled: true, duration: 1.5 },
        },
      },
    },
    category: 'engagement',
  },
  {
    id: 'optimal-1',
    title: '⚡ Rendimiento Óptimo',
    description: 'Balance perfecto entre calidad y velocidad de procesamiento.',
    confidence: 85,
    preset: {
      seed: 'optimal',
      delayMode: 'NATURAL',
      clipDuration: 3,
      maxClips: 7,
      audio: {
        mode: 'medio',
        amplitude: 0.8,
        normalize: true,
      },
      effects: {
        color: {
          enabled: true,
          filterType: 'standard',
          intensity: 60,
        },
      },
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
  onCloseToManual = false,
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trending':
        return 'bg-gradient-to-r from-red-500 to-orange-500';
      case 'creative':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'engagement':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'optimal':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
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

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] pointer-events-auto">
            <Card className="bg-gray-900 border-gray-800 overflow-hidden">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
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
                        <Progress value={analysisProgress} className="h-2" />
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
                        >
                          <Card
                            onClick={() => setSelectedSuggestion(suggestion.id)}
                            className={`cursor-pointer transition-all ${
                              selectedSuggestion === suggestion.id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-lg font-semibold text-white">
                                      {suggestion.title}
                                    </h4>
                                    <Badge className={`${getCategoryColor(suggestion.category)} text-white`}>
                                      {suggestion.confidence}% match
                                    </Badge>
                                  </div>
                                  <p className="text-gray-400 text-sm mb-4">
                                    {suggestion.description}
                                  </p>

                                  {/* Detalles */}
                                  <div className="flex gap-4 text-xs text-gray-500">
                                    <span>
                                      {suggestion.preset.maxClips} clips de {suggestion.preset.clipDuration}s
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Modo: {suggestion.preset.delayMode}
                                    </span>
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
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {/* Botón de aplicar */}
                    <div className="mt-6 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={onClose}
                      >
                        Configurar manualmente
                      </Button>
                      <Button
                        onClick={handleApplySuggestion}
                        disabled={!selectedSuggestion}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        Procesar con esta configuración
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}