import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle, XCircle, Clock, Download, Maximize2, Send } from 'lucide-react';
import type { StoryClip } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import PublishButton from '@/components/PublishButton';

interface ClipsListProps {
  clips: StoryClip[];
  publishStatus?: Record<number, 'pending' | 'publishing' | 'published' | 'failed'>;
}

export const ClipsList = ({ clips, publishStatus = {} }: ClipsListProps) => {
  const [playingClip, setPlayingClip] = useState<number | null>(null);
  const [fullscreenClip, setFullscreenClip] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<Set<number>>(new Set());
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [isHoverPreview, setIsHoverPreview] = useState(false);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const getStatusIcon = (clipIndex: number) => {
    const status = publishStatus[clipIndex] || 'pending';
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'publishing':
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (clipIndex: number) => {
    const status = publishStatus[clipIndex] || 'pending';
    const variants: Record<string, any> = {
      published: 'default',
      failed: 'destructive',
      publishing: 'secondary',
      pending: 'outline',
    };
    const labels: Record<string, string> = {
      published: 'Publicado',
      failed: 'Error',
      publishing: 'Publicando',
      pending: 'Pendiente',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const handleHoverPlay = (clipIndex: number) => {
    if (isSequencePlaying) return; // Don't preview if sequence is playing
    
    const video = videoRefs.current.get(clipIndex);
    if (video && !loadError.has(clipIndex)) {
      setIsHoverPreview(true);
      video.play().catch(err => console.log('Play failed:', err));
      setPlayingClip(clipIndex);
    }
  };

  const handleHoverStop = (clipIndex: number) => {
    if (isSequencePlaying) return; // Don't stop if sequence is playing
    
    const video = videoRefs.current.get(clipIndex);
    if (video && isHoverPreview) {
      video.pause();
      video.currentTime = 0.1;
      setPlayingClip(null);
      setIsHoverPreview(false);
    }
  };

  const startSequence = (startClipIndex: number) => {
    // Stop all videos first
    videoRefs.current.forEach(video => {
      video.pause();
      video.currentTime = 0.1;
    });

    setIsSequencePlaying(true);
    setIsHoverPreview(false);
    
    const video = videoRefs.current.get(startClipIndex);
    if (video && !loadError.has(startClipIndex)) {
      video.play().catch(err => console.log('Play failed:', err));
      setPlayingClip(startClipIndex);
    }
  };

  const stopSequence = () => {
    setIsSequencePlaying(false);
    if (playingClip !== null) {
      const video = videoRefs.current.get(playingClip);
      if (video) {
        video.pause();
        video.currentTime = 0.1;
      }
      setPlayingClip(null);
    }
  };

  const playNextClip = (currentClipIndex: number) => {
    if (!isSequencePlaying) return;
    
    const currentIndex = clips.findIndex(clip => clip.clipIndex === currentClipIndex);
    if (currentIndex !== -1 && currentIndex < clips.length - 1) {
      const nextClip = clips[currentIndex + 1];
      const nextVideo = videoRefs.current.get(nextClip.clipIndex);
      if (nextVideo && !loadError.has(nextClip.clipIndex)) {
        nextVideo.play().catch((error) => {
          console.error('Error playing next video:', error);
        });
        setPlayingClip(nextClip.clipIndex);
      }
    } else {
      // End of playlist
      setIsSequencePlaying(false);
      setPlayingClip(null);
    }
  };

  const handleDownload = async (url: string, clipIndex: number) => {
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        console.warn('Supabase not configured, using direct download');
        // Fallback to direct download
        const link = document.createElement('a');
        link.href = url;
        link.download = `clip_${clipIndex + 1}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-clip`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ videoUrl: url }),
        }
      );

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `clip_${String(clipIndex).padStart(3, '0')}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading clip:', error);
    }
  };

  return (
    <>
      {/* Timeline view - horizontal scroll */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-min">
          {clips.map((clip, index) => (
            <Card
              key={clip.clipIndex}
              className="group overflow-hidden hover:shadow-glow transition-all duration-300 animate-fade-in border-border/50 hover:border-primary/50 flex-shrink-0"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div 
                className="relative w-32 h-56 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden cursor-pointer"
                onMouseEnter={() => handleHoverPlay(clip.clipIndex)}
                onMouseLeave={() => handleHoverStop(clip.clipIndex)}
                onClick={(e) => {
                  // Only handle click if it's directly on the video area, not buttons
                  if ((e.target as HTMLElement).closest('button')) return;
                  
                  if (isSequencePlaying && playingClip === clip.clipIndex) {
                    stopSequence();
                  } else {
                    startSequence(clip.clipIndex);
                  }
                }}
              >
                <video 
                  ref={(el) => {
                    if (el && !videoRefs.current.has(clip.clipIndex)) {
                      videoRefs.current.set(clip.clipIndex, el);
                    }
                  }}
                  src={clip.url} 
                  className="w-full h-full object-cover pointer-events-none"
                  preload="metadata"
                  loop={false}
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    if (video.readyState >= 2 && video.currentTime === 0) {
                      video.currentTime = 0.1;
                    }
                  }}
                  onEnded={() => {
                    // Auto-play next clip in sequence
                    playNextClip(clip.clipIndex);
                  }}
                  onError={() => {
                    setLoadError(prev => new Set(prev).add(clip.clipIndex));
                  }}
                />
                
                {/* Overlay controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-1 right-1 flex gap-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-6 w-6 rounded-full shadow-lg pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenClip(clip.url);
                      }}
                      title="Ver en pantalla completa"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-6 w-6 rounded-full shadow-lg pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(clip.url, clip.clipIndex);
                      }}
                      title="Descargar clip"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Publish button - shown at bottom */}
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                    <PublishButton 
                      mediaUrl={clip.url}
                      caption={`Clip ${clip.clipIndex}`}
                    />
                  </div>
                  
                  {playingClip !== clip.clipIndex && !loadError.has(clip.clipIndex) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-primary/90 rounded-full p-2 shadow-glow">
                        <Play className="h-4 w-4 text-primary-foreground" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  
                  {isSequencePlaying && playingClip === clip.clipIndex && (
                    <div className="absolute bottom-2 left-2 pointer-events-none">
                      <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0">
                        En secuencia
                      </Badge>
                    </div>
                  )}
                  
                  {loadError.has(clip.clipIndex) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-destructive/90 rounded-lg p-2 shadow-lg">
                        <p className="text-white text-[10px]">Error</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                {publishStatus && Object.keys(publishStatus).length > 0 && (
                  <div className="absolute bottom-1 left-1">
                    {getStatusIcon(clip.clipIndex)}
                  </div>
                )}
              </div>

              {/* Compact info below */}
              <div className="px-2 py-1.5 bg-card/50">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-black/70 text-white font-mono text-[10px] px-1.5 py-0">
                      #{String(clip.clipIndex).padStart(3, '0')}
                    </Badge>
                    <span className="font-medium text-muted-foreground">
                      {clip.duration.toFixed(1)}s
                    </span>
                  </div>
                  {publishStatus && Object.keys(publishStatus).length > 0 && (
                    <div className="scale-75 origin-right">
                      {getStatusBadge(clip.clipIndex)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenClip && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
          onClick={() => setFullscreenClip(null)}
        >
          <div className="relative max-w-md w-full aspect-[9/16]">
            <video
              src={fullscreenClip}
              className="w-full h-full object-contain"
              controls
              autoPlay
              loop
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setFullscreenClip(null)}
            >
              <XCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
