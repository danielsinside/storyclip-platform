-- Create table for storing generated clips
CREATE TABLE public.generated_clips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.video_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_index integer NOT NULL,
  clip_url text NOT NULL,
  thumbnail_url text,
  duration numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, clip_index)
);

-- Enable RLS
ALTER TABLE public.generated_clips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own clips"
ON public.generated_clips
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert clips"
ON public.generated_clips
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own clips"
ON public.generated_clips
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own clips"
ON public.generated_clips
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for faster queries
CREATE INDEX idx_generated_clips_session_id ON public.generated_clips(session_id);
CREATE INDEX idx_generated_clips_user_id ON public.generated_clips(user_id);