import { useMemo, useState } from "react";
import { StoryclipClient, buildClipUrl } from "@/lib/storyclipClient";
import { getJob } from "@/lib/storyclipV2";
import type { JobStatus } from "@/lib/storyclipClient";
import type { RenderStatus } from "@/lib/storyclipV2";

export function useStoryclip() {
  const client = useMemo(() => new StoryclipClient(), []);
  const [health, setHealth] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [jobId, setJobId] = useState<string>("");
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [clips, setClips] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  async function initGate() {
    setBusy(true); setError("");
    try {
      const h = await client.health(); setHealth(h);
      const c = await client.config(); setConfig(c);
    } catch (e: any) {
      setError(e.message || "StoryClip no disponible");
    } finally { setBusy(false); }
  }

  async function uploadAndProcess(file: File, onUploadProgress?: (progress: number) => void) {
    setBusy(true); setError("");
    try {
      // Step 1: Upload video
      const up = await client.uploadVideo(file, onUploadProgress);
      if (!up.success || (!up.uploadId && !up.jobId)) throw new Error(up.error || "Upload falló");

      console.log('✅ Video uploaded:', up.videoUrl);

      // Return upload info only - the preset/manual page will handle story creation
      return { 
        uploadId: up.uploadId || up.jobId,
        clips: [],
        videoUrl: up.videoUrl
      };
    } catch (e: any) {
      setError(e.message || "Error procesando video");
      throw e;
    } finally { setBusy(false); }
  }

  // Process story with custom options - not used anymore, keeping for compatibility
  async function processStory(storyId: string, options?: any) {
    setBusy(true); setError("");
    try {
      const result = await client.processStory(storyId, options);
      if (!result.success) throw new Error(result.error || "Process falló");
      
      console.log('✅ Processing started:', result.jobId);
      return result;
    } catch (e: any) {
      setError(e.message || "Error iniciando procesamiento");
      throw e;
    } finally { setBusy(false); }
  }

  // Use V2 API for job status
  async function getJobStatus(jobId: string): Promise<RenderStatus> {
    return await getJob(jobId);
  }

  return {
    client,
    health,
    config,
    jobId,
    status,
    clips,
    busy,
    error,
    initGate,
    uploadAndProcess,
    processStory,
    getJobStatus
  };
}
