/**
 * JobsPanel — painel flutuante mostrando jobs em background.
 * Aparece no canto inferior-direito quando há jobs ativos ou recentes (<30s).
 */
import { useEffect, useState } from "react";
import { useJobs, type Job } from "../lib/jobs";

export function JobsPanel({ onOpenResult }: { onOpenResult?: (job: Job) => void }) {
  const { jobs, remove, clearCompleted } = useJobs();
  const [collapsed, setCollapsed] = useState(false);
  const [, setTick] = useState(0);

  // Re-render every 1s pra atualizar contadores e auto-fade
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = jobs.filter((j) => {
    if (j.status === "processing") return true;
    if (!j.completedAt) return true;
    return Date.now() - j.completedAt < 60_000; // mostra completos por 60s
  });

  if (visible.length === 0) return null;

  const activeCount = visible.filter((j) => j.status === "processing").length;

  return (
    <div
      style={{
        position: "fixed", right: 20, bottom: 20, zIndex: 1000,
        width: 320, maxHeight: "60vh",
        background: "rgba(20,20,22,.96)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,.14)", borderRadius: 14,
        boxShadow: "0 16px 40px rgba(0,0,0,.6)",
        color: "#f6f6f8", fontSize: 12.5, overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          all: "unset", cursor: "pointer", padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          borderBottom: collapsed ? "0" : "1px solid rgba(255,255,255,.08)",
          background: "rgba(255,255,255,.02)",
        }}
      >
        {activeCount > 0 ? (
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#ff8a3d", boxShadow: "0 0 10px #ff8a3d",
            animation: "pulse 1.4s ease-in-out infinite",
          }} />
        ) : (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7cd0a0" }} />
        )}
        <strong style={{ flex: 1, fontSize: 12.5 }}>
          {activeCount > 0 ? `${activeCount} gerando…` : "Pronto"}
        </strong>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>
          {visible.length} {visible.length === 1 ? "job" : "jobs"}
        </span>
        <span style={{ fontSize: 14 }}>{collapsed ? "▴" : "▾"}</span>
      </button>

      {!collapsed && (
        <>
          <div style={{ overflowY: "auto", flex: 1, padding: 6 }}>
            {visible.map((j) => (
              <JobRow
                key={j.id}
                job={j}
                onRemove={() => remove(j.id)}
                onOpen={() => onOpenResult?.(j)}
              />
            ))}
          </div>
          {visible.some((j) => j.status !== "processing") && (
            <button
              onClick={clearCompleted}
              style={{
                all: "unset", cursor: "pointer", padding: "8px 14px",
                fontSize: 11, color: "rgba(255,255,255,.5)",
                borderTop: "1px solid rgba(255,255,255,.06)", textAlign: "center",
              }}
            >
              Limpar concluídos
            </button>
          )}
        </>
      )}
    </div>
  );
}

function JobRow({ job, onRemove, onOpen }: { job: Job; onRemove: () => void; onOpen: () => void }) {
  const elapsed = Math.floor(((job.completedAt || Date.now()) - job.startedAt) / 1000);
  const statusColor =
    job.status === "completed" ? "#7cd0a0" :
    job.status === "failed" ? "#e85d3a" : "#ff8a3d";

  return (
    <div
      style={{
        display: "flex", gap: 10, padding: 8, borderRadius: 10,
        background: "rgba(255,255,255,.03)", marginBottom: 4,
        cursor: job.status === "completed" ? "pointer" : "default",
      }}
      onClick={() => job.status === "completed" && onOpen()}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 8, overflow: "hidden",
        background: "#0a0a0c", flexShrink: 0, position: "relative",
      }}>
        {job.resultUrl && job.mediaType === "image" ? (
          <img src={job.resultUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : job.thumb ? (
          <img src={job.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
        ) : null}
        {job.status === "processing" && (
          <div style={{
            position: "absolute", inset: 0, display: "grid", placeItems: "center",
            background: "rgba(0,0,0,.5)",
          }}>
            <div style={{
              width: 16, height: 16, border: "2px solid rgba(255,255,255,.2)",
              borderTopColor: "#ff8a3d", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: statusColor, flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,.5)" }}>
            {job.tool} · {job.mediaType}
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginLeft: "auto" }}>
            {elapsed}s
          </span>
        </div>
        <div style={{
          fontSize: 11.5, color: "rgba(255,255,255,.85)", marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {job.prompt || (job.error ? `Erro: ${job.error}` : "(sem prompt)")}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ all: "unset", cursor: "pointer", color: "rgba(255,255,255,.4)", fontSize: 14, padding: "0 4px" }}
        title="Remover"
      >
        ×
      </button>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  );
}
