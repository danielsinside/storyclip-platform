import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { ClipsList } from '@/components/ClipsList';
import { LogsPanel } from '@/components/LogsPanel';
import { api } from '@/lib/api';
import { buildClipUrl } from '@/lib/storyclipClient';
import { Sparkles, Send, ArrowLeft, Download, QrCode } from 'lucide-react';
import type { StoryClip } from '@/types';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper function to save clips to database
const saveClipsToDatabase = async (
  uploadId: string,
  userId: string | undefined,
  clips: StoryClip[]
) => {
  try {
    // First, get the session_id from video_sessions using uploadId
    const { data: session, error: sessionError } = await supabase
      .from('video_sessions')
      .select('id')
      .eq('upload_id', uploadId)
      .single();

    if (sessionError || !session) {
      console.error('Error finding session:', sessionError);
      return;
    }

    const clipsData = clips.map((clip, index) => ({
      session_id: session.id,
      user_id: userId || null,
      clip_index: index,
      clip_url: clip.url,
      thumbnail_url: clip.thumbnail || null,
      duration: clip.duration || null,
      metadata: {
        title: clip.title,
        description: clip.description,
        keywords: clip.keywords
      }
    }));

    const { error } = await supabase
      .from('generated_clips')
      .upsert(clipsData, { onConflict: 'session_id,clip_index' });

    if (error) {
      console.error('Error saving clips to database:', error);
      throw error;
    }

    console.log('✅ Clips saved to database successfully');
  } catch (error) {
    console.error('Failed to save clips:', error);
  }
};

interface Log {
  type: 'start' | 'processing' | 'complete' | 'error' | 'info';
  message: string;
  timestamp?: string;
  progress?: number;
}

