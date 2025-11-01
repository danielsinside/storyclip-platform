// StoryClip SDK Client for video processing
export type StoryclipConfig = {
  baseUrl?: string;
  cdnBase?: string;
  pollMs?: number;
  processTimeoutMs?: number;
};

export type UploadResult = {
  success: boolean;
  uploadId?: string;
  jobId?: string;
  video_id?: string;
  filename?: string;
  videoUrl?: string;
  previewUrl?: string;
  error?: string;
};

export type ProcessResult = {
  success: boolean;
  jobId?: string;
  status?: string;
  error?: string;
};

export type JobStatus = {
  id?: string;
  status: "queued" | "processing" | "completed" | "done" | "failed" | "running";
  progress?: number;
  message?: string;
  result?: {
    clips_generated?: number;
    artifacts?: Array<{ url?: string; name?: string; id?: string; type?: string; format?: string }>;
  };
  outputs?: string[];
  totalClips?: number;
  error?: string;
};

const envBase = import.meta.env.VITE_STORYCLIP_BASE || "https://story.creatorsflow.app";
const envCdn = import.meta.env.VITE_STORYCLIP_CDN || "https://story.creatorsflow.app/outputs";

export function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export function buildClipUrl(jobId: string, i: number, cdnBase = envCdn) {
  return `${cdnBase}/${jobId}/clip_${pad3(i)}.mp4`;
}

export function buildUploadUrl(uploadId: string, baseUrl = envBase) {
  return `${baseUrl}/uploads/${uploadId}`;
}

export class StoryclipClient {
  baseUrl: string;
  cdnBase: string;
  pollMs: number;
  processTimeoutMs: number;

  constructor(cfg: StoryclipConfig = {}) {
    this.baseUrl = cfg.baseUrl || envBase;
    this.cdnBase = cfg.cdnBase || envCdn;
    this.pollMs = cfg.pollMs ?? Number(import.meta.env.VITE_STORYCLIP_POLL_MS || 2500);
    this.processTimeoutMs = cfg.processTimeoutMs ?? Number(import.meta.env.VITE_STORYCLIP_PROCESS_TIMEOUT_MS || 900000);
  }

  async health() {
    const r = await fetch(`${this.baseUrl}/api/health`, { cache: "no-store" });
    if (!r.ok) throw new Error(`Health failed: ${r.status}`);
    return r.json();
  }

  async config() {
    const r = await fetch(`${this.baseUrl}/api/config`, { cache: "no-store" });
    if (!r.ok) throw new Error(`Config failed: ${r.status}`);
    return r.json();
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void, retryCount = 0): Promise<UploadResult> {
    const MAX_RETRIES = 3;
    
    return new Promise((resolve, reject) => {
      console.log(`Upload attempt ${retryCount + 1}/${MAX_RETRIES + 1}:`, file.name, 'Size:', Math.round(file.size / 1024 / 1024), 'MB');
      const uploadStartTime = Date.now();
      let lastProgressCallbackTime = 0;
      let lastUploadedBytes = 0;
      let stuckCheckInterval: any = null;
      
      const fd = new FormData();
      fd.append("file", file);
      
      const xhr = new XMLHttpRequest();
      
      // Set timeout to 15 minutes for large files
      xhr.timeout = 900000; // 15 minutes
      
      // Monitor for stuck uploads (no progress for 30 seconds)
      stuckCheckInterval = setInterval(() => {
        // This will be cleared when upload completes or errors
      }, 30000);
      
      // Track upload progress - throttle to avoid blocking the main thread
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          
          // Update last uploaded bytes to detect stuck uploads
          lastUploadedBytes = e.loaded;
          
          // Throttle progress updates to max every 500ms to avoid blocking
          if (now - lastProgressCallbackTime >= 500) {
            const progress = Math.round((e.loaded / e.total) * 100);
            const elapsedSeconds = Math.round((now - uploadStartTime) / 1000);
            const speed = e.loaded / elapsedSeconds / 1024 / 1024; // MB/s
            
            console.log(`Upload: ${progress}% - ${Math.round(e.loaded / 1024 / 1024)}MB / ${Math.round(e.total / 1024 / 1024)}MB - ${speed.toFixed(2)} MB/s`);
            
            // Call progress callback only when throttle allows
            if (onProgress) {
              onProgress(progress);
            }
            
            lastProgressCallbackTime = now;
          }
        }
      });
      
