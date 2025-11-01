// StoryClip v2 SDK - Via Supabase Proxy to avoid CORS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type RenderInput = { url: string } | { fileId?: string; start?: number; end?: number };

export type PresetInfo = {
  id: string;
  desc?: string;
  name?: string;
};

export type RenderCreateReq = {
  preset: string;
  inputs: RenderInput[];
  output?: { 
    container?: "mp4" | "webm" | "mkv"; 
    maxDurationSec?: number;
    width?: number;
    height?: number;
    fps?: number;
    videoCodec?: string;
    audioCodec?: string;
    audioBitrate?: number;
    audioSampleRate?: number;
  };
  metadata?: Record<string, any>;
  overlays?: {
    vs?: {
      enabled: boolean;
      style?: string;
      label?: string;
    };
  };
  audio?: {
    normalize?: boolean;
    loudnessTarget?: number;
    ambientNoise?: boolean;
    amplitude?: number;
  };
  effects?: {
    horizontalFlip?: boolean;
    filter?: {
      type?: string;
      intensity?: number;
      customCSS?: string;
      customName?: string;
    };
    overlay?: {
      type?: string;
      intensity?: number;
      customName?: string;
      customConfig?: any;
    };
    camera?: {
      zoom?: number;
      zoomDuration?: number;
      pan?: number;
      tilt?: number;
      rotate?: number;
      dolly?: number;
      shake?: number;
    };
    clipIndicator?: {
      type?: 'none' | 'temporal' | 'permanent';
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      size?: number;
      textColor?: string;
      bgColor?: string;
      opacity?: number;
      style?: 'simple' | 'badge' | 'rounded';
    };
  };
};

export type JobProgress = {
  pct?: number;
  stage?: string;
  fps?: number;
  etaSec?: number;
};

export type JobOutput = {
  kind: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  size: number;
};

export type RenderStatus =
  | { jobId: string; status: "queued" | "processing"; progress?: JobProgress }
  | { jobId: string; status: "completed"; outputs: JobOutput[]; vmaf?: number }
  | { jobId: string; status: "failed"; error: { code: string; message: string } }
  | { jobId: string; status: "canceled" };

export async function getPresets(): Promise<PresetInfo[]> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/storyclip-proxy/presets`, {
    method: "GET",
    headers: { 
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-sc-action": "presets"
    }
  });
  if (!r.ok) throw new Error(`Presets ${r.status}`);
  const data = await r.json();
  return data.presets || [];
}

export async function createRender(body: RenderCreateReq): Promise<{ jobId: string; status: string; estimateSec?: number }> {
  console.log('🚀 Creating render job via Supabase proxy with body:', JSON.stringify(body, null, 2));
  
  const r = await fetch(`${SUPABASE_URL}/functions/v1/storyclip-proxy/render`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "x-sc-action": "render-create"
    },
    body: JSON.stringify(body),
  });
  
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    console.error('❌ Render creation failed:', err);
    throw new Error(err.error || `Create render ${r.status}`);
  }
  
  const result = await r.json();
  console.log('✅ Render job created:', result);
  return result;
}

export async function getJob(jobId: string): Promise<RenderStatus> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/storyclip-proxy/render/${jobId}`, { 
    method: "GET",
    headers: { 
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-sc-action": "render-status"
    },
    cache: "no-store"
  });
  if (!r.ok) throw new Error(`Get job ${r.status}`);
  return r.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/storyclip-proxy/render/${jobId}`, {
    method: "DELETE",
    headers: { 
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-sc-action": "render-cancel"
    }
  });
  if (!r.ok) throw new Error(`Cancel job ${r.status}`);
}

export type ProcessVideoRequest = {
  uploadId: string;
  videoUrl?: string; // Video URL for validation
  mode: 'auto' | 'manual';
  preset?: string;
  clips?: Array<{ 
    start: number; 
    end: number;
    effects?: {
      mirrorHorizontal?: boolean;
      color?: {
        brightness?: number;
        contrast?: number;
        saturation?: number;
        ffmpegCommand?: string; // New: direct FFmpeg filter command
      };
      indicator?: {
        enabled: boolean;
        label?: string;
        position?: string;
        size?: number;
        textColor?: string;
        bgColor?: string;
        opacity?: number;
        style?: string;
      };
    };
  }>;
  clipDuration?: number;
  maxClips?: number;
  filters?: {
    type?: string;
    intensity?: number;
    customCSS?: string;
    customName?: string;
    color?: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
    };
    mirrorHorizontal?: boolean;
  };
  overlays?: {
    type?: string;
    intensity?: number;
    customName?: string;
    customConfig?: any;
  };
  camera?: {
    zoom?: number;
    zoomDuration?: number;
    pan?: number;
    tilt?: number;
    rotate?: number;
    dolly?: number;
    shake?: number;
  };
  audio?: {
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
  };
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string;
    seed?: string;
    delayMode?: string;
    visual?: {
      indicator?: boolean;
      indicatorPosition?: string;
      indicatorSize?: number;
      indicatorTextColor?: string;
      indicatorBgColor?: string;
      indicatorOpacity?: number;
      indicatorStyle?: string;
      indicatorType?: string;
      mirrorHorizontal?: boolean;
    };
  };
};

export async function processVideo(body: ProcessVideoRequest): Promise<{ success: boolean; jobId: string; status: string }> {
  console.log('🚀 Processing video with body:', JSON.stringify(body, null, 2));

  // Call backend directly to avoid proxy transformations
  const BACKEND_URL = 'https://story.creatorsflow.app';

  const r = await fetch(`${BACKEND_URL}/api/process-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    console.error('❌ Process video failed:', err);
    throw new Error(err.error || `Process video ${r.status}`);
  }

  const result = await r.json();
  console.log('✅ Video processing started:', result);
  return result;
}