export default function Process() {
  const { jobId } = useParams(); // This is actually the storyId now
  const navigate = useNavigate();
  const [clips, setClips] = useState<StoryClip[]>([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isStuck, setIsStuck] = useState(false);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(Date.now());
  const [presetMetadata, setPresetMetadata] = useState<{
    metadata: { title: string; description: string; keywords: string };
    clipCount: number;
    seed: string;
  } | null>(null);

  const [uploadId, setUploadId] = useState<string>('');
  const [storyId, setStoryId] = useState<string>('');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Load story metadata from localStorage
  useEffect(() => {
    console.log('🔍 Process page mounted with jobId:', jobId);
    
    if (!jobId) {
      console.warn('⚠️ No jobId provided!');
      return;
    }
    
    // Try loading from the new format first
    const storyData = localStorage.getItem(`story_${jobId}`);
    console.log('📦 Story data from localStorage:', storyData ? 'Found' : 'Not found');
    
    if (storyData) {
      try {
        const data = JSON.parse(storyData);
        console.log('✅ Parsed story data:', data);
        setStoryId(data.storyId || jobId);
        setUploadId(data.uploadId || '');
        if (data.metadata) {
          setPresetMetadata({
            metadata: data.metadata,
            clipCount: 0,
            seed: 'natural'
          });
        }
        return;
      } catch (e) {
        console.error('❌ Failed to parse story data:', e);
      }
    }
    
    // Fallback to old format
    const stored = localStorage.getItem(`preset_${jobId}`);
    console.log('📦 Preset data from localStorage:', stored ? 'Found' : 'Not found');
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('✅ Parsed preset data:', data);
        setPresetMetadata(data);
        setStoryId(jobId); // Use jobId as storyId for backward compatibility
        if (data.uploadId) {
          setUploadId(data.uploadId);
        }
      } catch (e) {
        console.error('❌ Failed to parse preset metadata:', e);
      }
    } else {
      // No stored data, assume jobId is storyId
      console.log('📌 No stored data, using jobId as storyId:', jobId);
      setStoryId(jobId);
    }
  }, [jobId]);
  
  // Poll job status with detailed logs
  useEffect(() => {
    console.log('🔄 Polling effect triggered - jobId:', jobId, 'storyId:', storyId);
    
    if (!jobId) {
      console.warn('⚠️ No jobId, skipping polling');
      return;
    }

    // Wait for storyId to be loaded from localStorage before polling
    if (!storyId) {
      console.log('⏳ Waiting for storyId to be loaded...');
      return;
    }

    let intervalId: NodeJS.Timeout;
    let stuckCheckInterval: NodeJS.Timeout;
    let lastProgress = 0;
    let progressStuckCount = 0;

    // Add initial log
    console.log('📝 Adding initial log');
    setLogs([{ 
      type: 'start', 
      message: '🚀 Iniciando generación de StoryClips con IA...', 
      timestamp: new Date().toISOString() 
    }]);

    // Check if progress is stuck (no change for 5 minutes)
    stuckCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastProgressUpdate;
      const fiveMinutes = 5 * 60 * 1000; // Increased from 2 to 5 minutes
      
      // Only mark as stuck if:
      // 1. No progress change for 5 minutes
      // 2. Progress is between 1-99% (not at start or end)
      // 3. Job is not already marked as done
      if (timeSinceLastUpdate > fiveMinutes && progress > 0 && progress < 100 && !isDone) {
        setIsStuck(true);
        setLogs(prev => [...prev, {
          type: 'error',
          message: '⚠️ El procesamiento no avanza. Verificando estado del servidor...',
          timestamp: new Date().toISOString()
        }]);
        clearInterval(intervalId);
        clearInterval(stuckCheckInterval);
      }
    }, 30000); // Check every 30 seconds (less frequent)

    let retryCount = 0;
    const maxInitialRetries = 5; // Retry up to 5 times in the first 30 seconds
    
    const pollStatus = async () => {
      try {
        const idToUse = storyId || jobId!;
        console.log('📡 Polling job status for:', idToUse, `(attempt ${retryCount + 1})`);
        
        // Use api.getJobStatus which automatically detects format and uses correct endpoint
        const status = await api.getJobStatus(idToUse);
        console.log('📥 Received status:', JSON.stringify(status, null, 2));
        
        // Reset retry count on successful response
        retryCount = 0;
        
        // Check if response is valid
        if (!status || typeof status !== 'object') {
          console.error('❌ Invalid status response:', status);
          setIsDone(true);
          setIsStuck(true);
          setLogs(prev => [...prev, {
            type: 'error',
            message: 'No se pudo encontrar el trabajo de procesamiento',
            timestamp: new Date().toISOString()
          }]);
          clearInterval(intervalId);
          clearInterval(stuckCheckInterval);
          return;
        }
        
        // Map backend status - support both new and legacy API formats
        // New API: { jobId, status: "queued" | "processing" | "completed" | "failed", progress, outputs }
        // Legacy API: { status, queueStatus.result.outputs, ... }
        const backendStatus = (status as any).status || 'pending';
        
        // Check for outputs in multiple possible locations
        const topLevelOutputs = (status as any).outputs && Array.isArray((status as any).outputs) ? (status as any).outputs : [];
        const queueOutputs = (status as any).queueStatus?.result?.outputs && Array.isArray((status as any).queueStatus?.result?.outputs) 
          ? (status as any).queueStatus.result.outputs 
          : [];
        
        // Use outputs from either location
        const outputs = topLevelOutputs.length > 0 ? topLevelOutputs : queueOutputs;
        const hasOutputs = outputs.length > 0;
        
        // Map backend status to frontend status
        // Support: 'queued', 'pending', 'running', 'processing', 'done', 'completed', 'failed', 'canceled'
        const actualStatus = hasOutputs || backendStatus === 'done' || backendStatus === 'completed' 
          ? 'completed' 
          : backendStatus === 'canceled'
          ? 'failed'
          : backendStatus;
        
        // Calculate progress - new API includes explicit progress field
        const backendProgress = (status as any).progress || 0;
        const currentProgress = actualStatus === 'completed' ? 100 
          : actualStatus === 'processing' || actualStatus === 'running' ? Math.max(backendProgress, 30)
          : actualStatus === 'queued' ? 0
          : backendProgress;
        
        console.log('📊 Status info:', {
          backendStatus,
          actualStatus,
          currentProgress,
          hasOutputs,
          outputsCount: outputs.length,
          topLevelCount: topLevelOutputs.length,
          queueCount: queueOutputs.length,
          apiType: topLevelOutputs.length > 0 ? 'new' : 'legacy'
        });
        
        // Track if progress actually changed
        if (currentProgress !== lastProgress) {
          lastProgress = currentProgress;
          setLastProgressUpdate(Date.now());
          progressStuckCount = 0;
        } else if (currentProgress > 0 && currentProgress < 100) {
          progressStuckCount++;
        }
        
        setProgress(currentProgress);
        setMessage(actualStatus);
        
        // Progress message
        const progressMessage = (status as any).message || actualStatus;
        setMessage(progressMessage);
        
        // Calculate specific clip being generated based on progress
        if (currentProgress > 0 && currentProgress < 100 && status.status === 'processing') {
          setLogs(prev => {
            const lastLog = prev[prev.length - 1];
            const newMessage = `${progressMessage} (${Math.round(currentProgress)}%)`;
            
            // Only add log if message changed
            if (lastLog?.message !== newMessage) {
              return [...prev, {
                type: 'processing',
                message: newMessage,
                timestamp: new Date().toISOString(),
                progress: currentProgress
              }];
            }
            return prev;
          });
        }
        
        // Check for completion - either status is completed OR we have outputs
        if (actualStatus === 'completed' || hasOutputs) {
          setIsDone(true);
          setProgress(100);
          
          // We already have outputs from above
          const totalClips = outputs.length;
          
          if (totalClips === 0) {
            setLogs(prev => [...prev, {
              type: 'error',
              message: '⚠️ No se generaron clips',
              timestamp: new Date().toISOString()
            }]);
            clearInterval(intervalId);
            clearInterval(stuckCheckInterval);
            return;
          }
          
          setLogs(prev => [...prev, {
            type: 'complete',
            message: `✅ ${totalClips} clip${totalClips > 1 ? 's' : ''} generado${totalClips > 1 ? 's' : ''} exitosamente`,
            timestamp: new Date().toISOString()
          }]);
          
          // Backend outputs: convert paths to full URLs if needed
          const clipUrls = outputs.map((output: any) => {
            if (typeof output === 'string') return output;
            // If it's a path, convert to URL; if it's already a URL, use it
            const pathOrUrl = output.url || output.path || '';
            if (pathOrUrl.startsWith('http')) return pathOrUrl;
            // Convert path to URL
            return `https://story.creatorsflow.app${pathOrUrl}`;
          }).filter(Boolean) as string[];

          // Generate unique titles and descriptions for each clip
          const baseTitle = presetMetadata?.metadata?.title || 'StoryClip';
          const baseDescription = presetMetadata?.metadata?.description || 'Contenido increíble';
          const keywords = presetMetadata?.metadata?.keywords || '';

          // Function to get video duration
          const getVideoDuration = (url: string): Promise<number> => {
            return new Promise((resolve) => {
              const video = document.createElement('video');
              video.preload = 'metadata';
              video.onloadedmetadata = () => {
                resolve(video.duration);
                video.remove();
              };
              video.onerror = () => {
                resolve(59); // fallback duration
                video.remove();
              };
              video.src = url;
            });
          };

          // Get durations for all clips
          const clipsWithDurations = await Promise.all(
            clipUrls.map(async (url, i) => {
              const clipNumber = i + 1;
              const duration = await getVideoDuration(url);
              
              // Create unique variations for each clip
              const variations = [
                { prefix: '✨', suffix: `- Parte ${clipNumber}` },
                { prefix: '🔥', suffix: `#${clipNumber}` },
                { prefix: '💫', suffix: `| Clip ${clipNumber}` },
                { prefix: '⭐', suffix: `(${clipNumber}/${totalClips})` },
                { prefix: '🎬', suffix: `- Episodio ${clipNumber}` }
              ];
              const variation = variations[i % variations.length];
              
              return {
                clipIndex: clipNumber,
                title: `${variation.prefix} ${baseTitle} ${variation.suffix}`,
                description: `${baseDescription} ${keywords ? `\n\n${keywords}` : ''}`,
                duration: Math.round(duration * 10) / 10, // Round to 1 decimal
                seed: (presetMetadata?.seed as any) || 'natural',
                url
              };
            })
          );
          
          setClips(clipsWithDurations);
          
          // Store clips with metadata for publish page
          localStorage.setItem(`clips_${jobId}`, JSON.stringify(clipsWithDurations));
          
          // Save clips to database
          if (uploadId) {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              await saveClipsToDatabase(uploadId, user?.id, clipsWithDurations);
            } catch (error) {
              console.error('Error saving clips to database:', error);
            }
          }
          
          // Stop all polling immediately
          clearInterval(intervalId);
          clearInterval(stuckCheckInterval);
          return; // Exit immediately to prevent further polling
        } else if (actualStatus === 'failed' || actualStatus === 'error' || backendStatus === 'error') {
          setIsDone(true);
          setIsStuck(true);
          const errorMsg = (status as any).error?.message || (status as any).message || 'El procesamiento falló inesperadamente';
          setMessage(errorMsg);
          setProgress((status as any).progress || 0);
          setLogs(prev => [...prev, {
            type: 'error',
            message: `❌ Error en el procesamiento: ${errorMsg}`,
            timestamp: new Date().toISOString()
          }]);
          
          // Stop all polling immediately
          clearInterval(intervalId);
          clearInterval(stuckCheckInterval);
          return; // Exit immediately to prevent further polling
        }
      } catch (error: any) {
        console.error('Error polling status:', error);
        
        // If it's a 404 in the first 30 seconds, it might just be that the backend is slow
        const is404 = error.message?.includes('404') || error.message?.includes('not found');
        
        if (is404 && retryCount < maxInitialRetries) {
          retryCount++;
          console.log(`⏳ Job not found yet, will retry (${retryCount}/${maxInitialRetries})`);
          setLogs(prev => {
            const lastLog = prev[prev.length - 1];
            const retryMessage = `⏳ Esperando a que el trabajo esté disponible... (intento ${retryCount}/${maxInitialRetries})`;
            
            if (lastLog?.message !== retryMessage) {
              return [...prev, {
                type: 'info',
                message: retryMessage,
                timestamp: new Date().toISOString()
              }];
            }
            return prev;
          });
          return; // Continue polling
        }
        
        // More specific error handling
        const errorMessage = is404
          ? 'No se encontró el trabajo. Puede que haya expirado o el ID sea inválido.'
          : error.message?.includes('network') || error.message?.includes('fetch')
          ? 'Error de conexión con el servidor. Verificando conexión...'
          : 'Error al obtener el estado del proceso';
        
        setLogs(prev => {
          const lastLog = prev[prev.length - 1];
          // Don't spam the same error
          if (lastLog?.message !== errorMessage) {
            return [...prev, {
              type: 'error',
              message: errorMessage,
              timestamp: new Date().toISOString()
            }];
          }
          return prev;
        });
        
        // If it's a 404 after retries, stop polling
        if (is404 && retryCount >= maxInitialRetries) {
          setIsDone(true);
          setIsStuck(true);
          clearInterval(intervalId);
          clearInterval(stuckCheckInterval);
        }
      }
    };

    // Initial poll with delay to give backend time to register the job
    const initialDelay = setTimeout(() => {
      pollStatus();
    }, 3000); // Wait 3 seconds before first poll
    
    // Only start polling if not already done
    if (!isDone) {
      intervalId = setInterval(() => {
        // Double-check before each poll
        if (!isDone) {
          pollStatus();
        } else {
          clearInterval(intervalId);
          clearInterval(stuckCheckInterval);
        }
      }, 5000); // Poll every 5 seconds (increased from 2.5s to reduce load)
    }

    return () => {
      clearTimeout(initialDelay);
      clearInterval(intervalId);
      clearInterval(stuckCheckInterval);
    };

  }, [jobId, storyId, isDone]); // Added storyId as dependency

  const handlePublish = () => {
    navigate(`/publish/${jobId}`);
  };

  const handleGenerateQR = async () => {
    try {
      // Create a mobile download page URL
      const baseUrl = window.location.origin;
      const downloadUrl = `${baseUrl}/mobile-download/${jobId}`;

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataUrl(qrDataUrl);
      setShowQRDialog(true);

      setLogs(prev => [...prev, {
        type: 'info',
        message: '📱 Código QR generado para descarga móvil',
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setLogs(prev => [...prev, {
        type: 'error',
        message: '❌ Error al generar código QR',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <div className="min-h-screen gradient-subtle">
      <Header />
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => uploadId ? navigate(`/manual/${uploadId}`) : navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {uploadId ? 'Volver a configuración' : 'Volver'}
          </Button>
        </div>
        
        <h1 className="text-4xl font-bold mb-8 text-center">
          <span className="text-gradient">{isDone ? (message.includes('detenido') ? '⚠️ Procesamiento Detenido' : '✨ Procesamiento Completado') : '🎬 Procesando Video Editado'}</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${isDone ? 'bg-success/20' : 'bg-primary/20 animate-pulse-glow'}`}>
                <Sparkles className={`h-6 w-6 ${isDone ? 'text-success' : 'text-primary'}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">AI Processing</h2>
                <p className="text-sm text-muted-foreground">
                  {isDone ? '¡Completado con todos los efectos!' : 'Aplicando efectos y generando clips...'}
                </p>
              </div>
            </div>
            
            <ProgressBar
              current={progress}
              total={100}
              label="Progreso de Procesamiento"
              variant={isDone ? 'success' : 'default'}
            />

            {isDone && !isStuck && (
              <Button
                onClick={handlePublish}
                className="w-full mt-6 shadow-glow"
                size="lg"
              >
                <Send className="mr-2 h-5 w-5" />
                Publish to Stories
              </Button>
            )}

            {isStuck && (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-destructive text-center font-medium">
                  ⚠️ Procesamiento detenido
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  El progreso no ha cambiado en los últimos 5 minutos. El job podría haber fallado o el servidor puede estar caído.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => uploadId ? navigate(`/manual/${uploadId}`) : navigate('/')}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {uploadId ? 'Configuración manual' : 'Inicio'}
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <LogsPanel 
            logs={logs} 
            title="Proceso de Generación" 
            isActive={!isDone} 
          />
        </div>

        {clips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                <span className="text-gradient">Clips Generados</span>
              </h2>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {clips.length} clips
                </Badge>
                <Button
                  onClick={handleGenerateQR}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  Descargar con QR
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setLogs(prev => [...prev, {
                        type: 'info',
                        message: '📦 Iniciando descarga de clips...',
                        timestamp: new Date().toISOString()
                      }]);

                      const zip = new JSZip();

                      setLogs(prev => [...prev, {
                        type: 'info',
                        message: `⬇️ Descargando ${clips.length} clips...`,
                        timestamp: new Date().toISOString()
                      }]);

                      // Descargar todos los videos y agregarlos al ZIP
                      // Invertir orden para iOS (último clip primero)
                      for (let i = 0; i < clips.length; i++) {
                        const clip = clips[i];
                        try {
                          setLogs(prev => [...prev, {
                            type: 'info',
                            message: `📥 Descargando clip ${i + 1}/${clips.length}...`,
                            timestamp: new Date().toISOString()
                          }]);

                          // Descargar directamente desde la URL del clip (backend de StoryClip)
                          const response = await fetch(clip.url);

                          if (!response.ok) {
                            throw new Error(`Failed to download clip: ${response.statusText}`);
                          }

                          const blob = await response.blob();
                          // Invertir numeración: último clip = 001, primero = 050
                          const invertedIndex = clips.length - clip.clipIndex + 1;
                          const filename = `clip_${String(invertedIndex).padStart(3, '0')}.mp4`;
                          zip.file(filename, blob);
                        } catch (error) {
                          console.error(`Error descargando clip ${clip.clipIndex}:`, error);
                          setLogs(prev => [...prev, {
                            type: 'error',
                            message: `❌ Error en clip ${clip.clipIndex}`,
                            timestamp: new Date().toISOString()
                          }]);
                        }
                      }

                      setLogs(prev => [...prev, {
                        type: 'info',
                        message: '🗜️ Comprimiendo clips en archivo ZIP...',
                        timestamp: new Date().toISOString()
                      }]);

                      // Generar el archivo ZIP
                      const zipBlob = await zip.generateAsync({ type: 'blob' });

                      // Descargar el ZIP
                      const url = window.URL.createObjectURL(zipBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `clips_${jobId || 'export'}.zip`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      setLogs(prev => [...prev, {
                        type: 'complete',
                        message: '✅ Descarga completada exitosamente',
                        timestamp: new Date().toISOString()
                      }]);
                    } catch (error) {
                      console.error('Error creando ZIP:', error);
                      setLogs(prev => [...prev, {
                        type: 'error',
                        message: '❌ Error al crear archivo ZIP',
                        timestamp: new Date().toISOString()
                      }]);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar todos (.zip)
                </Button>
              </div>
            </div>
            <ClipsList clips={clips} />
          </div>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descargar en iPhone</DialogTitle>
            <DialogDescription>
              Escanea este código QR desde tu iPhone para descargar todos los videos en un archivo ZIP
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeDataUrl && (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-64 h-64 border-2 border-gray-200 rounded-lg"
              />
            )}
            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p className="font-medium">Instrucciones:</p>
              <ol className="text-left space-y-1 list-decimal list-inside">
                <li>Abre la cámara de tu iPhone</li>
                <li>Apunta al código QR</li>
                <li>Toca la notificación que aparece</li>
                <li>Presiona "Descargar en móvil"</li>
                <li>Se descargará un archivo ZIP con todos los videos</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