      xhr.addEventListener('load', async () => {
        clearInterval(stuckCheckInterval);
        const uploadTime = Math.round((Date.now() - uploadStartTime) / 1000);
        console.log(`Upload completed in ${uploadTime} seconds`);
        try {
          const j = JSON.parse(xhr.responseText);
          console.log('Upload response:', j);
          if (xhr.status !== 200 || j.success === false) {
            resolve({ success: false, error: j?.error || xhr.statusText });
          } else {
            const uploadId = j.uploadId || j.jobId || j.video_id;
            // Use the URL from backend if provided, otherwise construct it with correct domain
            const videoUrl = j.videoUrl || j.previewUrl || `${this.baseUrl}/outputs/uploads/${uploadId}.mp4`;
            console.log('✅ Upload successful - videoUrl:', videoUrl);
            resolve({ success: true, ...j, uploadId, videoUrl });
          }
        } catch (err) {
          console.error('Error parsing upload response:', err);
          resolve({ success: false, error: 'Invalid response' });
        }
      });
      
      xhr.addEventListener('error', async () => {
        clearInterval(stuckCheckInterval);
        console.error(`Upload error event (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        
        // Retry logic for network errors
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying upload in 2 seconds... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before retry
          
          try {
            const result = await this.uploadVideo(file, onProgress, retryCount + 1);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(new Error('Upload failed after multiple attempts - please check your internet connection and try again'));
        }
      });
      
      xhr.addEventListener('timeout', async () => {
        clearInterval(stuckCheckInterval);
        console.error(`Upload timeout after 15 minutes (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        
        // Retry on timeout as well
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying upload after timeout... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, 2000));
          
          try {
            const result = await this.uploadVideo(file, onProgress, retryCount + 1);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(new Error('Upload timeout after multiple attempts - file may be too large or connection too slow'));
        }
      });
      
      console.log('Sending request to:', `${this.baseUrl}/api/videos/upload`);
      xhr.open('POST', `${this.baseUrl}/api/videos/upload`);

      // Add API key header for authentication
      const apiKey = import.meta.env.VITE_STORYCLIP_API_KEY || '';
      if (apiKey) {
        xhr.setRequestHeader('X-Api-Key', apiKey);
      }

      xhr.send(fd);
    });
  }

  /** Create story - Step 1 */
  async createStory(videoUrl: string, title: string, description: string): Promise<{ id: string; jobId: string }> {
    const body = JSON.stringify({ videoUrl, title, description });
    
    const r = await fetch(`${this.baseUrl}/api/stories`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Api-Key": import.meta.env.VITE_STORYCLIP_API_KEY || ""
      },
      body
    });
    
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(j?.error || `Create story failed: ${r.status}`);
    }
    
    return { id: j.id, jobId: j.jobId };
  }

  /** Start processing - Step 2 */
  async processStory(storyId: string, options: any = {}): Promise<ProcessResult> {
    const defaultOptions = {
      type: "story",
      clipDuration: 5,
      maxClips: 1000,
      quality: "high",
      startTime: 0,
      aspectRatio: "9:16",
      resolution: "720x1280",
      fps: 30,
      videoBitrate: "2000k",
      audioBitrate: "128k",
      preset: "fast",
      crf: 23,
      format: "mp4",
      videoCodec: "libx264",
      audioCodec: "aac"
    };

    const body = JSON.stringify({ ...defaultOptions, ...options });
    
    const r = await fetch(`${this.baseUrl}/api/stories/${storyId}/process`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Api-Key": import.meta.env.VITE_STORYCLIP_API_KEY || ""
      },
      body
    });
    
    const j = await r.json().catch(() => ({}));
    if (r.ok && (j.jobId || j.success || j.id)) {
      return { success: true, jobId: j.jobId || j.id, status: j.status };
    }
    
    return { success: false, error: j?.error || r.statusText };
  }

  /** Get story status - Step 3 */
  async getStoryStatus(storyId: string): Promise<JobStatus> {
    const r = await fetch(`${this.baseUrl}/api/stories/${storyId}/status`, { 
      cache: "no-store",
      headers: {
        "X-Api-Key": import.meta.env.VITE_STORYCLIP_API_KEY || ""
      }
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(j?.error || `Status request failed: ${r.status}`);
    }
    return j as JobStatus;
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    // Alias for backwards compatibility
    return this.getStoryStatus(jobId);
  }

  async waitUntilCompleted(jobId: string, onTick?: (s: JobStatus) => void): Promise<JobStatus> {
    const start = Date.now();
    while (Date.now() - start < this.processTimeoutMs) {
      const st = await this.getJobStatus(jobId);
      onTick?.(st);
      if (st.status === "completed" || st.status === "done" || st.status === "failed") return st;
      await new Promise(r => setTimeout(r, this.pollMs));
    }
    return { success: false, status: "failed", error: "process timeout" } as any;
  }

  /** Si el status no trae artifacts, construye URLs 1..N por convención */
  buildClipUrlsFromCount(jobId: string, count: number) {
    return Array.from({ length: count }, (_, i) => buildClipUrl(jobId, i + 1, this.cdnBase));
  }
}
