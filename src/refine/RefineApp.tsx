/**
 * RefineApp — root React do Refine SaaS.
 * Reimplementacao em React do mockup HTML monolitico (mockup-html-v1).
 * Design 100% identico ao mockup; CSS importado de styles/mockup.css.
 *
 * Layout:
 *   bg-aurora + bg-grid (fundo)
 *   .app (grid 3 colunas)
 *     <Sidebar/> (esquerda)
 *     <Workspace/> (centro: Stage + Dock)
 *     <Rail/> (direita: historico)
 *   <Toast/>
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useGenerations, createGeneration, pollGeneration } from "./hooks/useGenerations";
import type { Generation } from "./hooks/useGenerations";
import { MODEL_LABEL_TO_ID, ASPECT_RATIOS, type AspectRatio } from "./lib/models";

// ─── Toast feedback ───
function useToast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<number | undefined>();
  const showToast = (text: string) => {
    setMsg(text);
    setShow(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 3000);
  };
  return { msg, show, showToast };
}

// ─── Helper: timeAgo (igual ao mockup) ───
function timeAgo(iso?: string) {
  if (!iso) return "agora";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "agora";
  if (sec < 3600) return Math.floor(sec / 60) + "min";
  if (sec < 86400) return Math.floor(sec / 3600) + "h";
  return Math.floor(sec / 86400) + "d";
}

export default function RefineApp() {
  const { session, profile, loading: authLoading, refreshProfile } = useAuth();
  const { history, refresh: refreshHistory, setHistory } = useGenerations();
  const { msg, show, showToast } = useToast();

  // State da ferramenta Image
  const [prompt, setPrompt] = useState("");
  const [modelLabel, setModelLabel] = useState("Nano-Banana Pro");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [currentImage, setCurrentImage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Popovers (model / ratio)
  const [openPopover, setOpenPopover] = useState<"model" | "ratio" | null>(null);
  const modelChipRef = useRef<HTMLButtonElement>(null);
  const ratioChipRef = useRef<HTMLButtonElement>(null);

  // Background do stage acompanha imagem atual
  const stageBg = currentImage ? `url("${currentImage}")` : "none";

  const userInitial =
    (session?.user?.email || profile?.tier || "U")[0]?.toUpperCase() ?? "U";
  const userEmail = session?.user?.email ?? "Usuário anônimo";

  // ─── Generate ───
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast("Digite um prompt primeiro");
      return;
    }
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const created = await createGeneration({
        prompt: prompt.trim(),
        modelId: MODEL_LABEL_TO_ID[modelLabel] || "nano-banana-pro",
        aspect_ratio: ratio,
        resolution: "1k",
        num_variations: 1,
      });
      showToast(`Enfileirado · ${created.credits_used} cr · ${modelLabel}`);
      const final = await pollGeneration(created.id);
      if (final.status === "failed") {
        showToast("Falha: " + (final.error_message || "desconhecida").slice(0, 80));
        return;
      }
      const url = final.image_urls?.[0];
      if (url) {
        setCurrentImage(url);
        // Adicionar ao topo do historico imediatamente
        setHistory((prev) => [{ ...final }, ...prev].slice(0, 30));
      }
      showToast("Pronto · " + modelLabel);
      refreshProfile();
    } catch (e: any) {
      console.error("[refine] generate failed:", e);
      showToast("Erro: " + (e?.message || "falha"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHistoryClick = (g: Generation) => {
    const url = g.image_urls?.[0];
    if (url) setCurrentImage(url);
    if (g.prompt) setPrompt(g.prompt);
    showToast("Geração carregada");
  };

  // Inicializa stage com 1ª imagem do histórico
  useEffect(() => {
    if (!currentImage && history[0]?.image_urls?.[0]) {
      setCurrentImage(history[0].image_urls[0]);
    }
  }, [history, currentImage]);

  // Cmd/Ctrl+Enter no prompt = gerar
  const onPromptKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Fecha popover ao click fora
  useEffect(() => {
    if (!openPopover) return;
    const close = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (
        modelChipRef.current?.contains(target) ||
        ratioChipRef.current?.contains(target)
      )
        return;
      const pop = document.getElementById("__refine_popover");
      if (pop && !pop.contains(target)) setOpenPopover(null);
    };
    setTimeout(() => document.addEventListener("click", close, true), 50);
    return () => document.removeEventListener("click", close, true);
  }, [openPopover]);

  if (authLoading) {
    return (
      <div className="app" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ color: "#9b9ba3", fontSize: 13 }}>Carregando…</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-grid" />

      <div className="app" id="app">
        {/* ─── SIDEBAR ─── */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">R</div>
            <div className="brand-name">
              refine<span>.</span>
            </div>
            <div className="brand-status">
              <span className="dot-live"></span>online
            </div>
          </div>
          <button className="cta-new" type="button">
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nova criação
            </span>
            <span className="arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </span>
          </button>
          <nav className="nav">
            <div className="nav-group">
              <div className="nav-title">FERRAMENTAS</div>
              <a className="nav-item active" href="#">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                <span>Image Studio</span>
              </a>
              <a className="nav-item disabled" href="#">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Video Studio</span>
                <span className="nav-tag">Em breve</span>
              </a>
              <a className="nav-item disabled" href="#">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path d="M3 12h4l3-9 4 18 3-9h4" />
                </svg>
                <span>Audio Studio</span>
                <span className="nav-tag">Em breve</span>
              </a>
            </div>
          </nav>
          <div className="sidebar-foot">
            <div className="credits">
              <div className="credits-row">
                <span>Plano {(profile?.tier || "free").toUpperCase()}</span>
                <strong>{profile?.credits ?? 0} cr</strong>
              </div>
              <div className="credits-bar">
                <i style={{ width: `${Math.min(100, ((profile?.credits ?? 0) / 5000) * 100)}%` }} />
              </div>
              <button className="upgrade" style={{ marginTop: 10 }}>
                Upgrade Pro
              </button>
            </div>
            <div className="user">
              <div className="avatar">{userInitial}</div>
              <div className="user-meta">
                <strong>{session?.user?.email?.split("@")[0] || "Anônimo"}</strong>
                <span>{userEmail}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── WORKSPACE ─── */}
        <section className="workspace">
          <div className="canvas">
            <div className="stage">
              <div
                className="stage-inner"
                style={{ ["--stage-bg" as any]: stageBg }}
              >
                {currentImage ? (
                  <img src={currentImage} alt="Geração atual" />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      color: "#5e5e66",
                      fontSize: 13,
                    }}
                  >
                    {isGenerating ? "Gerando…" : "Digite um prompt e clique em Gerar"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dock">
            <div className="dock-inner">
              <div className="dock-core">
                <div className="dock-row">
                  <button className="attach" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <textarea
                    className="prompt-input"
                    placeholder="Descreva a imagem que você quer gerar…"
                    rows={1}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={onPromptKey}
                  />
                  <button
                    className={"generate" + (isGenerating ? " loading" : "")}
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />
                    </svg>
                    <span className="gen-label">{isGenerating ? "Gerando…" : "Gerar"}</span>
                    <span className="cost">180 cr</span>
                  </button>
                </div>
                <div className="dock-tools">
                  <button
                    ref={modelChipRef}
                    className="dock-chip model"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenPopover((p) => (p === "model" ? null : "model"));
                    }}
                  >
                    <span className="g"></span>
                    <span>{modelLabel}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <button
                    ref={ratioChipRef}
                    className="dock-chip"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenPopover((p) => (p === "ratio" ? null : "ratio"));
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                      <rect x="4" y="6" width="16" height="12" rx="1" />
                    </svg>
                    <span>{ratio}</span>
                  </button>
                  <span style={{ flex: 1 }}></span>
                  <span className="dock-chip kbd">Ctrl + Enter</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── POPOVERS ─── */}
          {openPopover === "model" && modelChipRef.current && (
            <Popover anchor={modelChipRef.current}>
              {Object.keys(MODEL_LABEL_TO_ID).map((label) => (
                <PopoverItem
                  key={label}
                  active={label === modelLabel}
                  onClick={() => {
                    setModelLabel(label);
                    setOpenPopover(null);
                  }}
                >
                  {label}
                </PopoverItem>
              ))}
            </Popover>
          )}
          {openPopover === "ratio" && ratioChipRef.current && (
            <Popover anchor={ratioChipRef.current}>
              {ASPECT_RATIOS.map((r) => (
                <PopoverItem
                  key={r}
                  active={r === ratio}
                  onClick={() => {
                    setRatio(r);
                    setOpenPopover(null);
                  }}
                >
                  {r}
                </PopoverItem>
              ))}
            </Popover>
          )}
        </section>

        {/* ─── RAIL (HISTÓRICO) ─── */}
        <aside className="rail">
          <div className="rail-head">
            <div className="rail-tabs">
              <span className="rail-tab-ind"></span>
              <button className="rail-tab active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                Histórico
              </button>
            </div>
            <div className="rail-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input placeholder="Buscar nas suas gerações…" />
            </div>
          </div>
          <div className="rail-list">
            {history.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: "#5e5e66", textAlign: "center" }}>
                Nenhuma geração ainda
              </div>
            )}
            {history.map((g, i) => {
              const url = g.image_urls?.[0];
              if (!url) return null;
              return (
                <article
                  key={g.id}
                  className="history"
                  style={{ animationDelay: `${i * 55}ms` }}
                  onClick={() => handleHistoryClick(g)}
                >
                  <img src={url} alt={g.prompt || ""} loading="lazy" />
                  <div className="label">
                    <div>{g.prompt || "(sem prompt)"}</div>
                    <div className="ago">{timeAgo(g.created_at)}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ─── TOAST ─── */}
      <div className={"toast" + (show ? " show" : "")}>
        <span className="ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span>{msg}</span>
      </div>
    </>
  );
}

// ─── Popover (sub-componente local) ───
function Popover({
  anchor,
  children,
}: {
  anchor: HTMLElement;
  children: React.ReactNode;
}) {
  const rect = anchor.getBoundingClientRect();
  return (
    <div
      id="__refine_popover"
      style={{
        position: "fixed",
        zIndex: 9999,
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
        background: "rgba(20,20,22,.96)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,.16)",
        borderRadius: 14,
        padding: 8,
        minWidth: 200,
        maxHeight: 380,
        overflow: "auto",
        color: "#f6f6f8",
        fontSize: 12.5,
        boxShadow: "0 16px 40px rgba(0,0,0,.6)",
      }}
    >
      {children}
    </div>
  );
}

function PopoverItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "8px 10px",
        borderRadius: 8,
        background: active ? "rgba(255,106,26,.10)" : "transparent",
        border: 0,
        color: active ? "#ff8a3d" : "inherit",
        fontSize: 12,
        cursor: "pointer",
        gap: 10,
        textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = active ? "rgba(255,106,26,.10)" : "transparent")
      }
    >
      <span>{children}</span>
    </button>
  );
}
