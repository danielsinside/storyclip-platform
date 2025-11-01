import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, AlertTriangle, Loader2, Sparkles, Bot, Pause, Play, X, Info, Gauge, Files, Activity, Clock, Wifi, ListChecks, List, Repeat, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * AgentPublishModal – Modal avanzado estilo "Agente IA" para publicar Stories en secuencia.
 *
 * Esta versión añade un **modo demo/autónomo** para que el canvas pueda renderizar
 * el componente AUNQUE no reciba props ni exista backend. Si el componente se
 * monta sin props (o con `demo: true`), se simula un lote con progreso.
 *
 * ✓ Seguro para SSR/preview: props opcionales + defaults
 * ✓ Sincr. real (SSE/Polling) cuando hay batchConfig
 * ✓ Demo interno si no hay batchConfig (sin fetch)
 */

// ----------------------------- Tipos -----------------------------
export type SpeedMode = "HUMAN" | "FAST" | "PRO";

export type StoryInput = {
  id: string;
  url: string;
  text?: string;
  durationSec?: number;
};

export type BatchConfig = {
  blogId: string;
  userId: string;
  speedMode: SpeedMode;
  autoOffset?: boolean;
  baseOffsetSec?: number;
  concurrency?: number;
  pollIntervalMs?: number;
  items: StoryInput[];
};

export type ItemStatus =
  | "queued"
  | "scheduled"
  | "processing"
  | "published"
  | "error"
  | "skipped"
  | "paused";

export type BatchItem = StoryInput & {
  mcId?: string | null;
  status: ItemStatus;
  progress: number;
  attempts: number;
  error?: string;
  scheduledAt?: string;
};

export type BatchSummary = {
  batchId: string;
  total: number;
  published: number;
  errors: number;
  durationSec: number;
};

// ----------------------- Utilidades de tiempo --------------------
export function speedDefaults(mode: SpeedMode) {
  if (mode === "HUMAN") return { offsetSec: 10, concurrency: 5 } as const;
  if (mode === "FAST") return { offsetSec: 8, concurrency: 6 } as const;
  return { offsetSec: 6, concurrency: 8 } as const;
}

export function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// --------------------------- Direct Metricool Publishing (no SSE/Poll needed) -----------------------
// Since metricool-publish handles everything sequentially, we just simulate progress during the call

