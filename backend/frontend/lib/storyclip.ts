// lib/storyclip.ts
export type PresetId =
  | "storyclip_fast"
  | "storyclip_quality"
  | "storyclip_social_916"
  | "storyclip_av1"
  | "storyclip_av1_fast"
  | "storyclip_stabilized"
  | "storyclip_vmaf_quality";

export type Capability = {
  engine: "ffmpeg";
  version: string;
  codecs: { 
    x264: boolean; 
    x265: boolean; 
    av1_svt: boolean; 
    av1_aom: boolean; 
    dav1d: boolean 
  };
  filters: string[];
  presets: PresetId[];
  optimizations: {
    cpu: string;
    threads: string;
    avx: boolean;
    avx2: boolean;
  };
};

export type RenderCreateReq = {
  preset: PresetId;
  inputs: { url: string }[];
  overlays?: { 
    vs?: { 
      enabled: boolean; 
      style?: string; 
      label?: string 
    } 
  };
  audio?: { 
    normalize?: boolean; 
    loudnessTarget?: number 
  };
  output?: { 
    container?: "mp4" | "mkv" | "webm"; 
    maxDurationSec?: number 
  };
  metadata?: Record<string, string>;
};

export type RenderStatus =
  | { 
      jobId: string; 
      status: "queued" | "processing"; 
      progress?: { 
        pct?: number; 
        stage?: string; 
        fps?: number; 
        etaSec?: number 
      } 
    }
  | { 
      jobId: string; 
      status: "completed"; 
      outputs: { 
        kind: string; 
        url: string; 
        width: number; 
        height: number; 
        duration: number; 
        size: number 
      }[]; 
      vmaf?: number 
    }
  | { 
      jobId: string; 
      status: "failed"; 
      error: { 
        code: string; 
        message: string 
      } 
    };

export type PresetInfo = {
  id: PresetId;
  name: string;
  description: string;
  cmd?: string;
  suitable_for?: string[];
  quality?: string;
  speed?: string;
};

const BASE = process.env.NEXT_PUBLIC_STORYCLIP_API ?? "/api";

async function req<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal,
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${r.statusText} – ${body}`);
  }
  return r.json();
}

export const StoryClip = {
  capabilities: () => req<Capability>("/capabilities"),
  presets: () => req<PresetInfo[]>("/presets"),
  preset: (id: PresetId) => req<PresetInfo>(`/presets/${id}`),
  render: (payload: RenderCreateReq) => req<{ 
    jobId: string; 
    status: "queued"; 
    estimateSec?: number 
  }>("/render", { method: "POST", body: JSON.stringify(payload) }),
  status: (jobId: string, signal?: AbortSignal) => req<RenderStatus>(`/render/${jobId}`, undefined, signal),
  cancel: (jobId: string) => req<void>(`/render/${jobId}`, { method: "DELETE" }),
  benchmark: (body?: Record<string, unknown>) => req(`/benchmark`, { method: "POST", body: JSON.stringify(body ?? {}) }),
};











