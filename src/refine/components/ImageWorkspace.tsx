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
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [filterFav, setFilterFav] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [phIdx, setPhIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PROMPT_PLACEHOLDERS.length), 4000);
    return () => clearInterval(t);
  }, []);

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

  const usedModels = useMemo(() => {
    const set = new Set<string>();
    imageHistory.forEach((g) => { if (g.model) set.add(g.model); });
    return Array.from(set);
  }, [imageHistory]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const inDate = (iso?: string) => {
      if (filterDate === "all" || !iso) return true;
      const t = new Date(iso).getTime();
      const d = (now - t) / 86400000;
      if (filterDate === "today") return d < 1;
      if (filterDate === "yesterday") return d >= 1 && d < 2;
      if (filterDate === "week") return d < 7;
      if (filterDate === "month") return d < 31;
      return true;
    };
    return imageHistory.filter((g) => {
      if (filterAspect !== "all" && (g as any).aspect_ratio !== filterAspect) return false;
      if (filterModel !== "all" && g.model !== filterModel) return false;
      if (filterFav && !(g as any).metadata?.favorite) return false;
      if (!inDate(g.created_at)) return false;
      if (q && !(g.prompt || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [imageHistory, filterAspect, filterModel, filterDate, filterFav, search]);

  const hasActiveFilters = filterAspect !== "all" || filterModel !== "all" || filterDate !== "all" || filterFav || !!search.trim();
  const clearFilters = () => { setFilterAspect("all"); setFilterModel("all"); setFilterDate("all"); setFilterFav(false); setSearch(""); };

  // Agrupar gerações com mesmo prompt+modelo+aspecto em janela de 90s
  const groupedHistory = useMemo(() => {
    const groups: { key: string; gens: Generation[] }[] = [];
    const WINDOW_MS = 90_000;
    for (const g of filteredHistory) {
      const t = g.created_at ? new Date(g.created_at).getTime() : 0;
      const key = `${(g.prompt || "").trim()}|${g.model || ""}|${(g as any).aspect_ratio || ""}`;
      const last = groups[groups.length - 1];
      const lastT = last?.gens[0]?.created_at ? new Date(last.gens[0].created_at).getTime() : 0;
      if (last && last.key === key && Math.abs(lastT - t) <= WINDOW_MS) {
        last.gens.push(g);
      } else {
        groups.push({ key, gens: [g] });
      }
    }
    return groups;
  }, [filteredHistory]);

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
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      // Lightbox-only
      if (lightbox) {
        if (e.key === "Escape") setLightbox(null);
        else if (e.key === "ArrowRight") setLightbox((l) => l && { ...l, index: Math.min(l.items.length - 1, l.index + 1) });
        else if (e.key === "ArrowLeft") setLightbox((l) => l && { ...l, index: Math.max(0, l.index - 1) });
        return;
      }
      // Cmd/Ctrl+K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); searchRef.current?.focus(); return;
      }
      if (inField) return;
      if (e.key === "Escape") {
        if (selectMode) { setSelectMode(false); setSelected(new Set()); }
        else if (search) setSearch("");
      } else if (e.key.toLowerCase() === "f") {
        setFilterFav((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && selectMode) {
        e.preventDefault();
        const all = new Set<string>();
        filteredHistory.forEach((g) => (g.image_urls || []).forEach((u, i) => all.add(`${g.id}:${i}`)));
        setSelected(all);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, selectMode, search, filteredHistory]);

  // helpers
  const dateLabel = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = (start(now) - start(d)) / 86400000;
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    if (diff < 7) return d.toLocaleDateString("pt-BR", { weekday: "long" });
    if (diff < 31) return "Este mês";
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const toggleSelect = (key: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };


  return (
    <div className="img-ws">
      {/* ===== LEFT CONTROLS ===== */}
      <aside className="img-ws-controls">
        <div className="img-ws-sidebar-head">
          <span className="eyebrow">WORKSPACE · IMAGE</span>
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
          <div className="img-ws-gh-row">
            <div className="img-ws-gallery-title">
              <h2>Suas criações</h2>
              <p>{totalImages} {totalImages === 1 ? "imagem" : "imagens"} em {filteredHistory.length} {filteredHistory.length === 1 ? "geração" : "gerações"}</p>
            </div>
            <div className="img-ws-gallery-actions">
              <button
                className={"img-ws-chip-btn icon" + (selectMode ? " active" : "")}
                onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
                title="Modo seleção"
              >
                <Icon d="M9 11l3 3 8-8M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
              </button>
              <button className="img-ws-chip-btn icon" onClick={refreshHistory} title="Recarregar">
                <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
              </button>
            </div>
          </div>

          <div className="img-ws-gh-row">
            <div className="img-ws-search">
              <Icon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar nos seus prompts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="kbd-inline">⌘K</span>
            </div>
            <label className="img-ws-chip-btn">
              <Icon d="M4 6h16M7 12h10M10 18h4" />
              <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)}>
                <option value="all">Modelo</option>
                {usedModels.map((m) => (
                  <option key={m} value={m}>{MODEL_ID_TO_LABEL[m] || m}</option>
                ))}
              </select>
            </label>
            <label className="img-ws-chip-btn">
              <Icon d="M3 5h18v4H3z M5 11h14v8H5z" />
              <select value={filterAspect} onChange={(e) => setFilterAspect(e.target.value)}>
                <option value="all">Aspecto</option>
                {usedAspects.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="img-ws-chip-btn">
              <Icon d="M4 6h16M4 12h16M4 18h16" />
              <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                <option value="all">Data</option>
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
              </select>
            </label>
            <button
              className={"img-ws-chip-btn" + (filterFav ? " active" : "")}
              onClick={() => setFilterFav((v) => !v)}
              title="Favoritas (F)"
            >
              <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" />
              <span>Favoritas</span>
            </button>
            {hasActiveFilters && (
              <button className="img-ws-chip-btn clear" onClick={clearFilters}>
                <Icon d="M6 6l12 12M6 18L18 6" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="img-ws-active-chips">
              {search && (
                <span className="img-ws-active-chip">
                  Busca: "{search}"
                  <button onClick={() => setSearch("")}><Icon d="M6 6l12 12M6 18L18 6" /></button>
                </span>
              )}
              {filterModel !== "all" && (
                <span className="img-ws-active-chip">
                  Modelo: {MODEL_ID_TO_LABEL[filterModel] || filterModel}
                  <button onClick={() => setFilterModel("all")}><Icon d="M6 6l12 12M6 18L18 6" /></button>
                </span>
              )}
              {filterAspect !== "all" && (
                <span className="img-ws-active-chip">
                  Aspecto: {filterAspect}
                  <button onClick={() => setFilterAspect("all")}><Icon d="M6 6l12 12M6 18L18 6" /></button>
                </span>
              )}
              {filterDate !== "all" && (
                <span className="img-ws-active-chip">
                  Data: {filterDate}
                  <button onClick={() => setFilterDate("all")}><Icon d="M6 6l12 12M6 18L18 6" /></button>
                </span>
              )}
              {filterFav && (
                <span className="img-ws-active-chip">
                  Favoritas
                  <button onClick={() => setFilterFav(false)}><Icon d="M6 6l12 12M6 18L18 6" /></button>
                </span>
              )}
            </div>
          )}
        </header>

        <div className="img-ws-feed">
          {/* jobs em andamento */}
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
              <Icon d="M4 4h16v16H4z M4 16l4-4 4 4 4-4 4 4" strokeWidth={1.4} />
              <h3>Suas primeiras criações aparecem aqui</h3>
              <p>Comece descrevendo no painel à esquerda.</p>
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
              <Icon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3" strokeWidth={1.4} />
              <h3>Nenhum resultado encontrado</h3>
              <p>Tente ajustar os filtros ou usar outras palavras.</p>
              <button className="linkbtn" onClick={clearFilters}>Limpar filtros</button>
            </div>
          )}

          {groupedHistory.map((grp, gi) => {
            const head = grp.gens[0];
            const tiles: { url: string; gen: Generation }[] = [];
            grp.gens.forEach((g) => (g.image_urls || []).forEach((url) => tiles.push({ url, gen: g })));
            const prevHead = gi > 0 ? groupedHistory[gi - 1].gens[0] : null;
            const showDate = !prevHead || dateLabel(prevHead.created_at) !== dateLabel(head.created_at);
            const colCount = Math.min(4, tiles.length);
            return (
              <div key={head.id}>
                {showDate && (
                  <div className="img-ws-date-sep"><span>{dateLabel(head.created_at)}</span></div>
                )}
                <article className="img-ws-gen">
                  <div className="img-ws-gen-head">
                    <span className="img-ws-gen-prompt" title={head.prompt}>
                      {head.prompt || "(sem prompt)"}
                    </span>
                    <div className="img-ws-gen-meta">
                      <span className="tag">{MODEL_ID_TO_LABEL[head.model || ""] || head.model || "—"}</span>
                      <span className="tag">{(head as any).aspect_ratio || "16:9"}</span>
                      <span className="ago">{timeAgo(head.created_at)}</span>
                      <button
                        className="img-ws-gen-menu"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === head.id ? null : head.id); }}
                        title="Mais ações"
                      >
                        <Icon d="M12 5v.01M12 12v.01M12 19v.01" strokeWidth={2.5} />
                        {openMenuId === head.id && (
                          <div className="img-ws-gen-menu-pop" onMouseLeave={() => setOpenMenuId(null)}>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(head.prompt || ""); showToast("Prompt copiado"); setOpenMenuId(null); }}>Copiar prompt</button>
                            <button onClick={(e) => { e.stopPropagation(); setPrompt(head.prompt || ""); setOpenMenuId(null); showToast("Prompt no editor"); }}>Editar prompt</button>
                            <button onClick={(e) => { e.stopPropagation(); setPrompt(head.prompt || ""); setOpenMenuId(null); setTimeout(() => handleGenerate(), 50); }}>Gerar novamente</button>
                            <button onClick={(e) => { e.stopPropagation(); grp.gens.forEach((g) => onToggleFavorite(g.id, true)); setOpenMenuId(null); }}>Favoritar todas</button>
                            <button className="danger" onClick={(e) => { e.stopPropagation(); if (confirm("Excluir esta geração?")) grp.gens.forEach((g) => onDeleteGeneration(g.id)); setOpenMenuId(null); }}>Excluir</button>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="img-ws-gen-grid">
                    {tiles.map(({ url, gen: g }, i) => {
                      const key = `${g.id}:${i}`;
                      const isSel = selected.has(key);
                      const fav = !!(g as any).metadata?.favorite;
                      const ar = (g as any).aspect_ratio || "1:1";
                      const [aw, ah] = ar.split(":").map(Number);
                      const aspectStyle = aw && ah ? { aspectRatio: `${aw} / ${ah}` } : undefined;
                      return (
                        <button
                          key={key}
                          className={"img-ws-tile" + (isSel ? " selected" : "")}
                          style={aspectStyle as any}
                          onClick={() => {
                            if (selectMode) toggleSelect(key);
                            else openLightbox({ ...g, image_urls: tiles.map((t) => t.url) } as Generation, i);
                          }}
                        >
                          <img src={url} alt={g.prompt || ""} loading="lazy" />
                          <div className="img-ws-tile-overlay" />
                          {selectMode && (
                            <span className={"img-ws-tile-check" + (isSel ? " checked" : "")}>
                              <Icon d="M5 12l5 5L20 7" strokeWidth={3} />
                            </span>
                          )}
                          {!selectMode && (
                            <div className="img-ws-tile-actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                className={"img-ws-tile-action" + (fav ? " active" : "")}
                                title="Favoritar"
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(g.id, !fav); }}
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
                                title="Detalhes"
                                onClick={(e) => { e.stopPropagation(); openLightbox({ ...g, image_urls: tiles.map((t) => t.url) } as Generation, i); }}
                              >
                                <Icon d="M12 8v.01M11 12h1v4h1" strokeWidth={2} />
                              </button>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </article>
              </div>
            );
          })}
        </div>

        {/* Bulk action bar */}
        {selectMode && selected.size > 0 && (
          <div className="img-ws-bulk">
            <span className="img-ws-bulk-count">{selected.size} selecionada{selected.size > 1 ? "s" : ""}</span>
            <span className="img-ws-bulk-sep" />
            <button onClick={() => {
              const all = new Set<string>();
              filteredHistory.forEach((g) => (g.image_urls || []).forEach((_, i) => all.add(`${g.id}:${i}`)));
              setSelected(all);
            }}>Selecionar todas</button>
            <button onClick={() => setSelected(new Set())}>Limpar</button>
            <span className="img-ws-bulk-sep" />
            <button onClick={() => showToast("Download em lote em breve")}>
              <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /> Baixar
            </button>
            <button onClick={() => {
              const ids = new Set<string>();
              selected.forEach((k) => ids.add(k.split(":")[0]));
              ids.forEach((id) => onToggleFavorite(id, true));
              showToast("Favoritadas");
            }}>
              <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" /> Favoritar
            </button>
            <button className="danger" onClick={() => {
              if (!confirm(`Excluir ${selected.size} item(ns)?`)) return;
              const ids = new Set<string>();
              selected.forEach((k) => ids.add(k.split(":")[0]));
              ids.forEach((id) => onDeleteGeneration(id));
              setSelected(new Set()); setSelectMode(false);
            }}>
              <Icon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /> Excluir
            </button>
          </div>
        )}
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
  const [showPanel, setShowPanel] = useState<boolean>(() => {
    try { return localStorage.getItem("ils-panel") === "1"; } catch { return false; }
  });
  const [zoomed, setZoomed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("ils-panel", showPanel ? "1" : "0"); } catch {}
  }, [showPanel]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "v" || e.key === "V") p.onVariations(item);
      else if (e.key === "e" || e.key === "E") p.onSendToEdit(item.url);
      else if (e.key === "r" || e.key === "R") p.onCopyPrompt(item.prompt);
      else if (e.key === "d" || e.key === "D") download("png");
      else if (e.key === "f" || e.key === "F") p.onToggleFavorite(item);
      else if (e.key === "i" || e.key === "I") setShowPanel((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, p]);

  if (!item) return null;
  const meta = item.meta || {};
  const sizeLabel = meta.width && meta.height ? `${meta.width}×${meta.height}` : meta.size || "—";

  async function download(format: "png" | "jpg" | "webp" = "png") {
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
      setExportOpen(false);
    } catch {
      p.showToast("Falha ao baixar");
    }
  }

  async function copyImage() {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      // @ts-ignore
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      p.showToast("Imagem copiada");
    } catch {
      p.showToast("Falha ao copiar");
    }
    setExportOpen(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(item.url);
      p.showToast("Link copiado");
    } catch { p.showToast("Falha ao copiar link"); }
    setShareOpen(false);
  }

  const [moreOpen, setMoreOpen] = useState(false);
  const [exportSub, setExportSub] = useState(false);
  const [shareSub, setShareSub] = useState(false);
  const [genSub, setGenSub] = useState(false);

  return (
    <div className="ilx" onClick={p.onClose} data-panel={showPanel ? "open" : "closed"}>
      {/* Top bar */}
      <div className="ilx-topbar" onClick={(e) => e.stopPropagation()}>
        <div className="ilx-glass-group">
          <button className="ilx-glass-btn" onClick={p.onClose} title="Voltar (Esc)">
            <Icon d="M15 6l-6 6 6 6" strokeWidth={1.75} />
            <span>Voltar</span>
          </button>
          <span className="ilx-vsep" />
          <span className="ilx-counter">{p.index + 1} de {p.items.length}</span>
        </div>

        <div className="ilx-glass-group">
          <button className="ilx-glass-btn round" disabled={p.index === 0} onClick={p.onPrev} title="Anterior (←)">
            <Icon d="M15 6l-6 6 6 6" strokeWidth={1.75} />
          </button>
          <button className="ilx-glass-btn round" disabled={p.index === p.items.length - 1} onClick={p.onNext} title="Próxima (→)">
            <Icon d="M9 6l6 6-6 6" strokeWidth={1.75} />
          </button>
        </div>

        <button className="ilx-glass-btn round solo" onClick={p.onClose} title="Fechar (Esc)">
          <Icon d="M6 6l12 12M6 18L18 6" strokeWidth={1.75} />
        </button>
      </div>

      {/* Stage */}
      <div className="ilx-stage" onClick={(e) => e.stopPropagation()}>
        <img
          src={item.url}
          alt={item.prompt}
          className={zoomed ? "zoomed" : ""}
          onClick={() => setZoomed((z) => !z)}
        />
      </div>

      {/* Bottom dock */}
      <div className="ilx-dock" onClick={(e) => e.stopPropagation()}>
        <button className="ilx-dock-primary" onClick={() => p.onVariations(item)} title="Variações (V)">
          <Icon d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" strokeWidth={1.75} />
          <span>Variações</span>
        </button>

        <span className="ilx-vsep" />

        <button className="ilx-dock-btn" onClick={() => p.onRegenerate(item)} title="Recriar (R)">
          <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" strokeWidth={1.75} />
          <span>Recriar</span>
        </button>
        <button className="ilx-dock-btn" onClick={() => p.onSendToUpscale(item.url)} title="Upscale (U)">
          <Icon d="M3 16V8a2 2 0 0 1 2-2h14M21 8v8a2 2 0 0 1-2 2H5M8 12l4-4 4 4M12 8v9" strokeWidth={1.75} />
          <span>Upscale</span>
        </button>
        <button className="ilx-dock-btn" onClick={() => p.onSendToEdit(item.url)} title="Editar (E)">
          <Icon d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" strokeWidth={1.75} />
          <span>Editar</span>
        </button>

        <span className="ilx-vsep" />

        <button
          className={`ilx-dock-btn ${showPanel ? "active" : ""}`}
          onClick={() => setShowPanel((s) => !s)}
          title="Detalhes (I)"
        >
          <Icon d="M12 8v.01M11 12h1v4h1" strokeWidth={1.75} />
          <span>Detalhes</span>
        </button>

        <div className="ilx-pill-wrap">
          <button className="ilx-glass-btn round" onClick={() => setMoreOpen((o) => !o)} title="Mais ações">
            <Icon d="M12 5v.01M12 12v.01M12 19v.01" strokeWidth={2.5} />
          </button>
          {moreOpen && (
            <div className="ilx-menu wide" onMouseLeave={() => { setMoreOpen(false); setExportSub(false); setShareSub(false); }}>
              <button onMouseEnter={() => { setExportSub(true); setShareSub(false); }} className="has-sub">
                <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeWidth={1.75} />
                <span>Exportar</span>
                <Icon d="M9 6l6 6-6 6" strokeWidth={1.75} />
                {exportSub && (
                  <div className="ilx-submenu">
                    <button onClick={() => download("png")}>PNG</button>
                    <button onClick={() => download("jpg")}>JPG</button>
                    <button onClick={() => download("webp")}>WebP</button>
                    <button onClick={copyImage}>Copiar imagem</button>
                  </div>
                )}
              </button>
              <button onMouseEnter={() => { setShareSub(true); setExportSub(false); }} className="has-sub">
                <Icon d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" strokeWidth={1.75} />
                <span>Compartilhar</span>
                <Icon d="M9 6l6 6-6 6" strokeWidth={1.75} />
                {shareSub && (
                  <div className="ilx-submenu">
                    <button onClick={copyLink}>Copiar link</button>
                    <button onClick={() => p.showToast("Em breve")}>Enviar por email</button>
                  </div>
                )}
              </button>
              <button onMouseEnter={() => { setExportSub(false); setShareSub(false); }} onClick={() => { p.onCopyPrompt(item.prompt); setMoreOpen(false); }}>
                <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" strokeWidth={1.75} />
                <span>Reusar prompt</span>
              </button>
              <button onMouseEnter={() => { setExportSub(false); setShareSub(false); }} onClick={() => { p.onToggleFavorite(item); setMoreOpen(false); }}>
                <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" strokeWidth={1.75} />
                <span>{item.isFav ? "Remover dos favoritos" : "Favoritar"}</span>
              </button>
              <div className="ilx-menu-sep" />
              <button onMouseEnter={() => { setExportSub(false); setShareSub(false); }} onClick={() => { p.showToast("Em breve"); setMoreOpen(false); }}>
                <Icon d="M3 7h6l2 2h10v10H3z" strokeWidth={1.75} />
                <span>Mover para coleção</span>
              </button>
              <button onMouseEnter={() => { setExportSub(false); setShareSub(false); }} onClick={() => { p.showToast("Em breve"); setMoreOpen(false); }}>
                <Icon d="M20 13l-8 8-8-8 8-11h6z M9 9h.01" strokeWidth={1.75} />
                <span>Adicionar tags</span>
              </button>
              <div className="ilx-menu-sep" />
              <button className="danger" onMouseEnter={() => { setExportSub(false); setShareSub(false); }} onClick={() => { p.onDelete(item); setMoreOpen(false); }}>
                <Icon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeWidth={1.75} />
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      {showPanel && (
        <aside className="ilx-side" onClick={(e) => e.stopPropagation()}>
          <section className="ilx-sec">
            <div className="ilx-sec-label">PROMPT</div>
            <div className="ilx-prompt-card">
              <button className="ilx-prompt-copy" onClick={() => p.onCopyPrompt(item.prompt)} title="Copiar">
                <Icon d="M8 4h10v14M4 8h10v12H4z" strokeWidth={1.75} />
              </button>
              <p>{item.prompt || "(sem prompt)"}</p>
            </div>
          </section>

          <section className="ilx-sec">
            <div className="ilx-sec-label">INFORMAÇÕES</div>
            <div className="ilx-meta-grid">
              {(MODEL_ID_TO_LABEL[meta.model] || meta.model) && (
                <div><span>Modelo</span><b>{MODEL_ID_TO_LABEL[meta.model] || meta.model}</b></div>
              )}
              {meta.ratio && <div><span>Aspecto</span><b>{meta.ratio}</b></div>}
              {meta.quality && <div><span>Qualidade</span><b>{meta.quality}</b></div>}
              {sizeLabel !== "—" && <div><span>Resolução</span><b>{sizeLabel}</b></div>}
              {meta.seed && <div><span>Sementes</span><b>{meta.seed}</b></div>}
              {meta.cost && <div><span>Custo</span><b>{meta.cost} créditos</b></div>}
            </div>
          </section>

          <section className="ilx-sec">
            <div className="ilx-sec-label">CRIAR VARIAÇÕES</div>
            <div className="ilx-cards-grid">
              <button className="ilx-card" onClick={() => p.onVariations(item)}>
                <Icon d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" strokeWidth={1.75} />
                <div><b>Variações</b><em>Mesmo prompt, 4 versões</em></div>
              </button>
              <button className="ilx-card" onClick={() => p.onRegenerate(item)}>
                <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" strokeWidth={1.75} />
                <div><b>Recriar</b><em>Nova seed, mesmo prompt</em></div>
              </button>
              <button className="ilx-card" onClick={() => p.onSendToUpscale(item.url)}>
                <Icon d="M12 4v16M4 12h16M8 8l4-4 4 4M8 16l4 4 4-4" strokeWidth={1.75} />
                <div><b>Upscale</b><em>2x resolução com IA</em></div>
              </button>
              <button className="ilx-card" onClick={() => p.onSendToEdit(item.url)}>
                <Icon d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" strokeWidth={1.75} />
                <div><b>Editar</b><em>Inpaint, máscaras, refine</em></div>
              </button>
              <button className="ilx-card" onClick={() => p.onSendToVideo(item.url)}>
                <Icon d="M4 6h12v12H4z M16 9l5-3v12l-5-3" strokeWidth={1.75} />
                <div><b>Gerar vídeo</b><em>Animar com Veo / Sora</em></div>
              </button>
              <button className="ilx-card" onClick={() => p.onChangeCamera(item)}>
                <Icon d="M3 7h4l2-3h6l2 3h4v12H3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeWidth={1.75} />
                <div><b>Mudar câmera</b><em>Novo ângulo, mesmo cenário</em></div>
              </button>
            </div>
          </section>

          <section className="ilx-sec">
            <div className="ilx-sec-label">AÇÕES</div>
            <ul className="ilx-actions-list">
              <li><button onClick={() => p.onToggleFavorite(item)}>
                <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" strokeWidth={1.75} />
                {item.isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              </button></li>
              <li><button onClick={() => p.showToast("Em breve")}>
                <Icon d="M3 7h6l2 2h10v10H3z" strokeWidth={1.75} />
                Mover para coleção
              </button></li>
              <li><button onClick={() => p.showToast("Em breve")}>
                <Icon d="M20 13l-8 8-8-8 8-11h6z" strokeWidth={1.75} />
                Adicionar tags
              </button></li>
              <li><button onClick={copyLink}>
                <Icon d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" strokeWidth={1.75} />
                Copiar link público
              </button></li>
              <li className="ilx-actions-sep" />
              <li><button onClick={() => p.onDelete(item)} className="danger">
                <Icon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeWidth={1.75} />
                Excluir
              </button></li>
            </ul>
          </section>
        </aside>
      )}
    </div>
  );
}

