-- Create table for video processing sessions
CREATE TABLE IF NOT EXISTS public.video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  
  -- Video metadata
  filename TEXT,
  filesize BIGINT,
  duration INTEGER,
  video_url TEXT,
  
  -- Configuration state
  seed TEXT DEFAULT 'natural',
  delay_mode TEXT DEFAULT 'NATURAL',
  title TEXT,
  description TEXT,
  keywords TEXT,
  
  -- Audio settings
  ambient_noise BOOLEAN DEFAULT false,
  amplitude DECIMAL DEFAULT 1.0,
  cut_start DECIMAL DEFAULT 0,
  cut_end DECIMAL DEFAULT 59,
  
  -- Audio originality
  audio_unique BOOLEAN DEFAULT false,
  audio_mode TEXT DEFAULT 'medio',
  audio_scope TEXT DEFAULT 'clip',
  audio_seed TEXT DEFAULT 'auto',
  
  -- Clip indicators
  clip_indicator TEXT DEFAULT 'none',
  indicator_position TEXT DEFAULT 'top-right',
  indicator_size INTEGER DEFAULT 75,
  indicator_text_color TEXT DEFAULT '#ffffff',
  indicator_bg_color TEXT DEFAULT '#000000',
  indicator_opacity DECIMAL DEFAULT 0.7,
  indicator_style TEXT DEFAULT 'badge',
  
  -- Visual filters
  filter_type TEXT DEFAULT 'none',
  filter_intensity INTEGER DEFAULT 50,
  custom_filter_css TEXT,
  custom_filter_name TEXT,
  
  -- Animated overlays
  overlay_type TEXT DEFAULT 'none',
  overlay_intensity INTEGER DEFAULT 50,
  custom_overlay_name TEXT,
  custom_overlay_config JSONB,
  
  -- Status
  status TEXT DEFAULT 'configuring',
  job_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions (no auth required for now)
CREATE POLICY "Anyone can view sessions"
  ON public.video_sessions
  FOR SELECT
  USING (true);

-- Policy: Anyone can create sessions
CREATE POLICY "Anyone can create sessions"
  ON public.video_sessions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update their sessions
CREATE POLICY "Anyone can update sessions"
  ON public.video_sessions
  FOR UPDATE
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_video_sessions_updated_at
  BEFORE UPDATE ON public.video_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_video_sessions_upload_id ON public.video_sessions(upload_id);
CREATE INDEX idx_video_sessions_status ON public.video_sessions(status);