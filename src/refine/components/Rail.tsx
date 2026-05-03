import { useState } from "react";
import { Icon } from "./Icon";
import { HISTORY_MOCK, type HistoryItem } from "../lib/history-mock";
import type { Generation } from "../hooks/useGenerations";

type RailProps = {
  generations: Generation[];
  onItemClick: (item: { img: string; prompt: string; kind?: "image" | "video" }) => void;
};

type Tab = "history" | "community" | "saved";

export function Rail({ generations, onItemClick }: RailProps) {
  const [tab, setTab] = useState<Tab>("history");
  const [search, setSearch] = useState("");

  // Combina geracoes reais (topo) + history mockado pra preencher
  const real: HistoryItem[] = generations
    .filter((g) => (g.image_urls?.[0] || g.video_urls?.[0]))
    .map((g) => ({
      p: g.prompt || "(sem prompt)",
      img: (g.video_urls?.[0] || g.image_urls?.[0])!,
      t: timeAgo(g.created_at),
      kind: g.video_urls?.[0] ? "video" : "image",
    }));
  const items = [...real, ...HISTORY_MOCK].slice(0, 30);

  const filtered = search.trim()
    ? items.filter((i) => i.p.toLowerCase().includes(search.toLowerCase()))
    : items;

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
