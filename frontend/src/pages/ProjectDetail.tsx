import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Video, Scissors, Loader2, Settings } from "lucide-react";
import type { Project } from "@/types";

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [clips, setClips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);

      // Load clips
      const { data: clipsData, error: clipsError } = await supabase
        .from('generated_clips')
        .select('*, video_sessions!inner(project_id)')
        .eq('video_sessions.project_id', projectId)
        .order('created_at', { ascending: false });

      if (clipsError) throw clipsError;
      setClips(clipsData || []);
    } catch (error) {
      console.error('Error loading project data:', error);
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>Proyecto no encontrado</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Proyectos
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: project.color || '#3b82f6' }}
                />
                <h1 className="text-3xl font-bold">{project.name}</h1>
              </div>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/?projectId=' + projectId)}>
                <Upload className="w-4 h-4 mr-2" />
                Subir Video
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Videos</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Video className="w-6 h-6" />
                  {project.total_videos}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Clips Generados</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Scissors className="w-6 h-6" />
                  {project.total_clips}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Configuración</CardDescription>
                <CardTitle className="text-lg">
                  {project.default_seed} / {project.default_delay_mode}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
            <TabsTrigger value="clips">Clips ({clips.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4">
            {videos.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Video className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hay videos en este proyecto</h3>
                  <p className="text-muted-foreground mb-4">Sube tu primer video para comenzar</p>
                  <Button onClick={() => navigate('/?projectId=' + projectId)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base truncate">
                        {video.filename || video.upload_id}
                      </CardTitle>
                      <CardDescription>
                        {new Date(video.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estado:</span>
                          <span className="font-medium capitalize">{video.status}</span>
                        </div>
                        {video.duration && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duración:</span>
                            <span>{video.duration}s</span>
                          </div>
                        )}
                        {video.job_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => navigate(`/process/${video.job_id}`)}
                          >
                            Ver Detalles
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="clips" className="space-y-4">
            {clips.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Scissors className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hay clips generados</h3>
                  <p className="text-muted-foreground">Procesa un video para generar clips</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {clips.map((clip) => (
                  <Card key={clip.id} className="overflow-hidden">
                    {clip.thumbnail_url && (
                      <div className="aspect-video bg-muted">
                        <img
                          src={clip.thumbnail_url}
                          alt={`Clip ${clip.clip_index}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Clip #{clip.clip_index}</CardTitle>
                      {clip.duration && (
                        <CardDescription>{clip.duration}s</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(clip.clip_url, '_blank')}
                      >
                        Ver Clip
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
};

export default ProjectDetail;
