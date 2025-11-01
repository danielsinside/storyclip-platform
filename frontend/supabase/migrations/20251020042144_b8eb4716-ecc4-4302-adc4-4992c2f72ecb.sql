-- Enable DELETE on video_sessions table
CREATE POLICY "Anyone can delete sessions"
ON public.video_sessions
FOR DELETE
USING (true);