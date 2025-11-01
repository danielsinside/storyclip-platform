import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, Sparkles, ArrowRight, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStoryclip } from '@/hooks/useStoryclip';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';

interface RecentSession {
  upload_id: string;
  filename: string;
  created_at: string;
  status: string;
  video_url: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadAndProcess, busy, error: storyclipError, jobId: processedJobId } = useStoryclip();
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration));
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const lastProgressUpdateRef = useRef<number>(0);

  // Load recent sessions on mount
  useEffect(() => {
    loadRecentSessions();
  }, []);

  const loadRecentSessions = async () => {
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        console.warn('Supabase not configured, skipping recent sessions load');
        setRecentSessions([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('video_sessions')
        .select('upload_id, filename, created_at, status, video_url')
        .eq('status', 'configuring')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      if (data) setRecentSessions(data);
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  };

  const handleDeleteSession = async (uploadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        console.warn('Supabase not configured, skipping session deletion');
        return;
      }
      
      const { error } = await supabase
        .from('video_sessions')
        .delete()
        .eq('upload_id', uploadId);

      if (error) throw error;

      toast({
        title: 'Video eliminado',
        description: 'La sesión ha sido eliminada correctamente',
      });

      // Reload sessions
      loadRecentSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la sesión',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a video file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10GB)
    const maxSize = 10 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a video smaller than 10GB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setIsProcessing(false);
    setUploadId(null);
    setUploadProgress(0);
    lastProgressUpdateRef.current = 0;

    try {
      // Start upload and duration extraction in parallel - don't block upload waiting for duration
      const [result, duration] = await Promise.all([
        uploadAndProcess(file, (progress) => {
          const now = Date.now();
          // Update UI max every 200ms OR when reaching 100%
          if (now - lastProgressUpdateRef.current >= 200 || progress === 100) {
            setUploadProgress(progress);
            lastProgressUpdateRef.current = now;
          }
        }),
        getVideoDuration(file).catch((err) => {
          console.warn('Failed to get video duration:', err);
          return 60; // Fallback to 60s if duration extraction fails
        })
      ]);
      
      console.log('✅ Upload completed - Duration:', duration, 'seconds');
      console.log('✅ Result:', result);
      
      if (!result.uploadId) {
        throw new Error('Upload failed - no uploadId returned');
      }
      
      setUploadId(result.uploadId);
      
      toast({
        title: 'Upload complete!',
        description: 'Generating AI preset suggestions...',
      });

      console.log('🚀 Navigating to preset page...');
      
      // Save initial session to database immediately after upload (if Supabase is configured)
      if (supabase) {
        await supabase.from('video_sessions').upsert({
          upload_id: result.uploadId,
          filename: file.name,
          filesize: file.size,
          duration: duration,
          video_url: result.videoUrl,
          status: 'configuring',
          created_at: new Date().toISOString()
        });
      }
      
          // Persistir estado para /preset (soporta refresh y acceso directo)
          localStorage.setItem(
            `preset_state_${result.uploadId}`,
            JSON.stringify({ 
              uploadId: result.uploadId, 
              videoUrl: result.videoUrl, 
              duration, 
              filename: file.name, 
              filesize: file.size 
            })
          );
          
          // Navigate to preset page with duration parameter and video URL
          navigate(`/preset/${result.uploadId}`, { 
            state: { 
              uploadId: result.uploadId,
              videoUrl: result.videoUrl,
              duration,
              filename: file.name,
              filesize: file.size
            } 
          });
      
    } catch (error) {
      console.error('Upload/Process error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Processing failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };


  return (
    <div className="min-h-screen gradient-subtle">
      <Header />
      <div className="container max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-gradient">StoryClips</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-Powered Story Generation from Your Videos
          </p>
        </div>

        {/* Upload Card */}
        <Card className="p-12 shadow-card text-center animate-fade-in">
          <div className="max-w-md mx-auto">
            <div className="mb-6 inline-flex p-4 rounded-2xl bg-primary/20 shadow-glow">
              <UploadIcon className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Upload Your Video</h2>
            <p className="text-muted-foreground mb-6">
              Upload a video and our AI will analyze it to create the perfect Story clips
            </p>
            <label htmlFor="video-upload">
              <Button
                size="lg"
                className="cursor-pointer shadow-glow"
                disabled={isUploading || isProcessing || busy}
                asChild
              >
                <span>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {isProcessing ? 'Processing with AI...' : isUploading ? 'Uploading...' : 'Choose Video'}
                </span>
              </Button>
            </label>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading || isProcessing || busy}
            />
            {isUploading && uploadProgress > 0 && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  Uploading: {uploadProgress}%
                </p>
              </div>
            )}
            {isProcessing && (
              <div className="mt-4">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <p className="text-sm text-muted-foreground">
                    Processing video with AI...
                  </p>
                </div>
              </div>
            )}
            {storyclipError && (
              <p className="text-sm text-destructive mt-4">{storyclipError}</p>
            )}
          </div>
        </Card>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <h3 className="text-xl font-semibold mb-4 text-center">Videos Recientes</h3>
            <div className="grid gap-4">
              {recentSessions.map((session) => (
                <Card 
                  key={session.upload_id} 
                  className="p-4 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    // Persistir estado para sesiones recientes también
                    localStorage.setItem(
                      `preset_state_${session.upload_id}`,
                      JSON.stringify({
                        uploadId: session.upload_id,
                        videoUrl: session.video_url,
                        duration: 60, // Default duration for recent sessions
                        filename: session.filename,
                        filesize: 0 // Default filesize for recent sessions
                      })
                    );
                    navigate(`/preset/${session.upload_id}`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{session.filename || 'Video sin nombre'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()} - {new Date(session.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => handleDeleteSession(session.upload_id, e)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
