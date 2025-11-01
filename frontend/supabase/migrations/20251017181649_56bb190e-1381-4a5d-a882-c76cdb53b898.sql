-- Add new camera movement columns to video_sessions table
ALTER TABLE public.video_sessions 
ADD COLUMN IF NOT EXISTS camera_pan boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS camera_tilt boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS camera_rotate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS camera_dolly boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS camera_shake boolean DEFAULT false;