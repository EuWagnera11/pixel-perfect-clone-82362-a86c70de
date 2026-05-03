/**
 * Jobs queue — fila global de gerações em background.
 * Permite disparar várias gerações em paralelo: cada job tem seu próprio
 * polling rodando em background (Promise solta, sem await no caller).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { fetchGeneration } from "../hooks/useGenerations";
import { dispatchTool, type DispatchInput, type ToolMediaKind } from "../tools";

export type JobStatus = "processing" | "completed" | "failed";

export type Job = {
  id: string;              // generation_id
  tool: string;
  prompt: string;
  thumb?: string;          // ref enviada (preview enquanto roda)
  mediaType: ToolMediaKind;
  status: JobStatus;
  startedAt: number;
  completedAt?: number;
  resultUrl?: string;
  error?: string;
  model?: string;
};

const STORAGE_KEY = "refine.jobs.v1";
const MAX_KEPT = 40;

type Ctx = {
  jobs: Job[];
  active: Job[];
  enqueue: (input: DispatchInput & { thumb?: string }) => Promise<{ ok: boolean; id?: string; error?: string }>;
  remove: (id: string) => void;
  clearCompleted: () => void;
};

const JobsCtx = createContext<Ctx | null>(null);

export function JobsProvider({ children, onCompleted }: { children: ReactNode; onCompleted?: (job: Job) => void }) {
  const [jobs, setJobs] = useState<Job[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const polling = useRef<Set<string>>(new Set());
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_KEPT))); } catch {}
  }, [jobs]);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  // Background poller for one job
  const startPolling = useCallback((jobId: string, mediaType: ToolMediaKind) => {
    if (polling.current.has(jobId)) return;
    polling.current.add(jobId);
    const maxMs = mediaType === "video" ? 600_000 : 300_000;
    const start = Date.now();
    (async () => {
      try {
        while (Date.now() - start < maxMs) {
          await new Promise((r) => setTimeout(r, 4000));
          let g;
          try { g = await fetchGeneration(jobId); } catch (e) { continue; }
          if (g.status === "completed") {
            const url = g.image_urls?.[0] || g.video_urls?.[0];
            updateJob(jobId, { status: "completed", resultUrl: url, completedAt: Date.now() });
            polling.current.delete(jobId);
            if (url) {
              const finalJob: Job = {
                id: jobId, tool: "", prompt: g.prompt || "",
                mediaType: (g.media_type as ToolMediaKind) || mediaType,
                status: "completed", startedAt: start, resultUrl: url,
              };
              onCompletedRef.current?.(finalJob);
            }
            return;
          }
          if (g.status === "failed") {
            updateJob(jobId, { status: "failed", error: g.error_message || "Falhou", completedAt: Date.now() });
            polling.current.delete(jobId);
            return;
          }
        }
        updateJob(jobId, { status: "failed", error: "Timeout", completedAt: Date.now() });
      } finally {
        polling.current.delete(jobId);
      }
    })();
  }, [updateJob]);

  // On mount, restart polling for any "processing" job persisted
  useEffect(() => {
    jobs.filter((j) => j.status === "processing").forEach((j) => startPolling(j.id, j.mediaType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback(async (input: DispatchInput & { thumb?: string }) => {
    try {
      const res = await dispatchTool(input);
      const job: Job = {
        id: res.generationId,
        tool: input.tab,
        prompt: input.prompt,
        thumb: input.thumb || input.sourceUrl || undefined,
        mediaType: res.mediaType,
        status: "processing",
        startedAt: Date.now(),
        model: input.model || undefined,
      };
      setJobs((prev) => [job, ...prev].slice(0, MAX_KEPT));
      startPolling(res.generationId, res.mediaType);
      return { ok: true, id: res.generationId };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Falhou" };
    }
  }, [startPolling]);

  const remove = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status === "processing"));
  }, []);

  const active = jobs.filter((j) => j.status === "processing");

  return (
    <JobsCtx.Provider value={{ jobs, active, enqueue, remove, clearCompleted }}>
      {children}
    </JobsCtx.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobsCtx);
  if (!ctx) throw new Error("useJobs must be inside JobsProvider");
  return ctx;
}
