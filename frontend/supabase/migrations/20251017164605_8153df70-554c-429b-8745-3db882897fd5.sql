-- Add camera_zoom_duration column to video_sessions table
ALTER TABLE video_sessions ADD COLUMN camera_zoom_duration numeric DEFAULT 8.0;