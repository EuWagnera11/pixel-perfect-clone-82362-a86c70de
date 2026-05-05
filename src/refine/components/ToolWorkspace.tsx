/**
 * ToolWorkspace — shell genérico (3 colunas) reutilizado por todas as
 * ferramentas que ainda não têm workspace dedicado:
 *  cinema, edit, audio, upscale, ecommerce, product, r3d, assets, depth,
 *  character, marketing.
 *
 * Mesmo visual do Image/Video Workspace:
 *   ┌───── controles ─────┐ ┌──── galeria ────┐
 *   │  refs (se aplicável)│ │  feed da tab    │
 *   │  modelo             │ │                 │
 *   │  prompt             │ │                 │
 *   │  opções da tab      │ │                 │
 *   │  saída (var/ratio)  │ │                 │
 *   │  [GERAR]            │ │                 │
 *   └─────────────────────┘ └─────────────────┘
 *
 * Cada ferramenta declara seu próprio "config" (refs, prompt, modelos,
 * mídia output). O dispatch continua passando pelo `enqueue` do JobsProvider.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { OutputControls } from "./OutputControls";
import { ReferencesPanel, getRefLimit, type RefItem } from "./ReferencesPanel";
import { PromptInput, type PromptInputHandle, type MentionItem } from "./PromptInput";
import { LibraryPage } from "./LibraryPage";
import { ToolOptionsBar, tabHasOptions, type ToolOptions } from "./ToolOptionsBar";
import { useJobs, type Job } from "../lib/jobs";
import { type Generation } from "../hooks/useGenerations";
import {
  IMAGE_MODELS,
  MODEL_LABEL_TO_ID,
  MODEL_ID_TO_LABEL,
  DEFAULT_MODEL_BY_TAB,
  type AspectRatio,
} from "../lib/models";

/* ─────────────── Config por tab ─────────────── */

type MediaKind = "image" | "video" | "audio";

type TabCfg = {
  title: string;
  eyebrow: string;
  subtitle: string;
  /** Mídia de saída (define galeria + ícone). */
  output: MediaKind;
  /** Mostrar painel de referências (uploads/biblioteca). */
  showRefs: boolean;
  /** Refs obrigatórias (mínimo 1) — ex.: edit, upscale, product. */
  requiresRef?: boolean;
  /** Prompt obrigatório? */
  promptRequired: boolean;
  /** Mostrar ModelPicker (lista IMAGE_MODELS). */
  showModel: boolean;
  /** Mostrar OutputControls (variations/ratio/quality). */
  showOutput: boolean;
  /** Placeholder do prompt. */
  placeholder: string;
  /** Botão Gerar — texto. */
  ctaSingular: string;
  ctaPlural: string;
  /** Default model id (sobrescreve DEFAULT_MODEL_BY_TAB). */
  defaultModelId?: string;
  /** Default aspect ratio. */
  defaultRatio?: AspectRatio;
};

