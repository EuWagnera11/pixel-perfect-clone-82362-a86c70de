import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type JobKind = "image" | "video" | "enhance";

interface JobStatusProps {
  taskId: string;
  kind: JobKind;
  /** Called once when the job completes successfully. */
  onComplete?: (urls: string[]) => void;
  /** Called once if the job fails. */
  onError?: (message: string) => void;
  /** Polling interval in ms (default 3000). */
  intervalMs?: number;
  className?: string;
}

function extractUrls(payload: any): string[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter((u) => typeof u === "string");
  if (typeof payload === "string") return [payload];

  const candidates = [
    payload.urls,
    payload.image_urls,
    payload.video_urls,
    payload.output_urls,
    payload.result?.urls,
    payload.result?.image_urls,
    payload.result?.video_urls,
    payload.result,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.every((x) => typeof x === "string")) return c;
    if (typeof c === "string") return [c];
  }
  if (typeof payload.url === "string") return [payload.url];
  if (typeof payload.output_url === "string") return [payload.output_url];
  return [];
}

export function JobStatus({
  taskId,
  kind,
  onComplete,
  onError,
  intervalMs = 3000,
  className,
}: JobStatusProps) {
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"polling" | "completed" | "failed">("polling");
  const [message, setMessage] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!taskId) return;
    completedRef.current = false;
    setElapsed(0);
    setStatus("polling");
    setMessage(null);
    setUrls([]);

    const startedAt = Date.now();
    const tick = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100);

    const poll = async () => {
      if (completedRef.current) return;
      try {
        const data: any = await api.enhance.task(taskId, kind);
        const rawStatus = String(data?.status ?? data?.state ?? "").toUpperCase();
        if (rawStatus === "COMPLETED" || rawStatus === "SUCCESS" || rawStatus === "DONE") {
          completedRef.current = true;
          const found = extractUrls(data);
          setUrls(found);
          setStatus("completed");
          onComplete?.(found);
          return;
        }
        if (rawStatus === "FAILED" || rawStatus === "ERROR" || rawStatus === "CANCELLED") {
          completedRef.current = true;
          const msg = String(data?.error ?? data?.message ?? "Job falhou");
          setMessage(msg);
          setStatus("failed");
          onError?.(msg);
          return;
        }
        if (data?.message) setMessage(String(data.message));
      } catch (e) {
        // Soft-fail: keep polling unless we hit a clearly fatal error.
        if (e instanceof Error) setMessage(e.message);
      }
    };

    poll();
    const poller = setInterval(poll, intervalMs);

    return () => {
      clearInterval(poller);
      clearInterval(tick);
    };
  }, [taskId, kind, intervalMs, onComplete, onError]);

  if (status === "completed") {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border border-border bg-surface p-4 text-sm", className)}>
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span className="font-medium">Concluído</span>
        <span className="font-mono text-xs text-muted-foreground">· {urls.length} arquivo(s)</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm", className)}>
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="font-medium text-destructive">Falhou</span>
        {message && <span className="font-mono text-xs text-muted-foreground">· {message}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-md border border-border bg-surface p-4 text-sm", className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <div className="flex-1">
        <div className="font-medium">Processando... ({elapsed.toFixed(1)}s)</div>
        {message && <div className="font-mono text-[11px] text-muted-foreground">{message}</div>}
      </div>
    </div>
  );
}

export default JobStatus;
