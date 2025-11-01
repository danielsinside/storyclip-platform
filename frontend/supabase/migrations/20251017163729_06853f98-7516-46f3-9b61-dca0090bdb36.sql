-- Add camera_zoom column to video_sessions table
ALTER TABLE video_sessions ADD COLUMN camera_zoom boolean DEFAULT false;