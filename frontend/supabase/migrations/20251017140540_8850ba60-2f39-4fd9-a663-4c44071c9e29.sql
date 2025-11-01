-- Create enum types for seed and delay mode
CREATE TYPE public.seed_type AS ENUM (
  'natural',
  'viral',
  'cinematica',
  'humor',
  'impacto',
  'no_flip_texto',
  'mirror_safe',
  'creator_id'
);

CREATE TYPE public.delay_mode AS ENUM (
  'HYPE',
  'FAST',
  'NATURAL',
  'PRO'
);

-- Create creator_profiles table
CREATE TABLE public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  seed seed_type NOT NULL DEFAULT 'natural',
  delay_mode delay_mode NOT NULL DEFAULT 'NATURAL',
  safe_hours_start TIME NOT NULL DEFAULT '09:00',
  safe_hours_end TIME NOT NULL DEFAULT '21:00',
  allow_flip BOOLEAN NOT NULL DEFAULT true,
  metricool_brand_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profiles"
  ON public.creator_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profiles"
  ON public.creator_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles"
  ON public.creator_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
  ON public.creator_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();