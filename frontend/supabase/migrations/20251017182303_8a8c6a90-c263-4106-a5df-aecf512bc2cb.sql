-- Add manual_clips column to video_sessions table
ALTER TABLE public.video_sessions
ADD COLUMN IF NOT EXISTS manual_clips jsonb DEFAULT '[{"start": 0, "end": 59}]'::jsonb;