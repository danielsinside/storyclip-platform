import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Settings, CheckCircle2 } from 'lucide-react';
import type { Preset } from '@/types';

interface PresetCardProps {
  preset: Preset;
  onAccept: () => void;
  onCustomize: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export const PresetCard = ({ preset, onAccept, onCustomize, onRegenerate, isRegenerating }: PresetCardProps) => {
  return (
    <Card className="p-4 sm:p-6 shadow-card animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="p-3 rounded-xl bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)] self-center sm:self-start hover:bg-yellow-500/30 hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
          title="✨ Haz click para generar otra sugerencia diferente"
        >
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-yellow-400/20 rounded-xl blur-md animate-pulse" />
          
          {/* Sparkles icon with zoom pulse animation */}
          <Sparkles className={`h-6 w-6 text-yellow-400 relative z-10 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] ${
            isRegenerating 
              ? 'animate-spin' 
              : 'animate-zoom-pulse'
          }`} />
        </button>
        <div className="flex-1 w-full">
          <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center sm:text-left">
            AI-Generated Preset Ready
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 text-center sm:text-left">
            {preset?.explanation || 'Preset optimizado para redes sociales'}
          </p>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Visual Seed</p>
              <Badge variant="secondary" className="text-xs sm:text-sm capitalize">
                {preset?.seed === 'viral' ? '🔥 Viral' : 
                 preset?.seed === 'cinematica' ? '🎬 Cinematográfico' : 
                 preset?.seed === 'natural' ? '🌿 Natural' :
                 preset?.seed === 'humor' ? '😄 Humor' :
                 preset?.seed === 'impacto' ? '💥 Impacto' : preset?.seed || 'Natural'}
              </Badge>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Ritmo de Publicación</p>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {preset?.delayMode === 'FAST' ? '⚡ Rápido' :
                 preset?.delayMode === 'NATURAL' ? '🎯 Natural' :
                 preset?.delayMode === 'HYPE' ? '🚀 Hype' :
                 preset?.delayMode === 'PRO' ? '⭐ Pro' : preset?.delayMode || 'Natural'}
              </Badge>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Clips Generados</p>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                📹 {preset?.clips?.length || 0} clips • ~{preset?.clips?.length ? Math.round(preset.clips.reduce((sum, clip) => sum + (clip.end - clip.start), 0) / preset.clips.length) : 0}s/clip
              </Badge>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Audio</p>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {preset?.audio?.ambientNoise ? '🔊 Mejorado' : '🎵 Original'}
              </Badge>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Indicador de Clips</p>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {preset?.clipIndicator ? 
                  `🔢 ${preset.clipIndicator.type} (${preset.clipIndicator.position})` : 
                  '❌ Sin indicador'}
              </Badge>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Estilo</p>
              <Badge variant="secondary" className="text-xs sm:text-sm capitalize">
                {preset?.clipIndicator ? 
                  `✨ ${preset.clipIndicator.style}` : 
                  '—'}
              </Badge>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4">
            <h4 className="text-xs sm:text-sm font-semibold mb-2">Metadata Preview</h4>
            <p className="text-xs sm:text-sm mb-1 break-words">
              <span className="text-muted-foreground">Title:</span> {preset?.metadata?.title || 'Sin título'}
            </p>
            <p className="text-xs sm:text-sm mb-1 break-words">
              <span className="text-muted-foreground">Description:</span> {preset?.metadata?.description || 'Sin descripción'}
            </p>
            <p className="text-xs sm:text-sm break-words">
              <span className="text-muted-foreground">Keywords:</span> {preset?.metadata?.keywords || 'Sin palabras clave'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onAccept} className="w-full sm:flex-1 shadow-glow">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              <span className="text-sm sm:text-base">Use AI Preset</span>
            </Button>
            <Button onClick={onCustomize} variant="outline" className="w-full sm:flex-1">
              <Settings className="mr-2 h-4 w-4" />
              <span className="text-sm sm:text-base">Customize Manual</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
