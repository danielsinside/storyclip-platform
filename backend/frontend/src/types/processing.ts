export type ProcessorPath = 'edge' | 'api' | 'simple' | 'realtime' | 'upload-direct';
export type Engine = 'story' | 'reel' | 'image';

export type JobUpdate = {
  status: 'queued' | 'running' | 'done' | 'error' | string;
  progress?: number;
  output_urls?: string[];
  error?: string;
};