const TAB_CFG: Record<string, TabCfg> = {
  cinema: {
    title: "Cinema",
    eyebrow: "WORKSPACE · CINEMA",
    subtitle: "Cenas cinematográficas com prompt enriquecido",
    output: "image", showRefs: true, promptRequired: true, showModel: true, showOutput: true,
    placeholder: "Ex: cena anos 70, grão de filme, anamórfica, luz dourada…",
    ctaSingular: "Gerar cena", ctaPlural: "Gerar cenas",
    defaultRatio: "21:9",
  },
  edit: {
    title: "Edit Image",
    eyebrow: "WORKSPACE · EDIT",
    subtitle: "Edição via remove/replace BG, relight, expand, inpaint, câmera…",
    output: "image", showRefs: true, requiresRef: true, promptRequired: false,
    showModel: false, showOutput: false,
    placeholder: "Descreva a edição (quando aplicável)…",
    ctaSingular: "Editar imagem", ctaPlural: "Editar",
  },
  upscale: {
    title: "Upscale",
    eyebrow: "WORKSPACE · UPSCALE",
    subtitle: "Aumente a resolução de imagens ou vídeos com Magnific.",
    output: "image", showRefs: true, requiresRef: true, promptRequired: false,
    showModel: false, showOutput: false,
    placeholder: "Prompt opcional para guiar o upscale (Creative)…",
    ctaSingular: "Fazer upscale", ctaPlural: "Upscale",
  },
  audio: {
    title: "Audio Studio",
    eyebrow: "WORKSPACE · AUDIO",
    subtitle: "Música, SFX, voiceover ou isolar áudio.",
    output: "audio", showRefs: false, promptRequired: true,
    showModel: false, showOutput: false,
    placeholder: "Descreva a música, SFX ou texto (voiceover)…",
    ctaSingular: "Gerar áudio", ctaPlural: "Gerar",
  },
  product: {
    title: "Product Gen",
    eyebrow: "WORKSPACE · PRODUCT",
    subtitle: "Cenas de produto profissionais a partir de uma foto.",
    output: "image", showRefs: true, requiresRef: true, promptRequired: true,
    showModel: true, showOutput: true,
    placeholder: "Ex: produto sobre mármore com luz suave de janela…",
    ctaSingular: "Gerar cena", ctaPlural: "Gerar cenas",
    defaultRatio: "1:1",
  },
  ecommerce: {
    title: "E-commerce",
    eyebrow: "WORKSPACE · E-COMMERCE",
    subtitle: "Foto de produto fundo branco para catálogo.",
    output: "image", showRefs: true, requiresRef: true, promptRequired: false,
    showModel: true, showOutput: true,
    placeholder: "Detalhes opcionais (ângulo, iluminação)…",
    ctaSingular: "Gerar foto", ctaPlural: "Gerar fotos",
    defaultRatio: "1:1",
  },
  character: {
    title: "Character",
    eyebrow: "WORKSPACE · CHARACTER",
    subtitle: "Design de personagem com referências.",
    output: "image", showRefs: true, promptRequired: true,
    showModel: true, showOutput: true,
    placeholder: "Descreva o personagem (estilo, traços, pose)…",
    ctaSingular: "Gerar personagem", ctaPlural: "Gerar variações",
    defaultRatio: "4:5",
  },
  r3d: {
    title: "Realistic 3D",
    eyebrow: "WORKSPACE · 3D",
    subtitle: "Transforme uma imagem em figurine / toy / argila.",
    output: "image", showRefs: true, requiresRef: true, promptRequired: false,
    showModel: true, showOutput: true,
    placeholder: "Detalhes do estilo 3D (opcional)…",
    ctaSingular: "Gerar 3D", ctaPlural: "Gerar variações",
    defaultRatio: "1:1",
  },
  depth: {
    title: "Depth Map",
    eyebrow: "WORKSPACE · DEPTH",
    subtitle: "Extraia mapa de profundidade de qualquer imagem.",
    output: "image", showRefs: true, requiresRef: true, promptRequired: false,
    showModel: false, showOutput: false,
    placeholder: "",
    ctaSingular: "Extrair depth", ctaPlural: "Extrair",
  },
  assets: {
    title: "Assets Gen",
    eyebrow: "WORKSPACE · ASSETS",
    subtitle: "Gere ícones, sprites, props ou elementos de UI.",
    output: "image", showRefs: true, promptRequired: true,
    showModel: false, showOutput: true,
    placeholder: "Descreva o asset (estilo, cor, contexto)…",
    ctaSingular: "Gerar asset", ctaPlural: "Gerar assets",
    defaultRatio: "1:1",
  },
  marketing: {
    title: "Marketing",
    eyebrow: "WORKSPACE · MARKETING",
    subtitle: "Hero shots e campanhas a partir de um briefing.",
    output: "image", showRefs: true, promptRequired: true,
    showModel: true, showOutput: true,
    placeholder: "Briefing da campanha (público, tom, oferta)…",
    ctaSingular: "Gerar peça", ctaPlural: "Gerar peças",
    defaultRatio: "1:1",
  },
};

