import { useEffect, useState, useRef } from "react";
import { createRender, getJob, type RenderStatus, type RenderCreateReq } from "@/lib/storyclipV2";

export function useRenderJobV2(intervalMs = 1500) {
  const [jobId, setJobId] = useState<string>();
  const [status, setStatus] = useState<RenderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function start(req: RenderCreateReq): Promise<string> {
    setLoading(true);
    setError(undefined);
    setStatus(null);
    
    try {
      const res = await createRender(req);
      setJobId(res.jobId);
      setStatus({ jobId: res.jobId, status: res.status as any });
      return res.jobId;
    } catch (e: any) {
      setError(e?.message || "Error creating render");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!jobId) return;

    let alive = true;

    const tick = async () => {
      if (!alive) return;
      
      try {
        abortRef.current = new AbortController();
        const timeout = setTimeout(() => abortRef.current?.abort(), 10000);
        
        const s = await getJob(jobId);
        clearTimeout(timeout);
        
        if (!alive) return;
        setStatus(s);

        if (s.status === "completed" || s.status === "failed" || s.status === "canceled") {
          if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          return;
        }

        timerRef.current = window.setTimeout(tick, intervalMs);
      } catch (e: any) {
        if (!alive) return;
        setError(e.message || "Error polling job");
        // Backoff on error
        timerRef.current = window.setTimeout(tick, intervalMs * 2);
      }
    };

    tick();

    return () => {
      alive = false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, [jobId, intervalMs]);

  const done = status?.status === "completed" || status?.status === "failed" || status?.status === "canceled";

  return { start, jobId, status, loading, error, done };
}
