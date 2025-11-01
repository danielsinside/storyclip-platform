-- Add horizontal flip column to video_sessions table
ALTER TABLE public.video_sessions 
  ADD COLUMN horizontal_flip BOOLEAN DEFAULT false;