export function tabHasToolWorkspace(tab: string): boolean {
  return Object.prototype.hasOwnProperty.call(TAB_CFG, tab);
}

/* ─────────────── Componente ─────────────── */

type Props = {
  tab: string;
  history: Generation[];
  onUploadRef: (file: File) => Promise<string | null>;
  showToast: (m: string) => void;
  refreshHistory: () => void;
  onDeleteGeneration: (id: string) => Promise<void>;
  onToggleFavorite: (id: string, value: boolean) => Promise<void>;
};

export function ToolWorkspace({
  tab, history, onUploadRef, showToast, refreshHistory,
  onDeleteGeneration, onToggleFavorite,
}: Props) {
  const cfg = TAB_CFG[tab];
  const { jobs, enqueue } = useJobs();

  const defaultModelId = cfg.defaultModelId || DEFAULT_MODEL_BY_TAB[tab] || "nano-banana-pro";
  const [modelLabel, setModelLabel] = useState<string>(MODEL_ID_TO_LABEL[defaultModelId] || "Nano Banana Pro");
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [variations, setVariations] = useState<number>(1);
  const [ratio, setRatio] = useState<AspectRatio>(cfg.defaultRatio || "16:9");
  const [quality, setQuality] = useState<string>("2K");
  const [toolOptions, setToolOptions] = useState<ToolOptions>({});
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState<"estilo" | "personagem" | "elemento" | "cor" | "efeitos" | "camera" | "stock">("estilo");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [preview, setPreview] = useState<{ url: string; kind: MediaKind } | null>(null);
  const promptRef = useRef<PromptInputHandle>(null);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  // Reseta ao trocar de tab
  useEffect(() => {
    setRefs([]); setPrompt(""); setToolOptions({});
    const id = cfg.defaultModelId || DEFAULT_MODEL_BY_TAB[tab];
    if (id) setModelLabel(MODEL_ID_TO_LABEL[id] || modelLabel);
    if (cfg.defaultRatio) setRatio(cfg.defaultRatio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const modelId = MODEL_LABEL_TO_ID[modelLabel] || defaultModelId;

  const mentionItems = useMemo<MentionItem[]>(
    () => refs.map((r, i) => ({ id: `ref-${i}`, type: "image", name: `img${i + 1}`, avatarSrc: r.url })),
    [refs]
  );

  const tabJobs = useMemo(
    () => jobs.filter((j) => j.tool === tab && j.status === "processing"),
    [jobs, tab]
  );

  const tabHistory = useMemo(() => {
    return history.filter((g: any) => {
      if (cfg.output === "video") return (g.video_urls?.length || 0) > 0;
      if (cfg.output === "audio") return g.media_type === "audio" || (g.audio_urls?.length || 0) > 0;
      return (g.image_urls?.length || 0) > 0 && g.media_type !== "video";
    });
  }, [history, cfg.output]);

  const handleGenerate = useCallback(async () => {
    if (cfg.promptRequired && !prompt.trim()) { showToast("Digite um prompt"); return; }
    if (cfg.requiresRef && refs.length === 0) { showToast("Anexe uma imagem fonte"); return; }

    const n = Math.max(1, variations);
    const promises = Array.from({ length: n }).map(() =>
      enqueue({
        tab, prompt: prompt.trim(), aspect: ratio,
        sourceUrl: refs[0]?.url || null,
        model: modelId,
        thumb: refs[0]?.url || undefined,
        quality, numVariations: 1,
        editOp: toolOptions.editOp,
        upscaleEngine: toolOptions.upscaleEngine,
        audioKind: toolOptions.audioKind,
        extras: toolOptions.extras,
      })
    );
    const results = await Promise.all(promises);
    const fail = results.find((r) => !r.ok);
    if (fail) showToast("Erro: " + (fail.error || "falha"));
    else showToast(n > 1 ? `${n} ${cfg.ctaPlural.toLowerCase()} em paralelo` : "Geração iniciada");
  }, [cfg, prompt, refs, variations, ratio, modelId, quality, toolOptions, enqueue, showToast, tab]);

  const ctaLabel = variations > 1 ? `${cfg.ctaPlural} (${variations})` : cfg.ctaSingular;

  return (
    <div className="img-ws">
      {/* ===== LEFT CONTROLS (mesmo shell do ImageWorkspace) ===== */}
      <aside className="img-ws-controls">
        <div className="img-ws-controls-scroll">
          <div className="img-ws-head">
            <span className="img-ws-eyebrow">{cfg.eyebrow}</span>
            <h1>{cfg.title}</h1>
            <p>{cfg.subtitle}</p>
          </div>

          {cfg.showRefs && (
            <ReferencesPanel
              refs={refs}
              onChange={setRefs}
              onUploadFile={onUploadRef}
              modelId={modelId}
              modelLabel={modelLabel}
              showToast={showToast}
              onOpenLibrary={() => { setLibraryCategory("estilo"); setLibraryQuery(""); setLibraryOpen(true); }}
            />
          )}

          {cfg.showModel && (
            <div className="img-ws-panel">
              <div className="img-ws-panel-head"><div className="img-ws-panel-title">Modelo</div></div>
              <SimpleModelPicker value={modelLabel} onChange={setModelLabel} />
            </div>
          )}

          <div className="img-ws-panel">
            <div className="img-ws-panel-head"><div className="img-ws-panel-title">Prompt</div></div>
            <PromptInput
              ref={promptRef}
              value={prompt}
              placeholder={cfg.placeholder}
              items={mentionItems}
              onChangeText={setPrompt}
              onSubmit={handleGenerate}
              onMentionSelected={() => {}}
              onSeeAll={(_, q) => { setLibraryCategory("estilo"); setLibraryQuery(q); setLibraryOpen(true); }}
              onCreateNew={() => setLibraryOpen(true)}
            />
          </div>

          {tabHasOptions(tab) && (
            <div className="img-ws-panel">
              <div className="img-ws-panel-head"><div className="img-ws-panel-title">Opções</div></div>
              <ToolOptionsBar
                tab={tab}
                value={toolOptions}
                onChange={(patch) => setToolOptions((prev) => ({ ...prev, ...patch }))}
                onSuggestPrompt={(text) => setPrompt((cur) => (cur.trim() ? cur : text))}
                sourceImageUrl={refs[0]?.url || null}
                onUploadFile={onUploadRef}
                showToast={showToast}
              />
            </div>
          )}

          {cfg.showOutput && (
            <div className="img-ws-panel">
              <div className="img-ws-panel-head"><div className="img-ws-panel-title">Saída</div></div>
              <OutputControls
                variations={variations}
                onVariations={setVariations}
                ratio={ratio}
                onRatio={setRatio}
                quality={quality}
                onQuality={setQuality}
              />
            </div>
          )}
        </div>

        <div className="img-ws-generate-wrap">
          <button className="img-ws-generate" onClick={handleGenerate}>
            <span className="img-ws-generate-label">{ctaLabel}</span>
          </button>
        </div>
      </aside>

      {/* ===== RIGHT GALLERY ===== */}
      <section className="img-ws-gallery">
        <header className="img-ws-gallery-head">
          <div className="img-ws-gh-row">
            <div className="img-ws-gallery-title">
              <span className="eyebrow">GALERIA · {cfg.title.toUpperCase()}</span>
              <h2>Suas criações</h2>
              <p>{tabHistory.length} {tabHistory.length === 1 ? "item" : "itens"}</p>
            </div>
            <div className="img-ws-gallery-actions">
              <button className="img-ws-chip-btn icon" onClick={refreshHistory} title="Recarregar">
                <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
              </button>
            </div>
          </div>
        </header>

        <div className="img-ws-feed">
          {tabJobs.length > 0 && (
            <div className="img-ws-progress">
              <span className="img-ws-progress-spinner" />
              <span className="img-ws-progress-text">
                Processando {tabJobs.length} {tabJobs.length > 1 ? "itens" : "item"}…
              </span>
            </div>
          )}

          {tabHistory.length === 0 && tabJobs.length === 0 && (
            <div className="img-ws-empty">
              <Icon d="M4 4h16v16H4z M4 16l4-4 4 4 4-4 4 4" strokeWidth={1.4} />
              <h3>Nada por aqui ainda</h3>
              <p>Configure no painel à esquerda e clique em <b>{cfg.ctaSingular}</b>.</p>
            </div>
          )}

          {tabHistory.length > 0 && (
            <div className="tw-grid">
              {tabHistory.slice(0, 60).map((g) => (
                <ResultCard
                  key={g.id}
                  gen={g}
                  output={cfg.output}
                  onDelete={async () => { if (confirm("Excluir?")) await onDeleteGeneration(g.id); }}
                  onToggleFav={async () => {
                    const fav = !!(g as any).metadata?.favorite;
                    await onToggleFavorite(g.id, !fav);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <LibraryPage
        open={libraryOpen}
        defaultCategory={libraryCategory}
        initialQuery={libraryQuery}
        items={mentionItems}
        onClose={() => setLibraryOpen(false)}
        onUploadFile={onUploadRef}
        showToast={showToast}
        onPick={(item) => {
          if (!item.avatarSrc) return;
          const lim = getRefLimit(modelId);
          if (refs.length >= lim) { showToast(`Limite de ${lim} referências`); return; }
          setRefs((p) => [...p, { url: item.avatarSrc!, source: "library", name: item.name }]);
        }}
      />
    </div>
  );
}

/* ─────────────── ModelPicker leve (lista IMAGE_MODELS) ─────────────── */

function SimpleModelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="vmp-wrap">
      <button className="vmp-trigger" type="button" onClick={() => setOpen(!open)}>
        <span className="vmp-trigger-name">{value}</span>
        <Icon d="M6 9l6 6 6-6" />
      </button>
      {open && (
        <>
          <div className="vmp-backdrop" onClick={() => setOpen(false)} />
          <div className="vmp-popover">
            <div className="vmp-list">
              {IMAGE_MODELS.map((m) => (
                <button
                  key={m.id}
                  className={"vmp-item" + (m.label === value ? " active" : "")}
                  onClick={() => { onChange(m.label); setOpen(false); }}
                >
                  <span className="vmp-name">{m.label}</span>
                  <span className="vmp-meta">
                    {m.costHint && <span className={"vmp-pill " + m.costHint.toLowerCase()}>{m.costHint}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────── ResultCard (image / video / audio) ─────────────── */

function ResultCard({
  gen, output, onDelete, onToggleFav,
}: {
  gen: Generation;
  output: MediaKind;
  onDelete: () => void;
  onToggleFav: () => void;
}) {
  const fav = !!(gen as any).metadata?.favorite;
  const url =
    output === "video" ? (gen.video_urls?.[0] || "") :
    output === "audio" ? ((gen as any).audio_urls?.[0] || "") :
    (gen.image_urls?.[0] || "");
  if (!url) return null;

  return (
    <div className="tw-card">
      <div className="tw-card-media">
        {output === "image" && <img src={url} alt="" />}
        {output === "video" && <video src={url} muted loop playsInline preload="metadata" onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />}
        {output === "audio" && <audio src={url} controls style={{ width: "100%" }} />}
      </div>
      <div className="tw-card-actions">
        <button className={"vc-act" + (fav ? " active" : "")} onClick={onToggleFav} title="Favoritar">
          <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" />
        </button>
        <a className="vc-act" href={url} download target="_blank" rel="noreferrer" title="Download">
          <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
        </a>
        <button className="vc-act danger" onClick={onDelete} title="Excluir">
          <Icon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </button>
      </div>
    </div>
  );
}