// --------------------------- Hook Agente -------------------------
function usePublishAgent(batchConfig: BatchConfig | null, onComplete?: (s: BatchSummary) => void, onError?: (e: Error) => void, demo = false) {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [starting, setStarting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  // DEMO: inicializar items y progreso simulado
  useEffect(() => {
    if (!demo) return;
    const mock: BatchItem[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `demo-${i+1}`,
      url: `https://cdn.example.com/demo-${i+1}.mp4`,
      text: `Story demo ${i+1}`,
      durationSec: 2,
      mcId: null,
      status: i < 2 ? "published" : i < 4 ? "processing" : "queued",
      progress: i < 2 ? 100 : i < 4 ? 45 : 0,
      attempts: 0,
    }));
    setItems(mock);
    setBatchId("demo-batch");
    setStartedAt(Date.now());
    setEtaSec(90);

    const timer = setInterval(() => {
      setItems(prev => prev.map(it => {
        if (it.status === "queued") return { ...it, status: "processing", progress: 10 };
        if (it.status === "processing") {
          const next = clamp(it.progress + 10);
          return { ...it, progress: next, status: next >= 100 ? "published" : "processing" };
        }
        return it;
      }));
      setEtaSec(s => (typeof s === "number" && s > 0 ? s - 3 : 0));
    }, 1500);

    return () => clearInterval(timer);
  }, [demo]);

  // iniciar batch real
  const start = async () => {
    if (!batchConfig || demo) return;
    try {
      setStarting(true);
      setStartedAt(Date.now());

      const defaults = speedDefaults(batchConfig.speedMode);
      const baseOffset = batchConfig.autoOffset ? null : (batchConfig.baseOffsetSec ?? defaults.offsetSec);
      const concurrency = batchConfig.concurrency ?? defaults.concurrency;

      // Transform items to Metricool format
      const payload = {
        userId: batchConfig.userId,
        defaultBlogId: batchConfig.blogId,
        delayMode: batchConfig.speedMode || 'NATURAL',
        posts: batchConfig.items.map(item => ({
          blogId: batchConfig.blogId,
          normalizedUrl: item.url,
          message: item.text || '',
          publishAt: batchConfig.autoOffset ? 'bestTime' : null
        }))
      };

      console.log('📤 Publishing batch to Metricool:', payload);
      
      // Initialize items as queued
      setItems(
        batchConfig.items.map((it) => ({
          ...it,
          mcId: null,
          status: "queued" as ItemStatus,
          progress: 0,
          attempts: 0,
        }))
      );

      // Generate a local batchId for tracking
      const localBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      setBatchId(localBatchId);
      
      // Use SSE for real-time progress updates
      const supabaseUrl = 'https://kixjikosjlyozbnyvhua.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeGppa29zamx5b3pibnl2aHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTI4MTAsImV4cCI6MjA3NjEyODgxMH0.5j0KRCSU6e4B9mAtAQ0ui7FcWcMDhq0I6dk9XjZ87kc';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/metricool-publish?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text().catch(() => 'No response')}`);
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            console.log('📨 SSE Event:', data);
            
            if (data.type === 'start') {
              console.log('🚀 Publishing started:', data.message);
            } else if (data.type === 'publishing') {
              const clipIndex = data.data?.clipIndex ?? -1;
              if (clipIndex >= 0) {
                setItems(prev => prev.map((it, idx) => 
                  idx === clipIndex 
                    ? { ...it, status: "processing" as ItemStatus, progress: 50 }
                    : it
                ));
              }
            } else if (data.type === 'waiting_confirmation') {
              const clipIndex = data.data?.clipIndex ?? -1;
              const postId = data.data?.postId;
              if (clipIndex >= 0) {
                setItems(prev => prev.map((it, idx) => 
                  idx === clipIndex 
                    ? { ...it, status: "processing" as ItemStatus, progress: 75, mcId: postId }
                    : it
                ));
              }
            } else if (data.type === 'clip_published') {
              const clipIndex = data.data?.clipIndex ?? -1;
              const postId = data.data?.postId;
              if (clipIndex >= 0) {
                setItems(prev => prev.map((it, idx) => 
                  idx === clipIndex 
                    ? { ...it, status: "published" as ItemStatus, progress: 100, mcId: postId }
                    : it
                ));
              }
            } else if (data.type === 'clip_failed') {
              const clipIndex = data.data?.clipIndex ?? -1;
              const error = data.data?.error || data.message;
              if (clipIndex >= 0) {
                setItems(prev => prev.map((it, idx) => 
                  idx === clipIndex 
                    ? { ...it, status: "error" as ItemStatus, error }
                    : it
                ));
              }
            } else if (data.type === 'complete') {
              const results = data.data?.results || [];
              const successCount = results.filter((r: any) => r.success).length;
              
              setDone(true);
              const end = Date.now();
              const sum: BatchSummary = {
                batchId: localBatchId,
                total: batchConfig.items.length,
                published: successCount,
                errors: batchConfig.items.length - successCount,
                durationSec: startedAt ? Math.round((end - startedAt) / 1000) : 0,
              };
              onComplete?.(sum);
            } else if (data.type === 'error') {
              setItems(prev => prev.map(it => ({
                ...it,
                status: it.status === "published" ? "published" : "error" as ItemStatus,
                error: it.status === "published" ? undefined : data.message
              })));
              throw new Error(data.message);
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        }
      }
    } catch (e: any) {
      onError?.(e);
    } finally {
      setStarting(false);
    }
  };

  // No need for SSE/polling - metricool-publish handles everything synchronously

  // KPIs
  const counts = useMemo(() => {
    const c = { total: items.length, published: 0, error: 0, processing: 0, scheduled: 0, queued: 0 };
    items.forEach((it) => {
      if (it.status === "published") c.published++;
      else if (it.status === "error") c.error++;
      else if (it.status === "processing") c.processing++;
      else if (it.status === "scheduled") c.scheduled++;
      else if (it.status === "queued") c.queued++;
    });
    return c;
  }, [items]);

  // progreso global
  const progress = useMemo(() => {
    if (!items.length) return 0;
    const avg = items.reduce((a, b) => a + (b.progress ?? 0), 0) / items.length;
    return Math.round(avg);
  }, [items]);

  // Control functions (not needed for direct Metricool publishing, but kept for compatibility)
  const pause = async () => { setPaused(true); };
  const resume = async () => { setPaused(false); };
  const cancel = async () => { setDone(true); };
  const retryFailed = async () => { /* Not implemented for direct publishing */ };

  return {
    batchId, items, starting, paused, etaSec, startedAt, done, counts, progress,
    start, pause, resume, cancel, retryFailed,
  };
}

// --------------------------- UI Components -----------------------
function StepPill({ active, done, icon: Icon, label }: { active?: boolean; done?: boolean; icon: any; label: string; }) {
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm border ${active ? "bg-white/5 border-white/30" : "bg-white/0 border-white/10"}`}>
      {done ? <Check className="h-4 w-4"/> : <Icon className="h-4 w-4"/>}
      <span>{label}</span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${clamp(value)}%` }}/>
    </div>
  );
}

function ThinkingDots() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }} className="inline-flex gap-1">
      {[0,1,2].map(i => (
        <motion.span key={i} className="inline-block w-1.5 h-1.5 bg-white/80 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
      ))}
    </motion.div>
  );
}

// ------------------------------ Modal ----------------------------
export default function AgentPublishModal(props?: {
  isOpen?: boolean;
  onClose?: () => void;
  batchConfig?: BatchConfig | null;
  onComplete?: (s: BatchSummary) => void;
  onError?: (e: Error) => void;
  demo?: boolean; // fuerza modo demo
}) {
  const isDemo = !props || props.demo || !props.batchConfig;
  const isOpen = props?.isOpen ?? true; // por defecto visible en canvas
  const onClose = props?.onClose ?? (() => {});
  const batchConfig = props?.batchConfig ?? null;
  const onComplete = props?.onComplete;
  const onError = props?.onError;

  const {
    batchId, items, starting, paused, etaSec, done, counts, progress,
    start, pause, resume, cancel, retryFailed
  } = usePublishAgent(batchConfig, onComplete, onError, isDemo);

  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (isDemo) return; // en demo no llamamos al backend
    if (isOpen && batchConfig) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, batchConfig?.items?.length, batchConfig?.speedMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
      <div className="w-full max-w-4xl rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center">
              <Bot className="h-5 w-5"/>
            </div>
            <div>
              <h3 className="text-base font-semibold">IA Publicando tu Historia {isDemo && <span className="text-white/50">(demo)</span>}</h3>
              <p className="text-xs text-white/60">Comportamiento humano, orden perfecto y feedback en vivo.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="h-5 w-5"/></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={Activity} label="Progreso" value={`${progress}%`} subtle={<ProgressBar value={progress}/>} />
            <Kpi icon={ListChecks} label="Publicadas" value={`${counts.published}/${counts.total}`} />
            <Kpi icon={AlertTriangle} label="Errores" value={`${counts.error}`} />
            <Kpi icon={Clock} label="ETA" value={etaSec != null ? fmtTime(Math.max(0, etaSec)) : "—"} />
          </div>

          {/* Stepper */}
          <div className="flex flex-wrap gap-2 text-white/80">
            <StepPill icon={Files} label="Preparando" active={starting} done={!starting && items.length > 0} />
            <StepPill icon={Gauge} label="Programando" active={counts.scheduled > 0} done={counts.scheduled === 0 && items.length > 0} />
            <StepPill icon={Wifi} label="Sincronizando" active={counts.processing > 0} done={counts.processing === 0 && counts.published > 0} />
            <StepPill icon={List} label="Monitoreando" active={!done && items.length > 0} done={done} />
            <StepPill icon={Repeat} label="Reintentos" active={counts.error > 0 && !done} />
            <StepPill icon={Sparkles} label="Finalizando" done={done} />
          </div>

          {/* Banner modo */}
          <div className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 rounded-xl p-3">
            <Info className="h-4 w-4"/>
            <span>
              {batchConfig ? (
                <>Modo <b>{batchConfig.speedMode}</b> • Offset base <b>{speedDefaults(batchConfig.speedMode).offsetSec}s</b> • Concurrencia <b>{batchConfig.concurrency ?? speedDefaults(batchConfig.speedMode).concurrency}</b></>
              ) : (
                <>Cargando configuración...</>
              )}
            </span>
          </div>

          {/* Barra de estado global */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                {!done && (starting || counts.processing > 0 || counts.queued > 0) && (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                )}
                <span className="text-white/80">
                  {done ? 'Lote completado' : 
                   starting ? 'Iniciando publicación...' :
                   counts.processing > 0 ? `Procesando ${counts.processing} clip${counts.processing > 1 ? 's' : ''}...` :
                   counts.queued > 0 ? `${counts.queued} clip${counts.queued > 1 ? 's' : ''} en cola` :
                   'Esperando...'}
                  {!done && (counts.processing > 0 || counts.queued > 0) && <> <ThinkingDots/></>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!props?.demo && batchId && (
                  !paused ? (
                    <button onClick={() => { if (!isDemo) void pause(); }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm inline-flex items-center gap-2"><Pause className="h-4 w-4"/> Pausar</button>
                  ) : (
                    <button onClick={() => { if (!isDemo) void resume(); }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm inline-flex items-center gap-2"><Play className="h-4 w-4"/> Reanudar</button>
                  )
                )}
                {!props?.demo && batchId && counts.error > 0 && (
                  <button onClick={() => { if (!isDemo) void retryFailed(); }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm inline-flex items-center gap-2"><RefreshCw className="h-4 w-4"/> Reintentar fallidas</button>
                )}
              </div>
            </div>
            <div className="mt-3"><ProgressBar value={progress}/></div>
          </div>

          {/* Lista de items */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
              <div className="text-sm text-white/70">{items.length} historias</div>
              <button onClick={() => setShowDetails(s => !s)} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10">
                {showDetails ? <><ChevronUp className="h-3.5 w-3.5"/> Ocultar</> : <><ChevronDown className="h-3.5 w-3.5"/> Mostrar</>}
              </button>
            </div>
            {showDetails && (
              <div className="max-h-72 overflow-auto divide-y divide-white/10">
                {items.map((it, idx) => {
                  // Extract title from text field (first line)
                  const clipTitle = it.text?.split('\n')[0] || `Clip ${idx + 1}`;
                  const clipNumber = idx + 1;
                  
                  return (
                    <div key={it.id} className="px-4 py-3 grid grid-cols-12 gap-3 text-sm items-center">
                      <div className="col-span-1 text-white/50">#{clipNumber}</div>
                      <div className="col-span-6 sm:col-span-7 truncate">
                        <div className="font-medium truncate">{clipTitle}</div>
                        <div className="text-xs text-white/50 space-x-2">
                          <span>{it.status.toUpperCase()}</span>
                          {it.scheduledAt && <span>• {new Date(it.scheduledAt).toLocaleTimeString()}</span>}
                          <span>• Duración: {it.durationSec}s</span>
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                          Efectos: Flip horizontal, Filtro de color, Overlay de texto
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <div className="text-xs">{it.progress}%</div>
                        <div className="h-1.5 bg-white/10 rounded"><div className="h-full rounded" style={{ width: `${it.progress}%` }}/></div>
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        {it.status === 'error' && (
                          <span className="px-2 py-1 text-xs rounded bg-red-500/15 border border-red-500/30 text-red-300 inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5"/> Error</span>
                        )}
                        {it.status === 'published' && (
                          <span className="px-2 py-1 text-xs rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 inline-flex items-center gap-1"><Check className="h-3.5 w-3.5"/> Ok</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer acciones secundarias */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/50">Batch ID: {batchId ?? '—'}</div>
            <div className="flex items-center gap-2">
              {!props?.demo && <button onClick={() => { if (!isDemo) void cancel(); }} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm">Cancelar</button>}
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, subtle }: { icon: any; label: string; value: string; subtle?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs text-white/60"><Icon className="h-4 w-4"/> {label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {subtle && <div className="mt-2">{subtle}</div>}
    </div>
  );
}

// ---------------------- DEV TESTS (ligeros) ----------------------
function runDevTests() {
  try {
    // clamp
    console.assert(clamp(-10) === 0, "clamp < 0 falla");
    console.assert(clamp(50) === 50, "clamp medio falla");
    console.assert(clamp(150) === 100, "clamp > 100 falla");

    // fmtTime
    console.assert(fmtTime(0) === "0:00", "fmtTime 0s");
    console.assert(fmtTime(59) === "0:59", "fmtTime 59s");
    console.assert(fmtTime(60) === "1:00", "fmtTime 60s");

    // speedDefaults
    console.assert(speedDefaults("HUMAN").offsetSec === 10 && speedDefaults("HUMAN").concurrency === 5, "HUMAN defaults");
    console.assert(speedDefaults("FAST").offsetSec === 8 && speedDefaults("FAST").concurrency === 6, "FAST defaults");
    console.assert(speedDefaults("PRO").offsetSec === 6 && speedDefaults("PRO").concurrency === 8, "PRO defaults");

    console.debug("AgentPublishModal listo para render (demo compatible)");
  } catch (e) {
    console.warn("DEV TESTS: fallo", e);
  }
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  try { runDevTests(); } catch { /* noop */ }
}
