import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      
      // Skip if Supabase is not configured
      if (!supabase) {
        console.warn('Supabase not configured, skipping projects load');
        setProjects([]);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los proyectos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (projectData: Partial<Project>) => {
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        console.warn('Supabase not configured, skipping project creation');
        return null;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user authenticated');
      if (!projectData.name) throw new Error('Project name is required');

      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          name: projectData.name,
          description: projectData.description,
          default_seed: projectData.default_seed || 'natural',
          default_delay_mode: projectData.default_delay_mode || 'NATURAL',
          color: projectData.color || '#3b82f6',
          user_id: user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Proyecto creado',
        description: `"${projectData.name}" ha sido creado exitosamente`,
      });
      
      await loadProjects();
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el proyecto',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Proyecto actualizado',
        description: 'Los cambios se guardaron correctamente',
      });
      
      await loadProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el proyecto',
        variant: 'destructive',
      });
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Proyecto archivado',
        description: 'El proyecto ha sido archivado',
      });
      
      await loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'No se pudo archivar el proyecto',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return {
    projects,
    isLoading,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
