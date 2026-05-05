/**
 * VideoWorkspace — aba /video.
 * Mesma estrutura da Image (3 colunas), com:
 *   • Seletor de Modo (text/image/frames/video)
 *   • Card Câmera (movimento + intensidade)
 *   • Card Áudio (sem som / ambiente / voz)
 *   • Saída com Duração + FPS
 *   • Galeria com hover-loop + badges
 *   • Player premium modal
 * Reutiliza ReferencesPanel, PromptInput e LibraryPage do Image.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { ReferencesPanel, getRefLimit, type RefItem } from "./ReferencesPanel";
import { PromptInput, type PromptInputHandle, type MentionItem, type MentionType } from "./PromptInput";
import { LibraryPage } from "./LibraryPage";
import { useJobs } from "../lib/jobs";
import { type Generation } from "../hooks/useGenerations";
import {
  VIDEO_MODELS,
  MODEL_LABEL_TO_ID,
  MODEL_ID_TO_LABEL,
  getVideoModelModes,
  type AspectRatio,
  type VideoModel,
} from "../lib/models";

type Props = {
  history: Generation[];
  onUploadRef: (file: File) => Promise<string | null>;
  showToast: (m: string) => void;
  refreshHistory: () => void;
  onDeleteGeneration: (id: string) => Promise<void>;
  onToggleFavorite: (id: string, value: boolean) => Promise<void>;
};

type Mode = "text" | "image" | "frames" | "video";
type AudioMode = "none" | "ambient" | "voice";
type Camera =
  | "static" | "zoom-in" | "zoom-out" | "pan-l" | "pan-r" | "dolly" | "orbit" | "custom";

const MODES: { id: Mode; label: string; desc: string; icon: string }[] = [
  { id: "text",   label: "Texto",  desc: "Descreva uma cena e o modelo gera o vídeo do zero.",         icon: "M4 6h16M4 12h10M4 18h16" },
  { id: "image",  label: "Imagem", desc: "Adicione uma imagem e descreva como ela deve se animar.",     icon: "M4 4h16v16H4z M4 16l4-4 4 4 4-4 4 4 M14 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  { id: "frames", label: "Frames", desc: "Frame inicial + final, o modelo interpola o movimento.",      icon: "M3 5h7v14H3z M14 5h7v14h-7z M11 12h2" },
  { id: "video",  label: "Vídeo",  desc: "Carregue um vídeo e transforme com novo prompt/estilo.",      icon: "M4 5h12v14H4z M16 9l5-3v12l-5-3z" },
];

const CAMERAS: { id: Camera; label: string; icon: string }[] = [
  { id: "static",   label: "Estático", icon: "M4 4h16v16H4z" },
  { id: "zoom-in",  label: "Zoom In",  icon: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3 M8 11h6 M11 8v6" },
  { id: "zoom-out", label: "Zoom Out", icon: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3 M8 11h6" },
  { id: "pan-l",    label: "Pan Esq",  icon: "M15 6l-6 6 6 6" },
  { id: "pan-r",    label: "Pan Dir",  icon: "M9 6l6 6-6 6" },
  { id: "dolly",    label: "Dolly",    icon: "M3 12h12 M9 8l-6 4 6 4 M16 4v16" },
  { id: "orbit",    label: "Orbit",    icon: "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" },
  { id: "custom",   label: "Custom",   icon: "M12 5v14M5 12h14" },
];

const DURATIONS = ["3s", "5s", "10s", "15s"] as const;
const FPS_OPTS = [
  { v: 24, lbl: "cinema" }, { v: 30, lbl: "padrão" }, { v: 60, lbl: "smooth" },
] as const;
const QUALITIES = [
  { id: "720p", mult: 1 }, { id: "1080p", mult: 2 }, { id: "4K", mult: 4 },
] as const;
const VARIATIONS = [1, 2, 3, 4] as const;
const RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1", "4:5", "21:9"];

const PLACEHOLDERS = [
  "Ex: drone em voo baixo sobre dunas ao pôr do sol, luz quente, lente cinematográfica…",
  "Ex: retrato editorial onde o cabelo se move com vento suave, fundo desfocado…",
  "Ex: macro de café sendo derramado em câmera lenta, vapor subindo…",
];

export function VideoWorkspace({
  history, onUploadRef, showToast, refreshHistory,
  onDeleteGeneration, onToggleFavorite,
}: Props) {
  const { jobs, enqueue } = useJobs();

  const [mode, setMode] = useState<Mode>("text");
  const [modelLabel, setModelLabel] = useState("Kling V2.5 Pro");
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [framesStart, setFramesStart] = useState<string | null>(null);
  const [framesEnd, setFramesEnd] = useState<string | null>(null);
  const [videoSourceUrl, setVideoSourceUrl] = useState<string | null>(null);
  const [lipSyncAudioUrl, setLipSyncAudioUrl] = useState<string | null>(null);
  const lipSyncAudioInputRef = useRef<HTMLInputElement>(null);

  const [camera, setCamera] = useState<Camera>("static");
  const [intensity, setIntensity] = useState(50);

  const [audioMode, setAudioMode] = useState<AudioMode>("none");
  const [audioPrompt, setAudioPrompt] = useState("");

  const [variations, setVariations] = useState<number>(1);
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState<string>("5s");
  const [fps, setFps] = useState<number>(24);
  const [quality, setQuality] = useState<string>("1080p");
  const [loop, setLoop] = useState(false);
  const [smoothTransitions, setSmoothTransitions] = useState(true);

  const [phIdx, setPhIdx] = useState(0);
  const promptRef = useRef<PromptInputHandle>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState<"estilo" | "personagem" | "elemento" | "cor" | "efeitos" | "camera" | "stock">("estilo");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  // player modal
  const [player, setPlayer] = useState<{ url: string; gen: Generation } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const modelId = MODEL_LABEL_TO_ID[modelLabel] || "kling-v2-5-pro";
  const currentModel = VIDEO_MODELS.find((m) => m.id === modelId) || VIDEO_MODELS[0];
  const supportedModes = useMemo(() => getVideoModelModes(currentModel), [currentModel]);

  // Se o modo atual não é suportado pelo modelo, troca para o primeiro suportado.
  useEffect(() => {
    if (!supportedModes.includes(mode)) {
      setMode(supportedModes[0]);
    }
  }, [supportedModes, mode]);

  // mention items (refs)
  const mentionItems = useMemo<MentionItem[]>(() =>
    refs.map((r, i) => ({ id: `ref-${i}`, type: "image" as MentionType, name: `img${i + 1}`, avatarSrc: r.url })),
    [refs]
  );

  const baseCost = 60; // crédito base por segundo
  const durSec = parseInt(duration);
  const qMult = QUALITIES.find((q) => q.id === quality)?.mult || 1;
  const totalCost = variations * durSec * baseCost * qMult / 10;

  // Variantes do modelo atual por resolução (ex: Seedance 1.5 Pro 720p / 1080p / 480p).
  // Agrupa pelo "base label" (label sem o sufixo de resolução).
  const RES_RE = /\s*(480p|720p|1080p|2160p|4K)\s*$/i;
  const baseLabel = currentModel.label.replace(RES_RE, "").trim();
  const resolutionVariants = useMemo(() => {
    const list = VIDEO_MODELS
      .filter((m) => m.label.replace(RES_RE, "").trim() === baseLabel && RES_RE.test(m.label))
      .map((m) => ({
        id: (m.label.match(RES_RE)?.[1] || m.resolution || "").toLowerCase(),
        label: m.label.match(RES_RE)?.[1] || m.resolution || "",
        modelLabel: m.label,
      }));
    // ordena 480 < 720 < 1080 < 4K
    const order = (s: string) => {
      const n = parseInt(s);
      if (!Number.isNaN(n)) return n;
      if (/4k/i.test(s)) return 2160;
      return 9999;
    };
    return list.sort((a, b) => order(a.id) - order(b.id));
  }, [baseLabel]);
  const hasResolutionVariants = resolutionVariants.length > 1;
  const currentVariantId = (currentModel.label.match(RES_RE)?.[1] || currentModel.resolution || "").toLowerCase();

  const handleGenerate = useCallback(async () => {
    const isLipSync = modelId === "latent-sync";
    const isVideoUpscaler = modelId === "video-upscaler" || modelId === "video-upscaler-turbo";
    const needsVideoSrc = isLipSync || isVideoUpscaler || currentModel.requiresVideoSource;

    if (!prompt.trim() && mode !== "video" && !needsVideoSrc) {
      showToast("Digite um prompt"); return;
    }
    let source: string | null = null;
    if (needsVideoSrc) source = videoSourceUrl;
    else if (mode === "image") source = refs[0]?.url || null;
    else if (mode === "frames") source = framesStart;
    else if (mode === "video") source = videoSourceUrl;

    if (mode === "image" && !needsVideoSrc && !source) { showToast("Anexe uma imagem fonte"); return; }
    if (mode === "frames" && (!framesStart || !framesEnd)) { showToast("Anexe os 2 frames"); return; }
    if (needsVideoSrc && !source) { showToast("Anexe o vídeo fonte"); return; }
    const isOmniHuman = modelId === "omnihuman-1-5";
    if (isLipSync && !lipSyncAudioUrl) { showToast("Anexe o áudio para lip-sync"); return; }
    if (isOmniHuman && !lipSyncAudioUrl) { showToast("Anexe o áudio (OmniHuman é audio-driven)"); return; }

    const camNote = camera !== "static"
      ? `, camera: ${camera.replace("-", " ")}, motion intensity ${intensity}%`
      : "";
    const audioNote = audioMode === "ambient" && audioPrompt
      ? `, ambient sound: ${audioPrompt}`
      : audioMode === "voice" && audioPrompt
      ? `, voiceover: ${audioPrompt}`
      : "";
    const finalPrompt = (prompt.trim() + camNote + audioNote).trim();

    const n = Math.max(1, variations);
    const extras: Record<string, unknown> = {};
    if ((isLipSync || isOmniHuman) && lipSyncAudioUrl) extras.audio_url = lipSyncAudioUrl;

    const promises = Array.from({ length: n }).map(() =>
      enqueue({
        tab: "video",
        prompt: finalPrompt,
        aspect: ratio,
        sourceUrl: source,
        model: modelId,
        thumb: source || undefined,
        quality,
        numVariations: 1,
        extras: Object.keys(extras).length ? extras : undefined,
      })
    );
    const results = await Promise.all(promises);
    const fail = results.find((r) => !r.ok);
    if (fail) showToast("Erro: " + (fail.error || "falha"));
    else showToast(n > 1 ? `${n} vídeos em paralelo` : "Geração iniciada");
  }, [prompt, mode, refs, framesStart, framesEnd, videoSourceUrl, lipSyncAudioUrl, camera, intensity,
      audioMode, audioPrompt, variations, ratio, modelId, currentModel, quality, enqueue, showToast]);

  // Frames upload helpers
  const pickFrame = (which: "start" | "end") => async (file: File) => {
    const url = await onUploadRef(file);
    if (!url) return;
    if (which === "start") setFramesStart(url); else setFramesEnd(url);
  };

  const pickVideo = async (file: File) => {
    const url = await onUploadRef(file);
    if (url) setVideoSourceUrl(url);
  };

  // Active jobs
  const activeJobs = useMemo(
    () => jobs.filter((j) => j.mediaType === "video" && j.status === "processing"),
    [jobs]
  );

  // Video history
  const videoHistory = useMemo(
    () => history.filter((g) => (g.video_urls?.length || 0) > 0 || g.media_type === "video"),
    [history]
  );

  const summary = `${variations} vídeo${variations > 1 ? "s" : ""} · ${ratio} · ${quality} · ${duration} · ${fps}fps`;

  return (
    <div className="vid-ws">
      {/* ========== LEFT CONTROLS ========== */}
      <aside className="vid-ws-controls">
        <div className="vid-ws-controls-scroll">
          <div className="vid-ws-head">
            <span className="vid-ws-eyebrow">WORKSPACE · VIDEO</span>
            <h1>Criar vídeo</h1>
            <p>Prompt, refs, movimento e áudio</p>
          </div>

          {/* SELETOR DE MODO */}
          <div className="vid-panel vid-panel--tight">
            <div className="vid-panel-head">
              <div className="vid-panel-title"><span className="vid-dot" /> Modo</div>
            </div>
            <div className="mode-segmented">
              {MODES.map((m) => {
                const ok = supportedModes.includes(m.id);
                return (
                  <button
                    key={m.id}
                    className={"mode-tab" + (mode === m.id ? " active" : "") + (ok ? "" : " disabled")}
                    onClick={() => ok && setMode(m.id)}
                    type="button"
                    disabled={!ok}
                    aria-disabled={!ok}
                    title={ok ? m.label : `${currentModel.label} não suporta ${m.label}`}
                    style={!ok ? { opacity: 0.35, cursor: "not-allowed", pointerEvents: "none" } : undefined}
                  >
                    <Icon d={m.icon} strokeWidth={1.6} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mode-description">{MODES.find((m) => m.id === mode)!.desc}</p>
          </div>

          {/* MODELO */}
          <div className="vid-panel vid-panel--tight">
            <div className="vid-panel-head">
              <div className="vid-panel-title"><span className="vid-dot" /> Modelo</div>
            </div>
            <VideoModelPicker value={modelLabel} onChange={setModelLabel} open={modelPickerOpen} setOpen={setModelPickerOpen} />
          </div>

          {/* REFERÊNCIAS — depende do modo */}
          {mode === "image" && (
            <ReferencesPanel
              refs={refs}
              onChange={setRefs}
              onUploadFile={onUploadRef}
              modelId={"nano-banana-pro"}
              modelLabel={modelLabel}
              showToast={showToast}
              onOpenLibrary={() => { setLibraryCategory("estilo"); setLibraryQuery(""); setLibraryOpen(true); }}
            />
          )}

          {mode === "frames" && (
            <div className="vid-panel">
              <div className="vid-panel-head">
                <div className="vid-panel-title"><span className="vid-dot" /> Frames</div>
              </div>
              <div className="frames-grid">
                <button
                  type="button"
                  className={"frame-slot" + (framesStart ? " filled" : "")}
                  onClick={() => startInputRef.current?.click()}
                >
                  <span className="frame-label">INÍCIO</span>
                  {framesStart
                    ? <img src={framesStart} alt="início" />
                    : <Icon d="M12 5v14M5 12h14" />}
                </button>
                <span className="frame-arrow"><Icon d="M5 12h14M12 5l7 7-7 7" strokeWidth={1.5} /></span>
                <button
                  type="button"
                  className={"frame-slot" + (framesEnd ? " filled" : "")}
                  onClick={() => endInputRef.current?.click()}
                >
                  <span className="frame-label">FIM</span>
                  {framesEnd
                    ? <img src={framesEnd} alt="fim" />
                    : <Icon d="M12 5v14M5 12h14" />}
                </button>
              </div>
              <input ref={startInputRef} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFrame("start")(f); e.currentTarget.value = ""; }} />
              <input ref={endInputRef} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFrame("end")(f); e.currentTarget.value = ""; }} />
            </div>
          )}

          {mode === "video" && (
            <div className="vid-panel">
              <div className="vid-panel-head">
                <div className="vid-panel-title"><span className="vid-dot" /> Vídeo fonte</div>
              </div>
              <button
                type="button"
                className={"video-source-slot" + (videoSourceUrl ? " filled" : "")}
                onClick={() => videoInputRef.current?.click()}
              >
                {videoSourceUrl ? (
                  <>
                    <video src={videoSourceUrl} muted playsInline />
                    <span className="play-overlay"><Icon d="M8 5l11 7-11 7z" strokeWidth={0} /></span>
                  </>
                ) : (
                  <div className="vss-empty">
                    <Icon d="M4 5h12v14H4z M16 9l5-3v12l-5-3z" />
                    <span>Clique para enviar vídeo</span>
                  </div>
                )}
              </button>
              <input ref={videoInputRef} type="file" accept="video/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickVideo(f); e.currentTarget.value = ""; }} />
            </div>
          )}

          {(modelId === "latent-sync" || modelId === "omnihuman-1-5") && (
            <div className="vid-panel">
              <div className="vid-panel-head">
                <div className="vid-panel-title"><span className="vid-dot" /> Áudio ({modelId === "omnihuman-1-5" ? "OmniHuman" : "lip-sync"})</div>
              </div>
              <button
                type="button"
                className={"video-source-slot" + (lipSyncAudioUrl ? " filled" : "")}
                onClick={() => lipSyncAudioInputRef.current?.click()}
                style={{ minHeight: 80 }}
              >
                {lipSyncAudioUrl ? (
                  <audio src={lipSyncAudioUrl} controls style={{ width: "100%" }} onClick={(e) => e.stopPropagation()} />
                ) : (
                  <div className="vss-empty">
                    <Icon d="M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    <span>Clique para enviar áudio</span>
                  </div>
                )}
              </button>
              <input ref={lipSyncAudioInputRef} type="file" accept="audio/*" hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const url = await onUploadRef(f);
                  if (url) setLipSyncAudioUrl(url);
                  e.currentTarget.value = "";
                }} />
            </div>
          )}
          <div className="vid-panel">
            <div className="vid-panel-head">
              <div className="vid-panel-title">Prompt</div>
            </div>
            <PromptInput
              ref={promptRef}
              value={prompt}
              placeholder={PLACEHOLDERS[phIdx]}
              items={mentionItems}
              onChangeText={setPrompt}
              onSubmit={handleGenerate}
              onMentionSelected={() => {}}
              onSeeAll={(cat, q) => {
                const map: Record<string, typeof libraryCategory> = {
                  image: "stock", character: "personagem", style: "estilo",
                  product: "elemento", scene: "camera", logo: "elemento",
                };
                setLibraryCategory(map[cat] || "estilo");
                setLibraryQuery(q);
                setLibraryOpen(true);
              }}
              onCreateNew={() => setLibraryOpen(true)}
            />
            <div className="vid-prompt-toolbar">
              <button className="vid-pill" onClick={() => { setLibraryCategory("estilo"); setLibraryOpen(true); }}>
                <Icon d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 22 12 17.5 5.8 22l2.4-8.1L2 9.4h7.6z" />
                <span>Estilo</span>
              </button>
              <button className="vid-pill" onClick={() => { setLibraryCategory("personagem"); setLibraryOpen(true); }}>
                <Icon d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 20a8 8 0 0 1 16 0" />
                <span>Personagem</span>
              </button>
              <button className="vid-pill" onClick={() => { setLibraryCategory("camera"); setLibraryOpen(true); }}>
                <Icon d="M4 7h4l2-2h4l2 2h4v12H4z M12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                <span>Câmera</span>
              </button>
            </div>
          </div>

          {/* CÂMERA */}
          <div className="vid-panel">
            <div className="vid-panel-head">
              <div className="vid-panel-title"><span className="vid-dot" /> Câmera</div>
            </div>
            <div className="camera-grid">
              {CAMERAS.map((c) => (
                <button
                  key={c.id}
                  className={"camera-btn" + (camera === c.id ? " active" : "")}
                  onClick={() => setCamera(c.id)}
                  type="button"
                >
                  <span className="camera-icon-wrap"><Icon d={c.icon} strokeWidth={1.6} /></span>
                  <span className="camera-name">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="motion-intensity">
              <div className="intensity-header">
                <span className="intensity-label">Intensidade</span>
                <span className="intensity-value">{intensity}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={intensity}
                disabled={camera === "static"}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="motion-slider"
                style={{ ["--value" as any]: `${intensity}%` }}
              />
            </div>
          </div>

          {/* ÁUDIO */}
          <div className="vid-panel">
            <div className="vid-panel-head">
              <div className="vid-panel-title"><span className="vid-dot" /> Áudio</div>
            </div>
            <div className="audio-modes">
              <button className={"audio-mode-btn" + (audioMode === "none" ? " active" : "")} onClick={() => setAudioMode("none")} type="button">
                <Icon d="M5 9v6h4l5 5V4L9 9z M19 8l-4 8 M15 8l4 8" /> Sem som
              </button>
              <button className={"audio-mode-btn" + (audioMode === "ambient" ? " active" : "")} onClick={() => setAudioMode("ambient")} type="button">
                <Icon d="M3 12a9 9 0 0 1 18 0 M6 12a6 6 0 0 1 12 0 M9 12a3 3 0 0 1 6 0" /> Ambiente
              </button>
              <button className={"audio-mode-btn" + (audioMode === "voice" ? " active" : "")} onClick={() => setAudioMode("voice")} type="button">
                <Icon d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3" /> Voz
              </button>
            </div>
            {audioMode !== "none" && (
              <textarea
                className="audio-input"
                placeholder={audioMode === "ambient" ? "Ex: chuva leve, vento, café movimentado…" : "Ex: roteiro narrado em PT-BR…"}
                value={audioPrompt}
                onChange={(e) => setAudioPrompt(e.target.value)}
              />
            )}
            {audioMode === "voice" && (
              <button className="voice-pick" type="button" onClick={() => showToast("Seletor de voz em breve")}>
                <span className="voice-avatar">A</span>
                <span className="voice-name">Aria · PT-BR</span>
                <Icon d="M6 9l6 6 6-6" />
              </button>
            )}
          </div>

          {/* SAÍDA */}
          <div className="vid-panel">
            <div className="vid-panel-head">
              <div className="vid-panel-title">Saída</div>
            </div>

            <div className="oc-section">
              <div className="oc-section-head">
                <span className="oc-label">Variações</span>
                <span className="oc-meta">≈ {Math.round(durSec * baseCost * qMult)} créd/vídeo</span>
              </div>
              <div className="oc-pills">
                {VARIATIONS.map((n) => (
                  <button key={n} className={"oc-pill" + (variations === n ? " active" : "")} onClick={() => setVariations(n)}>{n}</button>
                ))}
              </div>
            </div>

            <div className="oc-divider" />

            <div className="oc-section">
              <div className="oc-section-head"><span className="oc-label">Tamanho</span></div>
              <div className="vid-ratios">
                {RATIOS.map((r) => (
                  <button key={r} className={"vid-ratio" + (ratio === r ? " active" : "")} onClick={() => setRatio(r)}>{r}</button>
                ))}
              </div>
            </div>

            <div className="oc-divider" />

            <div className="oc-section">
              <div className="oc-section-head">
                <span className="oc-label">Duração</span>
                <span className="oc-meta">{baseCost} créd/s</span>
              </div>
              <div className="oc-pills">
                {DURATIONS.map((d) => (
                  <button key={d} className={"oc-pill" + (duration === d ? " active" : "")} onClick={() => setDuration(d)}>{d}</button>
                ))}
              </div>
            </div>

            <div className="oc-divider" />

            <div className="oc-section">
              <div className="oc-section-head"><span className="oc-label">FPS</span></div>
              <div className="oc-segmented">
                {FPS_OPTS.map((f) => (
                  <button key={f.v} className={"oc-seg" + (fps === f.v ? " active" : "")} onClick={() => setFps(f.v)}>
                    <span className="oc-seg-num">{f.v}</span>
                    <span className="oc-seg-mult">{f.lbl}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="oc-divider" />

            <div className="oc-section">
              <div className="oc-section-head">
                <span className="oc-label">Qualidade</span>
                {!hasResolutionVariants && <span className="oc-meta">{qMult}× créditos</span>}
                {hasResolutionVariants && <span className="oc-meta">troca a versão do modelo</span>}
              </div>
              <div className="oc-segmented">
                {hasResolutionVariants
                  ? resolutionVariants.map((v) => (
                      <button
                        key={v.id}
                        className={"oc-seg" + (currentVariantId === v.id ? " active" : "")}
                        onClick={() => setModelLabel(v.modelLabel)}
                        title={v.modelLabel}
                      >
                        <span className="oc-seg-num">{v.label}</span>
                        <span className="oc-seg-mult">{v.modelLabel.replace(RES_RE, "").trim()}</span>
                      </button>
                    ))
                  : QUALITIES.map((q) => (
                      <button key={q.id} className={"oc-seg" + (quality === q.id ? " active" : "")} onClick={() => setQuality(q.id)}>
                        <span className="oc-seg-num">{q.id}</span>
                        <span className="oc-seg-mult">{q.mult}×</span>
                      </button>
                    ))}
              </div>
            </div>

            <div className="oc-divider" />

            <div className="oc-section">
              <div className="oc-section-head"><span className="oc-label">Extras</span></div>
              <div className="extras-list">
                <label className="extra-toggle">
                  <span className="extra-icon"><Icon d="M3 12a9 9 0 1 1 9 9 M3 21v-6h6" /></span>
                  <span className="extra-label">Loop perfeito</span>
                  <span className="extra-switch">
                    <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
                    <span className="switch-track" />
                  </span>
                </label>
                <label className="extra-toggle">
                  <span className="extra-icon"><Icon d="M3 12h18 M12 3v18" /></span>
                  <span className="extra-label">Transições suaves</span>
                  <span className="extra-switch">
                    <input type="checkbox" checked={smoothTransitions} onChange={(e) => setSmoothTransitions(e.target.checked)} />
                    <span className="switch-track" />
                  </span>
                </label>
              </div>
            </div>

            <div className="oc-summary">{summary} = <b>{Math.round(totalCost)} créditos</b></div>
          </div>
        </div>

        <div className="vid-generate-wrap">
          <button className="vid-generate" onClick={handleGenerate}>
            <Icon d="M4 5h12v14H4z M16 9l5-3v12l-5-3z" />
            <span className="vid-generate-label">Gerar {variations > 1 ? `${variations} vídeos` : "vídeo"}</span>
            <span className="vid-generate-kbd">⌘↵</span>
          </button>
        </div>
      </aside>

      {/* ========== RIGHT GALLERY ========== */}
      <section className="vid-gallery">
        <header className="vid-gallery-head">
          <div className="vid-gallery-title">
            <span className="eyebrow">GALERIA · VÍDEOS</span>
            <h2>Suas criações</h2>
            <p>{videoHistory.length} {videoHistory.length === 1 ? "vídeo" : "vídeos"}</p>
          </div>
          <button className="vid-chip-btn" onClick={refreshHistory} title="Recarregar">
            <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
          </button>
        </header>

        {activeJobs.length > 0 && (
          <div className="vid-progress">
            <span className="vid-progress-spinner" />
            <span>Gerando {activeJobs.length} {activeJobs.length > 1 ? "vídeos" : "vídeo"}…</span>
          </div>
        )}

        {videoHistory.length === 0 && activeJobs.length === 0 && (
          <div className="vid-empty">
            <Icon d="M4 5h12v14H4z M16 9l5-3v12l-5-3z" strokeWidth={1.4} />
            <h3>Seus vídeos aparecem aqui</h3>
            <p>Comece descrevendo no painel à esquerda.</p>
          </div>
        )}

        <div className="vid-grid">
          {videoHistory.map((g) => {
            const url = (g.video_urls || [])[0];
            if (!url) return null;
            const fav = !!(g as any).metadata?.favorite;
            const md = (g as any).metadata || {};
            const dur = md.duration ? `${md.duration}s` : (md.dur || "");
            const arVal = (g as any).aspect_ratio || "16:9";
            return (
              <VideoCard
                key={g.id}
                url={url}
                gen={g}
                aspect={arVal}
                fav={fav}
                modelLabel={MODEL_ID_TO_LABEL[g.model || ""] || g.model || ""}
                duration={dur}
                onOpen={() => setPlayer({ url, gen: g })}
                onToggleFav={() => onToggleFavorite(g.id, !fav)}
                onDelete={() => { if (confirm("Excluir vídeo?")) onDeleteGeneration(g.id); }}
              />
            );
          })}
        </div>
      </section>

      {/* LIBRARY */}
      <LibraryPage
        open={libraryOpen}
        defaultCategory={libraryCategory}
        initialQuery={libraryQuery}
        items={mentionItems}
        onClose={() => setLibraryOpen(false)}
        onUploadFile={onUploadRef}
        showToast={showToast}
        onPick={(item) => {
          if (item.avatarSrc && mode === "image") {
            const lim = getRefLimit("nano-banana-pro");
            if (refs.length < lim) setRefs((p) => [...p, { url: item.avatarSrc!, source: "library", name: item.name }]);
          }
        }}
      />

      {/* PLAYER */}
      {player && (
        <VideoPlayerModal
          url={player.url}
          gen={player.gen}
          onClose={() => setPlayer(null)}
        />
      )}
    </div>
  );
}

/* =========================================================
 * VideoModelPicker — popover simples com modelos de vídeo
 * ========================================================= */
function VideoModelPicker({
  value, onChange, open, setOpen,
}: { value: string; onChange: (v: string) => void; open: boolean; setOpen: (b: boolean) => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return VIDEO_MODELS.filter((m) => !qq || m.label.toLowerCase().includes(qq));
  }, [q]);
  const grouped = useMemo(() => {
    const order: VideoModel["family"][] = ["kling", "veo", "hailuo", "runway", "seedance", "pixverse", "ltx", "wan", "omnihuman"];
    return order.map((fam) => ({ fam, items: filtered.filter((m) => m.family === fam) })).filter((g) => g.items.length > 0);
  }, [filtered]);
  const FAM_NAMES: Record<string, string> = {
    kling: "Kling", veo: "Veo (Google)", hailuo: "Hailuo (MiniMax)",
    runway: "Runway", seedance: "Seedance", pixverse: "Pixverse",
    ltx: "LTX", wan: "Wan", omnihuman: "Omnihuman",
  };
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
            <div className="vmp-search">
              <Icon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3" />
              <input autoFocus placeholder="Buscar modelo de vídeo..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="vmp-list">
              {grouped.map((g) => (
                <div key={g.fam}>
                  <div className="vmp-group-head">{FAM_NAMES[g.fam]} <span>{g.items.length}</span></div>
                  {g.items.map((m) => {
                    const active = m.label === value;
                    return (
                      <button
                        key={m.id}
                        className={"vmp-item" + (active ? " active" : "")}
                        onClick={() => { onChange(m.label); setOpen(false); }}
                      >
                        <span className="vmp-name">{m.label}</span>
                        <span className="vmp-meta">
                          {m.resolution && <span className="vmp-pill">{m.resolution}</span>}
                          <span className="vmp-pill">{m.defaultDuration}</span>
                          {m.textToVideo && <span className="vmp-pill t2v">T2V</span>}
                          {m.costHint && <span className={"vmp-pill " + m.costHint.toLowerCase()}>{m.costHint}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && <div className="vmp-empty">Nenhum modelo encontrado</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
 * VideoCard — card de galeria com hover-loop + badges
 * ========================================================= */
function VideoCard({
  url, gen, aspect, fav, modelLabel, duration, onOpen, onToggleFav, onDelete,
}: {
  url: string; gen: Generation; aspect: string; fav: boolean;
  modelLabel: string; duration: string;
  onOpen: () => void; onToggleFav: () => void; onDelete: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [aw, ah] = aspect.split(":").map(Number);
  const aspectStyle = aw && ah ? { aspectRatio: `${aw} / ${ah}` } : undefined;

  const onEnter = () => {
    const v = ref.current; if (!v) return;
    if (!loaded) { v.src = url; setLoaded(true); }
    v.play().catch(() => {});
  };
  const onLeave = () => {
    const v = ref.current; if (!v) return;
    v.pause(); try { v.currentTime = 0; } catch {}
  };

  return (
    <button className="video-card" onClick={onOpen} onMouseEnter={onEnter} onMouseLeave={onLeave} style={aspectStyle as any}>
      <video ref={ref} className="video-loop" muted loop playsInline preload="none" />
      <div className="video-play-overlay">
        <span className="play-circle"><Icon d="M8 5l11 7-11 7z" strokeWidth={0} /></span>
      </div>
      {duration && <span className="video-duration">{duration}</span>}
      {modelLabel && <span className="video-model-badge">{modelLabel}</span>}
      <div className="video-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className={"vc-act" + (fav ? " active" : "")} onClick={onToggleFav} title="Favoritar">
          <Icon d="M12 2 14 9h7l-6 4 2 7-7-4-7 4 2-7-6-4h7z" />
        </button>
        <button className="vc-act" onClick={async () => {
          try {
            const r = await fetch(url); const b = await r.blob();
            const u = URL.createObjectURL(b);
            const a = document.createElement("a");
            a.href = u; a.download = `refine-${Date.now()}.mp4`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(u);
          } catch {}
        }} title="Download"><Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></button>
        <button className="vc-act danger" onClick={onDelete} title="Excluir">
          <Icon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </button>
      </div>
    </button>
  );
}

/* =========================================================
 * VideoPlayerModal — player premium estilo Vimeo
 * ========================================================= */
function VideoPlayerModal({ url, gen, onClose }: { url: string; gen: Generation; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buffered, setBuffered] = useState(0);

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play(); else v.pause();
  }, []);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setTime(v.currentTime);
      try { setBuffered(v.buffered.length ? (v.buffered.end(v.buffered.length - 1) / v.duration) * 100 : 0); } catch {}
    };
    const onMeta = () => setDuration(v.duration || 0);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current; if (!v) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowRight") v.currentTime = Math.min(duration, v.currentTime + 5);
      else if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - 5);
      else if (e.key === "j" || e.key === "J") v.currentTime = Math.max(0, v.currentTime - 10);
      else if (e.key === "l" || e.key === "L") v.currentTime = Math.min(duration, v.currentTime + 10);
      else if (e.key === "m" || e.key === "M") { v.muted = !v.muted; setMuted(v.muted); }
      else if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) v.requestFullscreen?.(); else document.exitFullscreen?.();
      }
      else if (e.key === "ArrowUp") { v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); }
      else if (e.key === "ArrowDown") { v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); }
      else if (/^[0-9]$/.test(e.key)) v.currentTime = (Number(e.key) / 10) * duration;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, duration, onClose]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current; if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  };

  const meta = (gen as any).metadata || {};
  const modelLbl = MODEL_ID_TO_LABEL[gen.model || ""] || gen.model || "—";

  return (
    <div className="vpm-backdrop" onClick={onClose}>
      <button className="vpm-close" onClick={onClose} title="Fechar (Esc)">
        <Icon d="M6 6l12 12M6 18L18 6" strokeWidth={2} />
      </button>
      <div className={"video-player" + (playing ? "" : " paused")} onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          className="player-video"
          src={url}
          autoPlay
          onClick={togglePlay}
        />

        <button className="player-play-center" onClick={togglePlay}>
          <Icon d="M8 5l11 7-11 7z" strokeWidth={0} />
        </button>

        <div className="player-controls">
          <div className="controls-top">
            <div className="player-title">{gen.prompt?.slice(0, 80) || "Vídeo"}{(gen.prompt?.length || 0) > 80 ? "…" : ""}</div>
            <div className="player-meta-pills">
              <span className="pill">{modelLbl}</span>
              {meta.resolution && <span className="pill">{meta.resolution}</span>}
              {duration > 0 && <span className="pill">{Math.round(duration)}s</span>}
            </div>
          </div>

          <div className="controls-bottom">
            <div className="player-timeline" onClick={seek}>
              <div className="timeline-track">
                <div className="timeline-buffered" style={{ width: `${buffered}%` }} />
                <div className="timeline-progress" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
              </div>
              <div className="timeline-thumb" style={{ left: `${duration ? (time / duration) * 100 : 0}%` }} />
            </div>

            <div className="controls-row">
              <div className="controls-left">
                <button className="ctrl-btn play-pause" onClick={togglePlay}>
                  {playing
                    ? <Icon d="M6 4h4v16H6z M14 4h4v16h-4z" strokeWidth={0} />
                    : <Icon d="M8 5l11 7-11 7z" strokeWidth={0} />}
                </button>
                <button className="ctrl-btn" onClick={() => { const v = videoRef.current!; v.currentTime = Math.max(0, v.currentTime - 10); }}>
                  <Icon d="M11 19V5l-9 7zM22 19V5l-9 7z" strokeWidth={0} />
                </button>
                <button className="ctrl-btn" onClick={() => { const v = videoRef.current!; v.currentTime = Math.min(duration, v.currentTime + 10); }}>
                  <Icon d="M13 5v14l9-7zM2 5v14l9-7z" strokeWidth={0} />
                </button>
                <div className="time-display">
                  <span className="current">{fmt(time)}</span>
                  <span className="separator">/</span>
                  <span>{fmt(duration)}</span>
                </div>
                <div className="volume-control">
                  <button className="ctrl-btn" onClick={() => { const v = videoRef.current!; v.muted = !v.muted; setMuted(v.muted); }}>
                    {muted || volume === 0
                      ? <Icon d="M5 9v6h4l5 5V4L9 9z M19 8l-4 8 M15 8l4 8" />
                      : <Icon d="M5 9v6h4l5 5V4L9 9z M16 8a5 5 0 0 1 0 8" />}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    className="volume-slider"
                    onChange={(e) => { const v = videoRef.current!; const n = Number(e.target.value); v.volume = n; v.muted = n === 0; setVolume(n); setMuted(n === 0); }}
                  />
                </div>
              </div>
              <div className="controls-right">
                <button className="ctrl-btn speed-btn" onClick={() => {
                  const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : speed === 2 ? 0.5 : 1;
                  setSpeed(next); if (videoRef.current) videoRef.current.playbackRate = next;
                }}>{speed}x</button>
                <button className="ctrl-btn" onClick={() => (videoRef.current as any)?.requestPictureInPicture?.()} title="PiP">
                  <Icon d="M3 5h18v14H3z M13 13h7v5h-7z" />
                </button>
                <button className="ctrl-btn" onClick={() => {
                  if (!document.fullscreenElement) videoRef.current?.requestFullscreen?.();
                  else document.exitFullscreen?.();
                }} title="Fullscreen (F)">
                  <Icon d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
