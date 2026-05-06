import { useState } from "react";
import { Icon } from "./Icon";
import { HISTORY_MOCK, type HistoryItem } from "../lib/history-mock";
import type { Generation } from "../hooks/useGenerations";

type RailProps = {
  generations: Generation[];
  onItemClick: (item: { img: string; prompt: string; kind?: "image" | "video" }) => void;
  /** Aba atual — usada como filtro inicial. */
  currentTab?: string;
};

type Tab = "history" | "community" | "saved";
type ToolFilter = "all" | "image" | "video" | "audio" | "edit" | "upscale";

const TOOL_FILTERS: { id: ToolFilter; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "image", label: "Imagem" },
  { id: "video", label: "Vídeo" },
  { id: "audio", label: "Áudio" },
  { id: "edit", label: "Edit" },
  { id: "upscale", label: "Upscale" },
];

type EnrichedItem = HistoryItem & { tool?: string };

function inferTool(g: Generation): string {
  if (g.tool) {
    const t = g.tool.toLowerCase();
    if (t.includes("upscal")) return "upscale";
    if (t.includes("edit") || t.includes("bg") || t.includes("style") || t.includes("relight") || t.includes("expand") || t.includes("inpaint") || t.includes("camera") || t.includes("skin")) return "edit";
    if (t.includes("video")) return "video";
    if (t.includes("audio") || t.includes("music") || t.includes("sfx") || t.includes("voice")) return "audio";
    return "image";
  }
  if (g.media_type === "video") return "video";
  if (g.media_type === "audio") return "audio";
  return "image";
}

export function Rail({ generations, onItemClick, currentTab }: RailProps) {
  const [tab, setTab] = useState<Tab>("history");
  const [search, setSearch] = useState("");
  const initialFilter: ToolFilter = (() => {
    const t = currentTab || "";
    if (TOOL_FILTERS.some((f) => f.id === t)) return t as ToolFilter;
    return "all";
  })();
  const [tool, setTool] = useState<ToolFilter>(initialFilter);

  // Combina geracoes reais (topo) + history mockado pra preencher
  const real: EnrichedItem[] = generations
    .filter((g) => (g.image_urls?.[0] || g.video_urls?.[0]))
    .map((g) => ({
      p: g.prompt || "(sem prompt)",
      img: (g.video_urls?.[0] || g.image_urls?.[0])!,
      t: timeAgo(g.created_at),
      kind: g.video_urls?.[0] ? "video" : "image",
      tool: inferTool(g),
    }));
  const mockEnriched: EnrichedItem[] = HISTORY_MOCK.map((h) => ({
    ...h,
    tool: h.kind === "video" ? "video" : "image",
  }));
  const items = [...real, ...mockEnriched];

  const filtered = items
    .filter((i) => tool === "all" || i.tool === tool)
    .filter((i) => !search.trim() || i.p.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 30);

  return (
    <aside className="rail">
      <div className="rail-head">
        <div className="rail-tabs">
          <span className="rail-tab-ind"></span>
          <button
            className={"rail-tab" + (tab === "history" ? " active" : "")}
            onClick={() => setTab("history")}
          >
            <Icon d="M3 3h18v18H3z" />
            Histórico
          </button>
          <button
            className={"rail-tab" + (tab === "community" ? " active" : "")}
            onClick={() => setTab("community")}
          >
            <Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" />
            Comunidade
          </button>
          <button
            className={"rail-tab" + (tab === "saved" ? " active" : "")}
            onClick={() => setTab("saved")}
          >
            <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" />
            Salvos
          </button>
        </div>
        {tab === "history" && (
          <div style={{
            display: "flex", gap: 4, padding: "4px 10px 8px", flexWrap: "wrap",
          }}>
            {TOOL_FILTERS.map((f) => {
              const active = tool === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setTool(f.id)}
                  style={{
                    all: "unset", cursor: "pointer",
                    padding: "3px 9px", fontSize: 10.5, borderRadius: 999,
                    color: active ? "#ff8a3d" : "rgba(255,255,255,.55)",
                    background: active ? "rgba(255,106,26,.12)" : "rgba(255,255,255,.04)",
                    border: "1px solid " + (active ? "rgba(255,106,26,.4)" : "rgba(255,255,255,.08)"),
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="rail-search">
          <Icon d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 m9 16-3.5-3.5" />
          <input
            placeholder="Buscar nas suas gerações…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="rail-list">
        {tab !== "history" && (
          <div style={{ padding: 16, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
            Em breve
          </div>
        )}
        {tab === "history" && filtered.length === 0 && (
          <div style={{ padding: 16, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
            Nada por aqui ainda.
          </div>
        )}
        {tab === "history" &&
          filtered.map((h, i) => (
            <article
              key={i}
              className="history"
              style={{ animationDelay: `${i * 55}ms`, position: "relative" }}
              onClick={() => onItemClick({ img: h.img, prompt: h.p, kind: h.kind })}
            >
              {h.kind === "video" ? (
                <>
                  <video
                    src={h.img + "#t=0.5"}
                    muted
                    playsInline
                    loop
                    preload="auto"
                    onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.5; }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLVideoElement).play().catch(() => {}); }}
                    onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0.5; }}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#0a0a0c" }}
                  />
                  <span style={{
                    position: "absolute", top: 6, right: 6, zIndex: 2,
                    background: "rgba(0,0,0,.7)", color: "#fff",
                    fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
                  }}>▶ VIDEO</span>
                </>
              ) : (
                <img src={h.img} alt={h.p} loading="lazy" />
              )}
              {h.pin && <span className={"pin " + (h.pin === "FAV" ? "fav" : "")}>{h.pin}</span>}
              <div className="label">
                <div>{h.p}</div>
                <div className="ago">{h.t}</div>
              </div>
            </article>
          ))}
      </div>
    </aside>
  );
}

function timeAgo(iso?: string) {
  if (!iso) return "agora";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "agora";
  if (sec < 3600) return Math.floor(sec / 60) + "min";
  if (sec < 86400) return Math.floor(sec / 3600) + "h";
  return Math.floor(sec / 86400) + "d";
}
