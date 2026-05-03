/**
 * ImageWorkspace — UX redesenhada para /image (estilo Magnific).
 * - Coluna esquerda: controles (modelo, refs, prompt, ratio, qualidade, variações)
 * - Coluna direita: galeria grande agrupada por geração (com jobs em andamento)
 * - Lightbox full-screen com ações: download, edit, upscale, fav, delete, regen, video, info
 * - Histórico ao vivo via realtime (useGenerations)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { ModelPicker } from "./ModelPicker";
import { OutputControls } from "./OutputControls";
import { useJobs, type Job } from "../lib/jobs";
import { type Generation } from "../hooks/useGenerations";
import {
  IMAGE_MODELS,
  ASPECT_RATIOS,
  MODEL_LABEL_TO_ID,
  MODEL_ID_TO_LABEL,
  type AspectRatio,
} from "../lib/models";


type Props = {
  history: Generation[];
  onUploadRef: (file: File) => Promise<string | null>;
  showToast: (m: string) => void;
  refreshHistory: () => void;
  onDeleteGeneration: (id: string) => Promise<void>;
  onToggleFavorite: (id: string, value: boolean) => Promise<void>;
};

const QUALITIES = ["1K", "2K", "4K"] as const;
const VARIATIONS = [1, 2, 4, 6, 8] as const;

const STYLE_PRESETS: { id: string; label: string; suffix: string }[] = [
  { id: "none", label: "Nenhum", suffix: "" },
  { id: "cinematic", label: "Cinematic", suffix: ", cinematic still, anamorphic, dramatic lighting, depth of field" },
  { id: "editorial", label: "Editorial", suffix: ", editorial photography, magazine cover, soft natural light, fashion" },
  { id: "product", label: "Product", suffix: ", product photography, studio lighting, clean background, high detail" },
  { id: "anime", label: "Anime", suffix: ", anime illustration, cel shading, vibrant colors, detailed line art" },
  { id: "3d", label: "3D Render", suffix: ", 3D render, octane, ray tracing, cinematic lighting, 8k" },
];

const PROMPT_EXAMPLES = [
  "Retrato editorial de uma mulher ruiva, luz quente lateral, fundo desfocado",
  "Café de Tóquio à noite, neon, chuva, reflexos, estilo cinematográfico",
  "Tênis flutuando em fundo gradiente, foto de produto minimalista",
  "Paisagem alpina ao amanhecer, neblina, luz dourada, ultra detalhada",
];

export function ImageWorkspace({
  history, onUploadRef, showToast, refreshHistory,
  onDeleteGeneration, onToggleFavorite,
}: Props) {
  const navigate = useNavigate();
  const { jobs, enqueue } = useJobs();

  const [modelLabel, setModelLabel] = useState("Nano Banana Pro");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [quality, setQuality] = useState<string>("2K");
  const [variations, setVariations] = useState<number>(4);
  const [refs, setRefs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stylePreset, setStylePreset] = useState<string>("none");
  const [filterAspect, setFilterAspect] = useState<string>("all");
  const [filterFav, setFilterFav] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lightbox, setLightbox] = useState<{
    items: { url: string; genId: string; prompt: string; meta?: any; isFav?: boolean }[];
    index: number;
  } | null>(null);

  // ===== generation =====
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { showToast("Digite um prompt"); return; }
    const modelId = MODEL_LABEL_TO_ID[modelLabel] || "nano-banana-pro";
    const preset = STYLE_PRESETS.find((s) => s.id === stylePreset);
    const finalPrompt = (prompt.trim() + (preset?.suffix || "")).trim();
    const n = Math.max(1, variations);
    const promises = Array.from({ length: n }).map(() =>
      enqueue({
        tab: "image",
        prompt: finalPrompt,
        aspect: ratio,
        sourceUrl: refs[0] || null,
        model: modelId,
        thumb: refs[0] || undefined,
        quality,
        numVariations: 1,
      })
    );
    const results = await Promise.all(promises);
    const fail = results.find((r) => !r.ok);
    if (fail) showToast("Erro: " + (fail.error || "falha"));
    else showToast(n > 1 ? `${n} gerações em paralelo` : "Geração iniciada");
  }, [prompt, modelLabel, ratio, quality, variations, refs, enqueue, showToast, stylePreset]);

  const handleAttach = useCallback(async (file: File) => {
    if (refs.length >= 8) { showToast("Máximo 8 referências"); return; }
    setUploading(true);
    const url = await onUploadRef(file);
    setUploading(false);
    if (url) setRefs((p) => [...p, url]);
  }, [refs.length, onUploadRef, showToast]);

  // ===== feed: jobs ativos + history (realtime) =====
  const activeImageJobs = useMemo(
    () => jobs.filter((j) => j.mediaType === "image" && j.status !== "completed"),
    [jobs]
  );

  const imageHistory = useMemo(
    () => history.filter((g) => (g.image_urls?.length || 0) > 0 && g.media_type !== "video"),
    [history]
  );

  const usedAspects = useMemo(() => {
    const set = new Set<string>();
    imageHistory.forEach((g) => { const a = (g as any).aspect_ratio; if (a) set.add(a); });
    return Array.from(set);
  }, [imageHistory]);

  const filteredHistory = useMemo(() => {
    return imageHistory.filter((g) => {
      if (filterAspect !== "all" && (g as any).aspect_ratio !== filterAspect) return false;
      if (filterFav && !(g as any).metadata?.favorite) return false;
      return true;
    });
  }, [imageHistory, filterAspect, filterFav]);

  const totalImages = useMemo(
    () => filteredHistory.reduce((acc, g) => acc + (g.image_urls?.length || 0), 0),
    [filteredHistory]
  );

  // ===== lightbox helpers =====
  const openLightbox = useCallback((g: Generation, urlIdx = 0) => {
    const items = (g.image_urls || []).map((url) => ({
      url,
      genId: g.id,
      prompt: g.prompt || "",
      meta: { model: g.model, ratio: (g as any).aspect_ratio, quality: (g as any).resolution, ...((g as any).metadata || {}) },
      isFav: !!(g as any).metadata?.favorite,
    }));
    setLightbox({ items, index: urlIdx });
  }, []);

  // ===== global keys =====
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight") setLightbox((l) => l && { ...l, index: Math.min(l.items.length - 1, l.index + 1) });
      else if (e.key === "ArrowLeft") setLightbox((l) => l && { ...l, index: Math.max(0, l.index - 1) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <div className="img-ws">
      {/* ===== LEFT CONTROLS ===== */}
      <aside className="img-ws-controls">
        <div className="img-ws-brand">
          <span className="img-ws-brand-mark">
            <Icon d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" strokeWidth={2} />
          </span>
          <span className="img-ws-brand-name">Image Studio</span>
        </div>
        <div className="img-ws-sidebar-head">
          <h1>Criar imagens</h1>
          <p>Prompt, referências e saídas</p>
        </div>

        {/* MODELO */}
        <div className="img-ws-panel img-ws-panel--tight">
          <div className="img-ws-panel-head">
            <div className="img-ws-panel-title">
              <span className="img-ws-dot-orange" />
              Modelo
            </div>
          </div>
          <ModelPicker value={modelLabel} onChange={setModelLabel} />
        </div>

        {/* REFERÊNCIAS */}
        <div className="img-ws-panel">
          <div className="img-ws-panel-head">
            <div className="img-ws-panel-title">Referências</div>
            <span>{refs.length} / 8</span>
          </div>
          <div className="img-ws-section">
            <div className="img-ws-refs">
              {refs.map((url, i) => (
                <div key={i} className="img-ws-ref">
                  <img src={url} alt="ref" />
                  <button onClick={() => setRefs((p) => p.filter((_, j) => j !== i))} aria-label="Remover">
                    <Icon d="M6 6l12 12M6 18L18 6" />
                  </button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - refs.length) }).slice(0, refs.length === 0 ? 4 : 4 - refs.length).map((_, i) => (
                <button
                  key={`slot-${i}`}
                  className={"img-ws-ref-slot" + (i === 0 && refs.length < 8 ? " primary" : "")}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || refs.length >= 8}
                  aria-label="Adicionar referência"
                >
                  {i === 0 ? (
                    <>
                      <Icon d="M4 4h16v12H4z M4 16l4-4 4 4 4-4 4 4 M14 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                      <span>{uploading ? "Enviando…" : "Adicionar"}</span>
                    </>
                  ) : (
                    <Icon d="M12 5v14M5 12h14" />
                  )}
                </button>
              ))}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAttach(f);
                  if (e.currentTarget) e.currentTarget.value = "";
                }}
              />
            </div>
          </div>
        </div>

        {/* PROMPT */}
        <div className="img-ws-panel img-ws-panel--prompt">
          <div className="img-ws-panel-head">
            <div className="img-ws-panel-title">Prompt</div>
            <span className="kbd-inline">⌘↵</span>
          </div>
          <div className="img-ws-section">
            <textarea
              className="img-ws-textarea"
              placeholder="Ex: retrato editorial de uma mulher ruiva com luz quente lateral, fundo desfocado…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleGenerate(); }
              }}
              rows={4}
            />
            <div className="img-ws-style-row">
              {STYLE_PRESETS.filter(s => s.id !== "none").map((s) => (
                <button
                  key={s.id}
                  className={"img-ws-chip" + (s.id === stylePreset ? " active" : "")}
                  onClick={() => setStylePreset(s.id === stylePreset ? "none" : s.id)}
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SAÍDA */}
        <div className="img-ws-panel">
          <div className="img-ws-panel-head">
            <div className="img-ws-panel-title">Saída</div>
          </div>
          <OutputControls
            variations={variations}
            onVariations={setVariations}
            ratio={ratio}
            onRatio={setRatio}
            quality={quality}
            onQuality={setQuality}
          />
        </div>

        <div className="img-ws-generate-wrap">
          <button className="img-ws-generate" onClick={handleGenerate}>
            <Icon d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" strokeWidth={2} />
            <span className="img-ws-generate-label">Gerar {variations > 1 ? `${variations} imagens` : "imagem"}</span>
            <span className="kbd">⌘↵</span>
          </button>
        </div>
      </aside>

      {/* ===== RIGHT GALLERY ===== */}
      <section className="img-ws-gallery">
        <header className="img-ws-gallery-head">
          <div className="img-ws-gallery-title">
            <h2>Suas criações</h2>
            <p>{totalImages} {totalImages === 1 ? "imagem" : "imagens"} · atualizado agora</p>
          </div>
          <div className="img-ws-gallery-actions">
            <div className="img-ws-segmented" role="tablist">
              <button
                className={"img-ws-seg" + (filterAspect === "all" ? " active" : "")}
                onClick={() => setFilterAspect("all")}
              >Todos</button>
              {usedAspects.map((a) => (
                <button
                  key={a}
                  className={"img-ws-seg" + (filterAspect === a ? " active" : "")}
                  onClick={() => setFilterAspect(a)}
                >{a}</button>
              ))}
            </div>
            <button
              className={"img-ws-filter-btn" + (filterFav ? " active" : "")}
              onClick={() => setFilterFav((v) => !v)}
              title="Apenas favoritos"
            >
              <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" />
            </button>
            <button className="img-ws-refresh" onClick={refreshHistory} title="Recarregar">
              <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
            </button>
          </div>
        </header>

        <div className="img-ws-feed">
          {/* jobs em andamento — banner compacto */}
          {activeImageJobs.length > 0 && (
            <div className="img-ws-progress">
              <span className="img-ws-progress-spinner" />
              <span className="img-ws-progress-text">
                Gerando {activeImageJobs.length} {activeImageJobs.length > 1 ? "imagens" : "imagem"}…
              </span>
              <span className="img-ws-progress-eta">~{Math.max(8, activeImageJobs.length * 6)}s restantes</span>
            </div>
          )}

          {imageHistory.length === 0 && activeImageJobs.length === 0 && (
            <div className="img-ws-empty">
              <div className="img-ws-empty-glow" />
              <Icon d="M4 4h16v16H4z M4 16l4-4 4 4 4-4 4 4" strokeWidth={1.4} />
              <h3>Comece pela inspiração</h3>
              <p>Toque em um exemplo para preencher o prompt — ou escreva o seu.</p>
              <div className="img-ws-examples">
                {PROMPT_EXAMPLES.map((ex) => (
                  <button key={ex} className="img-ws-example" onClick={() => setPrompt(ex)}>
                    <Icon d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />
                    <span>{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredHistory.length === 0 && imageHistory.length > 0 && (
            <div className="img-ws-empty">
              <p>Nenhuma imagem com esse filtro.</p>
            </div>
          )}

          {filteredHistory.map((g) => (
            <article key={g.id} className="img-ws-row">
              <div className="img-ws-row-prompt">
                <div className="img-ws-row-copy">
                  <span className="img-ws-prompt-text" title={g.prompt}>{g.prompt || "(sem prompt)"}</span>
                  <span className="img-ws-row-meta">
                    <span className="tag">{(g as any).aspect_ratio || "16:9"}</span>
                    <span className="tag">{MODEL_ID_TO_LABEL[g.model || ""] || g.model || "—"}</span>
                    <span className="ago">{timeAgo(g.created_at)}</span>
                  </span>
                </div>
                <span className="img-ws-row-count">{(g.image_urls || []).length} {(g.image_urls || []).length > 1 ? "imgs" : "img"}</span>
              </div>
          <div className="img-ws-row-grid">
                {(g.image_urls || []).map((url, i) => (
                  <button
                    key={i}
                    className="img-ws-tile"
                    onClick={() => openLightbox(g, i)}
                  >
                    <img src={url} alt={g.prompt || ""} loading="lazy" />
                    <div className="img-ws-tile-overlay" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="img-ws-tile-action"
                        title="Favoritar"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(g.id, !(g as any).metadata?.favorite); }}
                      >
                        <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" />
                      </button>
                      <button
                        className="img-ws-tile-action"
                        title="Download"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const r = await fetch(url); const b = await r.blob();
                            const u = URL.createObjectURL(b);
                            const a = document.createElement("a");
                            a.href = u; a.download = `refine-${Date.now()}.png`;
                            document.body.appendChild(a); a.click(); a.remove();
                            URL.revokeObjectURL(u);
                          } catch { showToast("Falha"); }
                        }}
                      >
                        <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
                      </button>
                      <button
                        className="img-ws-tile-action"
                        title="Use as reference"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (refs.length >= 8) { showToast("Máximo 8 referências"); return; }
                          setRefs((p) => [...p, url]);
                          showToast("Adicionada como referência");
                        }}
                      >
                        <Icon d="M5 12h14M12 5l7 7-7 7" />
                      </button>
                    </div>
                    {(g as any).metadata?.favorite && (
                      <span className="img-ws-tile-fav" title="Favorito">
                        <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" strokeWidth={0} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== LIGHTBOX ===== */}
      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox((l) => l && { ...l, index: Math.max(0, l.index - 1) })}
          onNext={() => setLightbox((l) => l && { ...l, index: Math.min(l.items.length - 1, l.index + 1) })}
          showToast={showToast}
          onCopyPrompt={(p) => { setPrompt(p); showToast("Prompt copiado pro editor"); }}
          onUseAsRef={(url) => {
            if (refs.length >= 8) { showToast("Máximo 8 referências"); return; }
            setRefs((p) => [...p, url]);
            showToast("Adicionada como referência");
          }}
          onUseAsStyle={(url) => {
            if (refs.length >= 8) { showToast("Máximo 8 referências"); return; }
            setRefs((p) => [...p, url]);
            setPrompt((p) => p ? p + ", in the same visual style of the reference" : "Recreate using the visual style of the reference");
            showToast("Estilo aplicado — ajuste o prompt");
          }}
          onSendToEdit={(url) => navigate("/edit?ref=" + encodeURIComponent(url))}
          onSendToUpscale={(url) => navigate("/upscale?ref=" + encodeURIComponent(url))}
          onSendToVideo={(url) => navigate("/video?ref=" + encodeURIComponent(url))}
          onSendTo3D={(url) => navigate("/r3d?ref=" + encodeURIComponent(url))}
          onSendTo3DScene={(url) => navigate("/r3d?ref=" + encodeURIComponent(url) + "&style=scene")}
          onSendToSkinEnhancer={(url) => navigate("/edit?ref=" + encodeURIComponent(url) + "&op=relight&preset=skin")}
          onRegenerate={(item) => {
            setPrompt(item.prompt);
            setLightbox(null);
            setTimeout(() => handleGenerate(), 50);
          }}
          onVariations={async (item) => {
            const modelId = MODEL_LABEL_TO_ID[modelLabel] || "nano-banana-pro";
            const promises = Array.from({ length: 4 }).map(() =>
              enqueue({
                tab: "image", prompt: item.prompt, aspect: ratio,
                sourceUrl: item.url, model: modelId, thumb: item.url,
                quality, numVariations: 1,
              })
            );
            await Promise.all(promises);
            showToast("4 variações em paralelo");
            setLightbox(null);
          }}
          onChangeCamera={async (item) => {
            const modelId = MODEL_LABEL_TO_ID[modelLabel] || "nano-banana-pro";
            const newPrompt = `${item.prompt}, different camera angle, alternative perspective, same subject and style`;
            const promises = Array.from({ length: 4 }).map(() =>
              enqueue({
                tab: "image", prompt: newPrompt, aspect: ratio,
                sourceUrl: item.url, model: modelId, thumb: item.url,
                quality, numVariations: 1,
              })
            );
            await Promise.all(promises);
            showToast("Gerando ângulos alternativos");
            setLightbox(null);
          }}
          onToggleFavorite={async (item) => {
            const next = !item.isFav;
            await onToggleFavorite(item.genId, next);
            setLightbox((l) => {
              if (!l) return l;
              const items = l.items.map((it, i) => i === l.index ? { ...it, isFav: next } : it);
              return { ...l, items };
            });
          }}
          onDelete={async (item) => {
            if (!confirm("Excluir esta geração?")) return;
            await onDeleteGeneration(item.genId);
            setLightbox(null);
          }}
        />
      )}
    </div>
  );
}

function PendingTile({ job, ratio }: { job: Job; ratio: string }) {
  const arPad = ratioToPad(ratio);
  return (
    <div className="img-ws-tile pending" style={{ paddingBottom: arPad }}>
      <div className="img-ws-spinner" />
      {job.thumb && <img src={job.thumb} alt="" style={{ opacity: 0.25 }} />}
    </div>
  );
}

function ratioToPad(r: string) {
  const [a, b] = r.split(":").map(Number);
  if (!a || !b) return "75%";
  return `${(b / a) * 100}%`;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "agora";
  if (sec < 3600) return Math.floor(sec / 60) + "m";
  if (sec < 86400) return Math.floor(sec / 3600) + "h";
  return Math.floor(sec / 86400) + "d";
}

// =====================================================================
// LIGHTBOX
// =====================================================================
type LightboxProps = {
  items: { url: string; genId: string; prompt: string; meta?: any; isFav?: boolean }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  showToast: (m: string) => void;
  onCopyPrompt: (p: string) => void;
  onUseAsRef: (url: string) => void;
  onUseAsStyle: (url: string) => void;
  onSendToEdit: (url: string) => void;
  onSendToUpscale: (url: string) => void;
  onSendToVideo: (url: string) => void;
  onSendTo3D: (url: string) => void;
  onSendTo3DScene: (url: string) => void;
  onSendToSkinEnhancer: (url: string) => void;
  onRegenerate: (item: LightboxProps["items"][0]) => void;
  onVariations: (item: LightboxProps["items"][0]) => void;
  onChangeCamera: (item: LightboxProps["items"][0]) => void;
  onToggleFavorite: (item: LightboxProps["items"][0]) => void;
  onDelete: (item: LightboxProps["items"][0]) => void;
};

function Lightbox(p: LightboxProps) {
  const item = p.items[p.index];
  if (!item) return null;
  const meta = item.meta || {};
  const sizeLabel = meta.width && meta.height ? `${meta.width}×${meta.height}` : meta.size || "—";

  const download = async (format: "png" | "jpg" = "png") => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `refine-${Date.now()}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      p.showToast("Download iniciado");
    } catch {
      p.showToast("Falha ao baixar");
    }
  };

  return (
    <div className="img-lightbox" onClick={p.onClose}>
      <button className="img-lightbox-close" onClick={p.onClose} aria-label="Fechar">
        <Icon d="M6 6l12 12M6 18L18 6" strokeWidth={2} />
      </button>

      {p.index > 0 && (
        <button className="img-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); p.onPrev(); }}>
          <Icon d="M15 6l-6 6 6 6" strokeWidth={2} />
        </button>
      )}
      {p.index < p.items.length - 1 && (
        <button className="img-lightbox-nav next" onClick={(e) => { e.stopPropagation(); p.onNext(); }}>
          <Icon d="M9 6l6 6-6 6" strokeWidth={2} />
        </button>
      )}

      <div className="img-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img src={item.url} alt={item.prompt} />
      </div>

      <aside className="img-lightbox-side" onClick={(e) => e.stopPropagation()}>
        <div className="ils-card ils-card--hero">
          <div className="ils-card-top">
            <div className="ils-label">Preview</div>
            <span className="ils-position">{p.index + 1} / {p.items.length}</span>
          </div>
          <p className="ils-prompt">{item.prompt || "(sem prompt)"}</p>
          <button className="ils-link" onClick={() => p.onCopyPrompt(item.prompt)}>
            <Icon d="M8 4h10v14M4 8h10v12H4z" /> Copiar prompt
          </button>
        </div>

        <div className="ils-card">
          <div className="ils-label">Informações</div>
          <div className="ils-info-row"><span>Modelo</span><b>{MODEL_ID_TO_LABEL[meta.model] || meta.model || "—"}</b></div>
          <div className="ils-info-row"><span>Aspecto</span><b>{meta.ratio || "—"}</b></div>
          <div className="ils-info-row"><span>Qualidade</span><b>{meta.quality || "—"}</b></div>
          <div className="ils-info-row"><span>Tamanho</span><b>{sizeLabel}</b></div>
          {meta.seed && <div className="ils-info-row"><span>Seed</span><b>{meta.seed}</b></div>}
        </div>

        <div className="ils-card">
          <div className="ils-label">Exportar</div>
          <div className="ils-actions ils-actions--2">
            <button className="ils-btn primary" onClick={() => download("png")}>
              <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /> <span>PNG</span>
            </button>
            <button className="ils-btn" onClick={() => download("jpg")}>
              <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /> <span>JPG</span>
            </button>
          </div>
        </div>

        <div className="ils-card">
          <div className="ils-label">Reutilizar</div>
          <div className="ils-actions ils-actions--2">
            <button className="ils-btn" onClick={() => p.onUseAsRef(item.url)}>
              <Icon d="M5 12h14M12 5l7 7-7 7" /> <span>Referência</span>
            </button>
            <button className="ils-btn" onClick={() => p.onUseAsStyle(item.url)}>
              <Icon d="M3 12h18M3 6h18M3 18h12" /> <span>Estilo</span>
            </button>
            <button className="ils-btn" onClick={() => p.onCopyPrompt(item.prompt)}>
              <Icon d="M8 4h10v14M4 8h10v12H4z" /> <span>Prompt</span>
            </button>
            <button className="ils-btn" onClick={() => p.onToggleFavorite(item)}>
              <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" />
              <span>{item.isFav ? "Desfavoritar" : "Favoritar"}</span>
            </button>
          </div>
        </div>

        <div className="ils-card">
          <div className="ils-label">Gerar a partir desta</div>
          <div className="ils-actions ils-actions--3">
            <button className="ils-btn" onClick={() => p.onRegenerate(item)}>
              <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" /> <span>Recriar</span>
            </button>
            <button className="ils-btn primary" onClick={() => p.onVariations(item)}>
              <Icon d="M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z" /> <span>Variações</span>
            </button>
            <button className="ils-btn" onClick={() => p.onChangeCamera(item)}>
              <Icon d="M3 7h4l2-3h6l2 3h4v12H3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /> <span>Câmera</span>
            </button>
            <button className="ils-btn" onClick={() => p.onSendToEdit(item.url)}>
              <Icon d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" /> <span>Editar</span>
            </button>
            <button className="ils-btn" onClick={() => p.onSendToUpscale(item.url)}>
              <Icon d="M3 16V8a2 2 0 0 1 2-2h14M21 8v8a2 2 0 0 1-2 2H5" /> <span>Upscale</span>
            </button>
            <button className="ils-btn" onClick={() => p.onSendToSkinEnhancer(item.url)}>
              <Icon d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" /> <span>Pele</span>
            </button>
            <button className="ils-btn" onClick={() => p.onSendTo3D(item.url)}>
              <Icon d="M12 2 3 7v10l9 5 9-5V7z M12 12 3 7M12 12l9-5M12 12v10" /> <span>Modelo 3D</span>
            </button>
            <button className="ils-btn" onClick={() => p.onSendTo3DScene(item.url)}>
              <Icon d="M3 21V8l9-5 9 5v13M9 21V12h6v9" /> <span>Cena 3D</span>
            </button>
            <button className="ils-btn" onClick={() => p.onSendToVideo(item.url)}>
              <Icon d="M4 6h12v12H4z M16 9l5-3v12l-5-3" /> <span>Vídeo</span>
            </button>
          </div>
        </div>

        <div className="ils-card ils-card--danger">
          <button className="ils-btn danger" onClick={() => p.onDelete(item)} style={{ width: "100%", justifyContent: "center" }}>
            <Icon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /> Excluir geração
          </button>
        </div>
      </aside>
    </div>
  );
}
