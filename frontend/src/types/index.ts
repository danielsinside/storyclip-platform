export type SeedType = 'natural' | 'viral' | 'cinematica' | 'humor' | 'impacto' | 'no_flip_texto' | 'mirror_safe' | 'creator_id';
export type DelayMode = 'HYPE' | 'FAST' | 'NATURAL' | 'PRO';
export type JobStatus = 'queued' | 'processing' | 'ready' | 'publishing' | 'done' | 'failed' | 'paused';

export interface Creator {
  id: string;
  name: string;
  timezone: string;
  seed: SeedType;
  delayMode: DelayMode;
  safeHours: {
    start: string;
    end: string;
  };
  allowFlip: boolean;
  metricoolBrandId?: string | null;
}

export interface ClipIndicator {
  type: 'numero' | 'contador' | 'progress' | 'temporal' | 'permanent' | 'custom';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  style: 'badge' | 'minimal' | 'bold' | 'simple' | 'rounded';
  size: number;
  textColor: string;
  bgColor: string;
  opacity: number;
}

export interface Preset {
  presetId: string;
  creatorId: string;
  seed: SeedType;
  delayMode: DelayMode;
  clips: Array<{
    start: number;
    end: number;
  }>;
  duration: number;
  audio: {
    ambientNoise: boolean;
    amplitude: number;
  };
  clipIndicator?: ClipIndicator;
  metadata: {
    title: string;
    description: string;
    keywords: string;
  };
  explanation: string;
}

export interface StoryClip {
  clipIndex: number;
  title: string;
  description?: string;
  keywords?: string;
  duration: number;
  seed: SeedType;
  url: string;
  thumbnail?: string;
}

export interface SSELog {
  type: string;
  message: string;
  progress?: number;
  data?: any;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  default_seed: SeedType;
  default_delay_mode: DelayMode;
  default_creator_profile_id?: string;
  tags?: string[];
  color?: string;
  total_videos: number;
  total_clips: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
