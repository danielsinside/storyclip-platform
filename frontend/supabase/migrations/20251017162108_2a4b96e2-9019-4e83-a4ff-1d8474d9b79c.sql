-- Change filter_intensity and overlay_intensity to allow decimal values
ALTER TABLE public.video_sessions 
  ALTER COLUMN filter_intensity TYPE DECIMAL,
  ALTER COLUMN overlay_intensity TYPE DECIMAL;