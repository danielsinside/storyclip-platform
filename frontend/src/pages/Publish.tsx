import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreatorSelector } from '@/components/CreatorSelector';
import { PublishOptions, PublishMode } from '@/components/PublishOptions';
import { api } from '@/lib/api';
import { Rocket, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoryClip } from '@/types';
import Header from '@/components/Header';

const ClipsList = lazy(() => import('@/components/ClipsList').then(m => ({ default: m.ClipsList })));

export default function Publish() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clips, setClips] = useState<StoryClip[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedCreators, setSelectedCreators] = useState<Array<{ id: string; blogId: string; name: string }>>([]);
  const [isLoadingClips, setIsLoadingClips] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMode, setPublishMode] = useState<PublishMode>('now');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState({
    published: 0,
    failed: 0,
    total: 0,
    currentStory: '',
    status: 'idle',
    waitProgress: { elapsed: 0, total: 0 }
  });
  
  useEffect(() => {
    const loadClips = async () => {
      if (!jobId) {
        setIsLoadingClips(false);
        return;
      }
      
      setIsLoadingClips(true);
      
      try {
        // Try to load clips from localStorage first (they have metadata)
        const storedClips = localStorage.getItem(`clips_${jobId}`);
        if (storedClips) {
          const parsedClips = JSON.parse(storedClips);
          setClips(parsedClips);
          console.log('Loaded clips from localStorage:', parsedClips);
          setIsLoadingClips(false);
          return;
        }
        
        // Load from API
        const jobStatus = await api.getJobStatus(jobId);
        console.log('Job status:', jobStatus);
        
        if (jobStatus.outputs && jobStatus.outputs.length > 0) {
          const loadedClips: StoryClip[] = jobStatus.outputs.map((url: string, index: number) => ({
            clipIndex: index + 1,
            title: `Clip ${index + 1}`,
            duration: 59,
            seed: 'natural' as const,
            url
          }));
          setClips(loadedClips);
          console.log('Loaded clips from API:', loadedClips);
        }
      } catch (error) {
        console.error('Error loading clips:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los clips',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingClips(false);
      }
    };
    
    loadClips();
  }, [jobId, toast]);



  const handlePublishModeChange = (mode: PublishMode, date?: Date) => {
    setPublishMode(mode);
    setScheduledDate(date);
  };

  const handleStartPublish = async () => {
    console.log('🚀 Starting publish via backend API');

    if (!jobId) {
      toast({
        title: 'Error',
        description: 'No job ID found',
        variant: 'destructive',
      });
      return;
    }

    if (selectedCreators.length === 0) {
      toast({
        title: 'No creators selected',
        description: 'Please select at least one creator',
        variant: 'destructive',
      });
      return;
    }

    if (clips.length === 0) {
      toast({
        title: 'No clips available',
        description: 'No clips to publish',
        variant: 'destructive',
      });
      return;
    }

    // Validate scheduled date if mode is scheduled
    if (publishMode === 'scheduled' && !scheduledDate) {
      toast({
        title: 'Fecha requerida',
        description: 'Por favor selecciona una fecha y hora para la publicación programada',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);

    try {
      const creator = selectedCreators[0];

      // Call backend API to publish stories
      const apiKey = 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3';

      const response = await fetch('https://story.creatorsflow.app/api/metricool/publish/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-Tenant': 'stories'
        },
        body: JSON.stringify({
          jobId,
          posts: clips.map(clip => ({
            id: `clip_${clip.clipIndex}`,
            url: clip.url,
            text: clip.description || clip.title || `Story ${clip.clipIndex}`
          })),
          schedule: publishMode === 'scheduled' ? {
            mode: 'scheduled',
            scheduledAt: scheduledDate?.toISOString()
          } : { mode: 'now' },
          settings: {
            accountId: creator.blogId,
            metricoolAccountId: creator.blogId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to publish: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Publish started:', result);

      setBatchId(result.batchId);
      setPublishProgress({
        published: 0,
        failed: 0,
        total: clips.length,
        currentStory: '',
        status: 'uploading',
        waitProgress: { elapsed: 0, total: 0 }
      });
      setHasStarted(true);

      toast({
        title: 'Publicación iniciada',
        description: `${clips.length} historias enviadas a Metricool`,
      });

      // Poll for status updates
      pollBatchStatus(result.batchId);

    } catch (error) {
      console.error('❌ Error publishing:', error);
      toast({
        title: 'Error al publicar',
        description: error instanceof Error ? error.message : 'Por favor intenta de nuevo',
        variant: 'destructive',
      });
      setIsPublishing(false);
    }
  };

  const pollBatchStatus = async (batchId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    const apiKey = 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3';

    const poll = async () => {
      try {
        const response = await fetch(`https://story.creatorsflow.app/api/metricool/status?batchId=${batchId}`, {
          headers: {
            'X-API-Key': apiKey,
            'X-Tenant': 'stories'
          }
        });
        const status = await response.json();

        setPublishProgress({
          published: status.posts?.published || 0,
          failed: status.posts?.failed || 0,
          total: status.posts?.total || 0,
          currentStory: status.currentStory || '',
          status: status.currentStatus || 'uploading',
          waitProgress: status.waitProgress || { elapsed: 0, total: 0 }
        });

        if (status.status === 'completed' || status.status === 'failed') {
          setIsPublishing(false);

          if (status.status === 'completed') {
            toast({
              title: '¡Publicación completada!',
              description: `${status.posts.published} historias publicadas exitosamente`,
            });
          } else {
            toast({
              title: 'Publicación con errores',
              description: `${status.posts.published} exitosas, ${status.posts.failed} fallidas`,
              variant: 'destructive',
            });
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setIsPublishing(false);
      }
    };

    poll();
  };

  return (
    <div className="min-h-screen gradient-subtle">
      <Header />
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (isPublishing) {
                const confirmed = window.confirm(
                  '⚠️ La publicación está en progreso. Si sales ahora, no podrás ver los logs en tiempo real. ¿Estás seguro?'
                );
                if (!confirmed) return;
              }
              navigate(-1);
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
        
        <h1 className="text-4xl font-bold mb-8 text-center">
          <span className="text-gradient">Publish to Stories</span>
        </h1>

        {!hasStarted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <PublishOptions
              onModeChange={handlePublishModeChange}
              disabled={isLoadingClips || clips.length === 0}
            />
            <div className="lg:col-span-2 space-y-6">
              <CreatorSelector onSelectionChange={setSelectedCreators} />
              <Card className="p-8 shadow-card text-center animate-fade-in">
                <div className="max-w-md mx-auto">
                  <div className="mb-6 inline-flex p-4 rounded-2xl bg-primary/20 shadow-glow">
                    <Rocket className="h-12 w-12 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-4">Ready to Publish</h2>
                  <p className="text-muted-foreground mb-6">
                    {isLoadingClips 
                      ? 'Cargando clips...'
                      : clips.length > 0 
                        ? `Tienes ${clips.length} clip(s) listo(s). Selecciona creadores y opciones de publicación.`
                        : 'No hay clips disponibles'
                    }
                  </p>
                  <Button 
                    onClick={handleStartPublish} 
                    size="lg" 
                    className="shadow-glow relative"
                    disabled={isLoadingClips || clips.length === 0 || selectedCreators.length === 0 || isPublishing || (publishMode === 'scheduled' && !scheduledDate)}
                  >
                    {isPublishing ? (
                      <>
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-5 w-5" />
                        {isLoadingClips ? 'Cargando...' : 'Iniciar Publicación'}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {hasStarted && (
          <>
            <Card className="p-6 shadow-card mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${isPublishing ? 'bg-blue-500/20' : 'bg-success/20'}`}>
                  {isPublishing ? (
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {isPublishing ? 'Publicando...' : '¡Publicación Completada!'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isPublishing
                      ? `Progreso: ${publishProgress.published + publishProgress.failed} / ${publishProgress.total}`
                      : 'Los clips se enviaron a Metricool exitosamente'
                    }
                  </p>
                </div>
              </div>

              <div className={`p-4 border rounded-lg ${isPublishing ? 'bg-blue-50 border-blue-200' : 'bg-success/10 border-success/20'}`}>
                {isPublishing ? (
                  <div className="space-y-4">
                    {/* Main Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">
                          Historia {publishProgress.published + publishProgress.failed + 1} de {publishProgress.total}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round((publishProgress.published + publishProgress.failed) / publishProgress.total * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${(publishProgress.published + publishProgress.failed) / publishProgress.total * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className="flex items-center gap-2 text-sm">
                      {publishProgress.status === 'uploading' && (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                          <span>Subiendo historia a Metricool...</span>
                        </>
                      )}
                      {publishProgress.status === 'waiting' && (
                        <>
                          <div className="animate-pulse h-4 w-4 bg-yellow-500 rounded-full" />
                          <span className="flex flex-col gap-1">
                            <span>
                              Esperando confirmación de Facebook ({publishProgress.waitProgress.elapsed}s / {publishProgress.waitProgress.total}s)
                            </span>
                            {publishProgress.waitProgress.attempt && (
                              <span className="text-xs text-muted-foreground">
                                Intento #{publishProgress.waitProgress.attempt}
                                {publishProgress.waitProgress.currentStatus && ` · Status: ${publishProgress.waitProgress.currentStatus}`}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                      {publishProgress.status === 'published' && (
                        <>
                          <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                          <span>Historia publicada exitosamente</span>
                        </>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{publishProgress.published}</div>
                        <div className="text-xs text-muted-foreground">Publicadas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{publishProgress.failed}</div>
                        <div className="text-xs text-muted-foreground">Fallidas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{publishProgress.total - publishProgress.published - publishProgress.failed}</div>
                        <div className="text-xs text-muted-foreground">Pendientes</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-success font-semibold text-center">
                      ✨ {publishProgress.published} de {publishProgress.total} historias publicadas exitosamente
                    </p>
                    {publishProgress.failed > 0 && (
                      <p className="text-destructive text-sm text-center mt-2">
                        ⚠️ {publishProgress.failed} historias fallaron
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Puedes ver el estado en tu panel de Metricool
                    </p>
                  </>
                )}
              </div>
            </Card>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Clips Publicados</h2>
              <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Cargando clips...</div>}>
                <ClipsList clips={clips} />
              </Suspense>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
