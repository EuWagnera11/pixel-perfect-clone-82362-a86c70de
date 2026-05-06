/**
 * RefineApp — root with React Router. URL é a fonte da verdade pra `currentTab`.
 * Cada ferramenta é uma sub-rota: /image, /video, /audio, /edit, /upscale, etc.
 * Botão Gerar é não-bloqueante: dispara um job no JobsProvider e libera o usuário.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { Toaster as SonnerToaster, toast } from "sonner";
import { AuthProvider } from "@/lib/auth";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import { useAuth } from "./hooks/useAuth";
import { useGenerations } from "./hooks/useGenerations";
import { useToast } from "./hooks/useToast";
import { Sidebar } from "./components/Sidebar";
import { Dock } from "./components/Dock";
import { Rail } from "./components/Rail";
import { Toast } from "./components/Toast";
import { JobsPanel } from "./components/JobsPanel";
import { ToolOptionsBar, tabHasOptions, type ToolOptions } from "./components/ToolOptionsBar";
import { ImageWorkspace } from "./components/ImageWorkspace";
import { VideoWorkspace } from "./components/VideoWorkspace";
import { ToolWorkspace, tabHasToolWorkspace } from "./components/ToolWorkspace";
import { AccountPage } from "./components/AccountPage";
import { TopupModal } from "./components/TopupModal";
import { JobsProvider, useJobs, type Job } from "./lib/jobs";
import { TAB_CONFIG } from "./lib/nav";
import {
  type AspectRatio,
  MODEL_LABEL_TO_ID,
  MODEL_ID_TO_LABEL,
  DEFAULT_MODEL_BY_TAB,
} from "./lib/models";
import { tabRequiresUpload, tabPromptOptional } from "./tools";
// @ts-ignore — mockup-views.ts tem ts-nocheck (JS bruto)
import { VIEWS, TAB_CONFIG as MOCKUP_TAB_CFG } from "./lib/mockup-views";
import { supabase } from "@/integrations/supabase/client";

const VALID_TABS = new Set([
  "home", "explore", "projects", "image", "video", "cinema", "edit", "audio",
  "upscale", "ecommerce", "product", "r3d", "assets", "depth", "character",
  "marketing", "styletransfer", "all", "account",
]);

async function uploadFile(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Faça login para enviar arquivos");
  }
  const fd = new FormData();
  fd.append("file", file);
  const { data, error } = await supabase.functions.invoke<{ url: string }>("uploads-file", {
    method: "POST", body: fd,
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Upload sem URL");
  return data.url;
}

function Workspace() {
  const { tool: tabParam } = useParams<{ tool: string }>();
  const navigate = useNavigate();
  const currentTab = tabParam && VALID_TABS.has(tabParam) ? tabParam : "home";

  const {
    session, profile, loading: authLoading, refreshProfile,
    upgradeTo, signInWithGoogle, signOut,
  } = useAuth();
  const isAnonymous = (session?.user?.is_anonymous as boolean | undefined) ?? !session?.user?.email;
  const { history, setHistory } = useGenerations();
  const { msg, show, showToast } = useToast();
  const { enqueue, active } = useJobs();

  const [prompt, setPrompt] = useState("");
  const [modelLabel, setModelLabel] = useState("Nano-Banana Pro");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState("1K");
  const [variations, setVariations] = useState(1);
  const [stylePack, setStylePack] = useState<string | null>(null);
  const [toolOptions, setToolOptions] = useState<ToolOptions>({});
  const viewRef = useRef<HTMLDivElement>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const userId = session?.user?.id ?? null;

  // Trocar de aba limpa upload (cada ferramenta tem seu fluxo independente)
  useEffect(() => { setSourceUrl(null); setLastFrameUrl(null); }, [currentTab]);

  const tabConfig = TAB_CONFIG[currentTab] || TAB_CONFIG.home;
  const noDock = (MOCKUP_TAB_CFG as any)[currentTab]?.noDock;
  const noRail = (MOCKUP_TAB_CFG as any)[currentTab]?.noRail;

  const viewHtml = (() => {
    const fn = (VIEWS as any)[currentTab];
    if (typeof fn === "function") return fn();
    return `<div class="head"><div><h1>Em construção</h1><p>Esta view ainda não foi portada do mockup.</p></div></div>`;
  })();

  // Default model + ratio quando muda a aba
  useEffect(() => {
    const defaultId = DEFAULT_MODEL_BY_TAB[currentTab];
    if (defaultId) setModelLabel(MODEL_ID_TO_LABEL[defaultId] || defaultId);
    else {
      const cfg = (MOCKUP_TAB_CFG as any)[currentTab];
      if (cfg?.model && cfg.model !== "—" && cfg.model !== "Refine Suite") setModelLabel(cfg.model);
    }
    const cfg = (MOCKUP_TAB_CFG as any)[currentTab];
    const validRatios = ["1:1", "9:16", "16:9", "4:3", "3:4", "21:9"];
    if (cfg?.ratio && validRatios.includes(cfg.ratio)) setRatio(cfg.ratio as AspectRatio);
  }, [currentTab]);

  // Click delegation dentro do view
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tabBtn = target.closest("[data-tab]") as HTMLElement | null;
      if (tabBtn) {
        e.stopPropagation();
        const k = tabBtn.dataset.tab;
        if (k) navigate(`/${k}`);
        return;
      }
      const actionBtn = target.closest("[data-action]") as HTMLElement | null;
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        const stageImg = el.querySelector("#stageImg") as HTMLImageElement | null;
        if (action === "toggle-filters") {
          const bar = el.querySelector("#imgFiltersBar") as HTMLElement | null;
          if (bar) bar.style.display = bar.style.display === "none" ? "flex" : "none";
        } else if (action === "export-image" && stageImg) {
          const a = document.createElement("a");
          a.href = stageImg.src; a.download = `refine-${Date.now()}.png`;
          a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove();
          showToast("Baixando imagem…");
        } else if (action === "copy-image" && stageImg) {
          navigator.clipboard?.writeText(stageImg.src);
          showToast("URL copiada");
        } else if (action === "open-fullscreen" && stageImg) {
          window.open(stageImg.src, "_blank");
        }
        return;
      }
      const filterBtn = target.closest("[data-filter]") as HTMLElement | null;
      if (filterBtn) {
        const f = filterBtn.dataset.filter || "original";
        const stageImg = el.querySelector("#stageImg") as HTMLImageElement | null;
        if (stageImg) {
          const map: Record<string, string> = {
            original: "none",
            "b&p": "grayscale(1)",
            "sépia": "sepia(.85)",
            vintage: "sepia(.4) contrast(1.1) saturate(.85)",
            vivid: "saturate(1.6) contrast(1.1)",
            cool: "hue-rotate(-15deg) saturate(1.1)",
            warm: "hue-rotate(15deg) saturate(1.1)",
            noir: "grayscale(1) contrast(1.3)",
          };
          stageImg.style.filter = map[f] || "none";
        }
        return;
      }
      const packBtn = target.closest("[data-style-pack]") as HTMLElement | null;
      if (packBtn) {
        const name = packBtn.dataset.stylePack!;
        setStylePack((cur) => (cur === name ? null : name));
        showToast(`Style pack: ${name}`);
        return;
      }
      const imgBtn = target.closest("[data-img]") as HTMLElement | null;
      if (imgBtn?.dataset.img) {
        const stageImg = el.querySelector("#stageImg") as HTMLImageElement | null;
        if (stageImg) {
          stageImg.src = imgBtn.dataset.img;
          (el.querySelector(".stage-inner") as HTMLElement | null)?.style.setProperty(
            "--stage-bg", `url("${imgBtn.dataset.img}")`,
          );
        }
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [currentTab, navigate, showToast]);

  // Sync stage meta com modelo/qualidade/ratio na aba image
  useEffect(() => {
    const el = viewRef.current; if (!el) return;
    const m = el.querySelector("#imgMetaModel"); if (m) m.textContent = modelLabel;
    const q = el.querySelector("#imgMetaQuality"); if (q) q.textContent = quality;
    const r = el.querySelector("#imgMetaRatio"); if (r) r.textContent = ratio;
  }, [modelLabel, quality, ratio, currentTab]);

  const renderResultOnStage = useCallback((url: string, type: "image" | "video" | "audio") => {
    const el = viewRef.current;
    if (!el) return;
    const stage = el.querySelector("#stageImg");
    if (!stage || !stage.parentNode) return;
    let newEl: HTMLElement;
    if (type === "video") {
      const v = document.createElement("video");
      v.src = url; v.controls = true; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
      v.style.cssText = "width:100%;height:100%;object-fit:cover";
      newEl = v;
    } else if (type === "audio") {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:24px;";
      const a = document.createElement("audio");
      a.src = url; a.controls = true; a.autoplay = true;
      a.style.cssText = "width:100%;max-width:600px";
      wrap.appendChild(a);
      newEl = wrap;
    } else {
      const img = document.createElement("img");
      img.src = url; img.alt = ""; img.style.cssText = "width:100%;height:100%;object-fit:cover";
      newEl = img;
    }
    newEl.id = "stageImg";
    stage.parentNode.replaceChild(newEl, stage);
    const stageInner = el.querySelector(".stage-inner") as HTMLElement | null;
    if (type === "image") stageInner?.style.setProperty("--stage-bg", `url("${url}")`);
    else stageInner?.style.setProperty("--stage-bg", "");
  }, []);

  const handleAttach = useCallback(async (file: File) => {
    try {
      showToast("Enviando imagem...");
      const url = await uploadFile(file);
      setSourceUrl(url);
      renderResultOnStage(url, "image");
      showToast("Imagem anexada");
    } catch (e: any) {
      showToast("Erro no upload: " + (e?.message || "falha"));
    }
  }, [showToast, renderResultOnStage]);

  // ─── Generate (NÃO-BLOQUEANTE) ───
  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed && !tabPromptOptional(currentTab)) {
      showToast("Digite um prompt primeiro"); return;
    }
    if (tabRequiresUpload(currentTab) && !sourceUrl) {
      showToast("Anexe uma imagem primeiro"); return;
    }
    const modelId = MODEL_LABEL_TO_ID[modelLabel] || null;
    // Dispara N jobs separados (cada variação = 1 imagem independente)
    const n = Math.max(1, variations);
    const promises = Array.from({ length: n }).map(() =>
      enqueue({
        tab: currentTab, prompt: trimmed,
        aspect: (toolOptions.videoAspect as AspectRatio) || ratio,
        sourceUrl, model: modelId, thumb: sourceUrl || undefined,
        quality, numVariations: 1, stylePack,
        duration: toolOptions.videoDuration,
        editOp: toolOptions.editOp,
        upscaleEngine: toolOptions.upscaleEngine,
        audioKind: toolOptions.audioKind,
        lastImageUrl: lastFrameUrl,
        extras: toolOptions.extras,
      })
    );
    const results = await Promise.all(promises);
    const fail = results.find((r) => !r.ok);
    if (fail) { showToast("Erro: " + (fail.error || "falha")); return; }
    showToast(n > 1 ? `${n} gerações iniciadas em paralelo` : "Geração iniciada");
    setPrompt("");
  }, [prompt, ratio, modelLabel, currentTab, sourceUrl, enqueue, showToast, quality, variations, stylePack, toolOptions, lastFrameUrl]);

  // Quando um job completa, mostra no stage + adiciona ao history + toast
  const handleJobOpen = useCallback((job: Job) => {
    if (!job.resultUrl) return;
    renderResultOnStage(job.resultUrl, job.mediaType);
    setHistory((prev) => [{
      id: job.id, status: "completed" as const, prompt: job.prompt,
      image_urls: job.mediaType === "image" ? [job.resultUrl!] : [],
      video_urls: job.mediaType === "video" ? [job.resultUrl!] : [],
      credits_used: 0, media_type: job.mediaType,
      created_at: new Date(job.startedAt).toISOString(),
    }, ...prev].slice(0, 30));
    refreshProfile();
  }, [renderResultOnStage, setHistory, refreshProfile]);

  const handleHistoryClick = ({ img, prompt: p, kind }: { img: string; prompt: string; kind?: "image" | "video" }) => {
    const isVideo = kind === "video" || /\.mp4(\?|$)/i.test(img);
    renderResultOnStage(img, isVideo ? "video" : "image");
    setPrompt(p);
    showToast("Geração carregada");
  };

  if (authLoading) {
    return (
      <div className="app" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ color: "#9b9ba3", fontSize: 13 }}>Carregando…</div>
      </div>
    );
  }

  const activeJobsCount = active.length;

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-grid" />

      <div className={"app" + (noRail || currentTab === "image" || currentTab === "video" || tabHasToolWorkspace(currentTab) ? " no-rail" : "")} id="app">
        <Sidebar
          currentTab={currentTab}
          onTabChange={(k) => navigate(`/${k}`)}
          profile={profile}
          userId={userId}
          email={session?.user?.email ?? null}
          isAnonymous={isAnonymous}
          onUpgrade={() => navigate("/account?tab=plan")}
          onSignInGoogle={signInWithGoogle}
          onSignOut={signOut}
          onOpenAccount={(t) => navigate(`/account${t ? `?tab=${t}` : ""}`)}
          onOpenTopup={() => setTopupOpen(true)}
          activeJobsCount={activeJobsCount}
        />

        <section className="workspace">
          {currentTab === "account" && (
            <div className="canvas no-dock">
              <AccountPage
                profile={profile}
                email={session?.user?.email ?? null}
                isAnonymous={isAnonymous}
                onUpgrade={() => upgradeTo("starter_monthly")}
                onSignOut={signOut}
                refreshProfile={refreshProfile}
              />
            </div>
          )}
          {currentTab !== "account" && (() => {
            const useWorkspace = currentTab === "image" || currentTab === "video" || tabHasToolWorkspace(currentTab);
            if (!useWorkspace) return null;
            const wsProps = {
              history,
              onUploadRef: async (file: File) => {
                try {
                  showToast(currentTab === "video" ? "Enviando arquivo…" : "Enviando imagem…");
                  const url = await uploadFile(file);
                  showToast("Adicionado");
                  return url;
                } catch (e: any) {
                  showToast("Erro upload: " + (e?.message || "falha"));
                  return null;
                }
              },
              showToast,
              refreshHistory: async () => {
                const { data } = await supabase.auth.getUser();
                if (data.user) {
                  const { data: rows } = await supabase
                    .from("generations").select("*")
                    .eq("user_id", data.user.id)
                    .order("created_at", { ascending: false }).limit(60);
                  if (rows) setHistory(rows.filter((g: any) =>
                    g.status === "completed" && (g.image_urls?.length || g.video_urls?.length)
                  ) as any);
                }
              },
              onDeleteGeneration: async (id: string) => {
                const { error } = await supabase.from("generations").delete().eq("id", id);
                if (error) { showToast("Erro: " + error.message); return; }
                setHistory((p) => p.filter((g) => g.id !== id));
                showToast("Excluído");
              },
              onToggleFavorite: async (id: string, value: boolean) => {
                const cur = history.find((g) => g.id === id) as any;
                const md = { ...(cur?.metadata || {}), favorite: value };
                const { error } = await supabase.from("generations").update({ metadata: md }).eq("id", id);
                if (error) { showToast("Erro: " + error.message); return; }
                setHistory((p) => p.map((g: any) => g.id === id ? { ...g, metadata: md } : g));
              },
            };
            if (currentTab === "image") return <ImageWorkspace {...wsProps} />;
            if (currentTab === "video") return <VideoWorkspace {...wsProps} />;
            return <ToolWorkspace tab={currentTab} {...wsProps} />;
          })()}
          {currentTab !== "account" && !(currentTab === "image" || currentTab === "video" || tabHasToolWorkspace(currentTab)) && (
            <>
              <div className={"canvas" + (noDock ? " no-dock" : "")}>
                <div ref={viewRef} dangerouslySetInnerHTML={{ __html: viewHtml }} />
              </div>
              {!noDock && tabHasOptions(currentTab) && (
                <ToolOptionsBar
                  tab={currentTab}
                  value={toolOptions}
                  onChange={(patch) => setToolOptions((prev) => ({ ...prev, ...patch }))}
                />
              )}
              {!noDock && (
                <Dock
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  modelLabel={modelLabel}
                  onModelChange={setModelLabel}
                  ratio={ratio}
                  onRatioChange={setRatio}
                  isGenerating={false}
                  onGenerate={handleGenerate}
                  placeholder={tabConfig.placeholder}
                  onAttach={handleAttach}
                  hasAttachment={!!sourceUrl}
                  attachmentRequired={tabRequiresUpload(currentTab)}
                  currentTab={currentTab}
                  activeJobsCount={activeJobsCount}
                  quality={quality}
                  onQualityChange={setQuality}
                  variations={variations}
                  onVariationsChange={setVariations}
                  stylePack={stylePack}
                  onStylePackChange={setStylePack}
                />
              )}
            </>
          )}
        </section>

        {currentTab !== "account" && !noRail && !(currentTab === "image" || currentTab === "video" || tabHasToolWorkspace(currentTab)) && (
          <Rail generations={history} onItemClick={handleHistoryClick} currentTab={currentTab} />
        )}
      </div>

      <JobsPanel onOpenResult={handleJobOpen} />
      <Toast msg={msg} show={show} />
    </>
  );
}

export default function RefineApp() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <JobsProvider
          onCompleted={(job) => {
            const label = job.mediaType === "video" ? "Vídeo pronto" : job.mediaType === "audio" ? "Áudio pronto" : "Imagem pronta";
            toast.success(label, {
              description: job.prompt?.slice(0, 80) || job.tool,
              action: job.resultUrl ? { label: "Abrir", onClick: () => window.open(job.resultUrl, "_blank") } : undefined,
            });
          }}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/app" element={<Navigate to="/home" replace />} />
            <Route path="/:tool" element={<Workspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <SonnerToaster position="bottom-right" richColors theme="dark" />
        </JobsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
