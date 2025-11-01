-- Create enum types if not exist (they already exist from creator_profiles)
-- No need to recreate seed_type and delay_mode

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Default configuration
  default_seed seed_type DEFAULT 'natural',
  default_delay_mode delay_mode DEFAULT 'NATURAL',
  default_creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  tags TEXT[],
  color TEXT DEFAULT '#3b82f6',
  
  -- Stats (updated by triggers)
  total_videos INTEGER DEFAULT 0,
  total_clips INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT projects_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_is_active ON public.projects(is_active);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add project_id to video_sessions (nullable for backwards compatibility)
ALTER TABLE public.video_sessions
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Index for project lookups
CREATE INDEX idx_video_sessions_project_id ON public.video_sessions(project_id);

-- Function to update project stats
CREATE OR REPLACE FUNCTION public.update_project_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If video_session was added/removed
  IF TG_TABLE_NAME = 'video_sessions' THEN
    IF TG_OP = 'INSERT' AND NEW.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET total_videos = total_videos + 1,
          updated_at = now()
      WHERE id = NEW.project_id;
    ELSIF TG_OP = 'DELETE' AND OLD.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET total_videos = GREATEST(total_videos - 1, 0),
          updated_at = now()
      WHERE id = OLD.project_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
      -- Moving between projects
      IF OLD.project_id IS NOT NULL THEN
        UPDATE public.projects
        SET total_videos = GREATEST(total_videos - 1, 0),
            updated_at = now()
        WHERE id = OLD.project_id;
      END IF;
      IF NEW.project_id IS NOT NULL THEN
        UPDATE public.projects
        SET total_videos = total_videos + 1,
            updated_at = now()
        WHERE id = NEW.project_id;
      END IF;
    END IF;
  END IF;
  
  -- If clip was added/removed
  IF TG_TABLE_NAME = 'generated_clips' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.projects p
      SET total_clips = total_clips + 1,
          updated_at = now()
      FROM public.video_sessions vs
      WHERE vs.id = NEW.session_id
        AND vs.project_id = p.id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.projects p
      SET total_clips = GREATEST(total_clips - 1, 0),
          updated_at = now()
      FROM public.video_sessions vs
      WHERE vs.id = OLD.session_id
        AND vs.project_id = p.id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers for stats updates
CREATE TRIGGER update_project_video_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.video_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_stats();

CREATE TRIGGER update_project_clip_stats
  AFTER INSERT OR DELETE ON public.generated_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_stats();