/**
 * RefineApp — root with React Router. URL é a fonte da verdade pra `currentTab`.
 * Cada ferramenta é uma sub-rota: /image, /video, /audio, /edit, /upscale, etc.
 * Botão Gerar é não-bloqueante: dispara um job no JobsProvider e libera o usuário.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useGenerations } from "./hooks/useGenerations";
import { useToast } from "./hooks/useToast";
import { Sidebar } from "./components/Sidebar";
import { Dock } from "./components/Dock";
import { Rail } from "./components/Rail";
import { Toast } from "./components/Toast";
import { JobsPanel } from "./components/JobsPanel";
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
  "marketing", "all",
]);

async function uploadFile(file: File): Promise<string> {
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
  const [quality, setQuality] = useState("1K");
  const [variations, setVariations] = useState(1);
  const [stylePack, setStylePack] = useState<string | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // Trocar de aba limpa upload (cada ferramenta tem seu fluxo independente)
  useEffect(() => { setSourceUrl(null); }, [currentTab]);

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

  // Click delegation dentro do view (data-tab → navega; data-img → troca preview)
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
  }, [currentTab, navigate]);

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
    const result = await enqueue({
      tab: currentTab, prompt: trimmed, aspect: ratio,
      sourceUrl, model: modelId, thumb: sourceUrl || undefined,
    });
    if (!result.ok) {
      showToast("Erro: " + (result.error || "falha"));
      return;
    }
    showToast("Geração iniciada — você pode mandar outra");
    setPrompt(""); // libera o form pra próxima
  }, [prompt, ratio, modelLabel, currentTab, sourceUrl, enqueue, showToast]);

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

      <div className={"app" + (noRail ? " no-rail" : "")} id="app">
        <Sidebar
          currentTab={currentTab}
          onTabChange={(k) => navigate(`/${k}`)}
          profile={profile}
          email={session?.user?.email ?? null}
          isAnonymous={isAnonymous}
          onUpgrade={() => upgradeTo("starter_monthly")}
          onSignInGoogle={signInWithGoogle}
          onSignOut={signOut}
        />

        <section className="workspace">
          <div className={"canvas" + (noDock ? " no-dock" : "")}>
            <div ref={viewRef} dangerouslySetInnerHTML={{ __html: viewHtml }} />
          </div>
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
            />
          )}
        </section>

        {!noRail && (
          <Rail generations={history} onItemClick={handleHistoryClick} />
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
      <JobsProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/:tool" element={<Workspace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </JobsProvider>
    </BrowserRouter>
  );
}
