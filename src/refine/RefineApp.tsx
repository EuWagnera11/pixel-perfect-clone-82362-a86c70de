/**
 * RefineApp — root React.
 * Orquestra: Sidebar (NAV completa) + Workspace (Canvas + Dock) + Rail + Toast.
 * Visual idêntico ao mockup HTML; views renderizadas via dangerouslySetInnerHTML
 * a partir de mockup-views.ts (copia fiel das view functions originais).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { useGenerations } from "./hooks/useGenerations";
import { useToast } from "./hooks/useToast";
import { Sidebar } from "./components/Sidebar";
import { Dock } from "./components/Dock";
import { Rail } from "./components/Rail";
import { Toast } from "./components/Toast";
import { TAB_CONFIG } from "./lib/nav";
import type { AspectRatio } from "./lib/models";
import { executeToolAction, tabRequiresUpload, tabPromptOptional, uploadFileForTool } from "./lib/tool-actions";
// @ts-ignore — mockup-views.ts tem ts-nocheck (JS bruto)
import { VIEWS, TAB_CONFIG as MOCKUP_TAB_CFG } from "./lib/mockup-views";

export default function RefineApp() {
  const {
    session,
    profile,
    loading: authLoading,
    refreshProfile,
    upgradeTo,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const isAnonymous = (session?.user?.is_anonymous as boolean | undefined) ?? !session?.user?.email;
  const { history, refresh: refreshHistory, setHistory } = useGenerations();
  const { msg, show, showToast } = useToast();

  const [currentTab, setCurrentTab] = useState<string>("home");
  const [prompt, setPrompt] = useState("");
  const [modelLabel, setModelLabel] = useState("Nano-Banana Pro");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // Quando a aba muda, limpa upload anterior (cada ferramenta tem seu fluxo)
  useEffect(() => { setSourceUrl(null); }, [currentTab]);

  const tabConfig = TAB_CONFIG[currentTab] || TAB_CONFIG.home;
  const noDock = (MOCKUP_TAB_CFG as any)[currentTab]?.noDock;
  const noRail = (MOCKUP_TAB_CFG as any)[currentTab]?.noRail;

  // ─── Render view ───
  const viewHtml = (() => {
    const fn = (VIEWS as any)[currentTab];
    if (typeof fn === "function") return fn();
    // Fallback: view generic placeholder
    return `
      <div class="head"><div><h1>Em construção</h1><p>Esta view ainda não foi portada do mockup. Em breve.</p></div></div>
    `;
  })();

  // Atualizar modelo/ratio quando aba mudar (espelha TAB_CONFIG)
  useEffect(() => {
    const cfg = (MOCKUP_TAB_CFG as any)[currentTab];
    if (cfg) {
      if (cfg.model && cfg.model !== "—" && cfg.model !== "Refine Suite") setModelLabel(cfg.model);
      // ratio só atualiza se for valido
      const validRatios = ["1:1", "9:16", "16:9", "4:3", "3:4", "21:9"];
      if (cfg.ratio && validRatios.includes(cfg.ratio)) setRatio(cfg.ratio as AspectRatio);
    }
  }, [currentTab]);

  // Click delegation dentro do view container — captura [data-tab] pra navegar
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tabBtn = target.closest("[data-tab]") as HTMLElement | null;
      if (tabBtn) {
        e.stopPropagation();
        const k = tabBtn.dataset.tab;
        if (k) setCurrentTab(k);
        return;
      }
      // Click em variation/style/history pill — troca stage
      const imgBtn = target.closest("[data-img]") as HTMLElement | null;
      if (imgBtn?.dataset.img) {
        const stageImg = el.querySelector("#stageImg") as HTMLImageElement | null;
        if (stageImg) {
          stageImg.src = imgBtn.dataset.img;
          (el.querySelector(".stage-inner") as HTMLElement | null)?.style.setProperty(
            "--stage-bg",
            `url("${imgBtn.dataset.img}")`
          );
        }
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [currentTab]);

  // ─── Renderiza resultado no stage (substitui o <img id=stageImg> conforme tipo) ───
  const renderResultOnStage = useCallback((url: string, type: "image" | "video" | "audio") => {
    const el = viewRef.current;
    if (!el) return;
    const stage = el.querySelector("#stageImg");
    if (!stage || !stage.parentNode) return;

    let newEl: HTMLElement;
    if (type === "video") {
      const v = document.createElement("video");
      v.src = url;
      v.controls = true;
      v.autoplay = true;
      v.loop = true;
      v.muted = true;
      v.playsInline = true;
      v.style.cssText = "width:100%;height:100%;object-fit:cover";
      newEl = v;
    } else if (type === "audio") {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:24px;";
      const a = document.createElement("audio");
      a.src = url;
      a.controls = true;
      a.autoplay = true;
      a.style.cssText = "width:100%;max-width:600px";
      wrap.appendChild(a);
      newEl = wrap;
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.style.cssText = "width:100%;height:100%;object-fit:cover";
      newEl = img;
    }
    newEl.id = "stageImg";
    stage.parentNode.replaceChild(newEl, stage);

    const stageInner = el.querySelector(".stage-inner") as HTMLElement | null;
    if (type === "image") {
      stageInner?.style.setProperty("--stage-bg", `url("${url}")`);
    } else {
      stageInner?.style.setProperty("--stage-bg", "");
    }
  }, []);

  // ─── Upload (botão attach do Dock) ───
  const handleAttach = useCallback(async (file: File) => {
    try {
      showToast("Enviando imagem...");
      const url = await uploadFileForTool(file);
      setSourceUrl(url);
      // Mostra a imagem no stage como preview
      renderResultOnStage(url, "image");
      showToast("Imagem anexada");
    } catch (e: any) {
      console.error("[refine] upload failed:", e);
      showToast("Erro no upload: " + (e?.message || "falha"));
    }
  }, [showToast, renderResultOnStage]);

  // ─── Generate ───
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    const trimmed = prompt.trim();
    if (!trimmed && !tabPromptOptional(currentTab)) {
      showToast("Digite um prompt primeiro");
      return;
    }
    if (tabRequiresUpload(currentTab) && !sourceUrl) {
      showToast("Anexe uma imagem primeiro (botão + no Dock)");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await executeToolAction({
        tab: currentTab,
        prompt: trimmed,
        ratio,
        sourceUrl,
      });
      renderResultOnStage(result.url, result.type);

      // Salva no history se for image/video (Galeria do user)
      if (result.type === "image" || result.type === "video") {
        setHistory((prev) => [{
          id: `local-${Date.now()}`,
          status: "completed" as const,
          prompt: trimmed,
          image_urls: result.type === "image" ? [result.url] : [],
          video_urls: result.type === "video" ? [result.url] : [],
          credits_used: result.creditsUsed ?? 0,
          media_type: result.type,
          created_at: new Date().toISOString(),
        }, ...prev].slice(0, 30));
      }

      showToast(`Pronto · ${result.creditsUsed ?? 0} cr · ${modelLabel}`);
      refreshProfile();
    } catch (e: any) {
      console.error("[refine] generate failed:", e);
      showToast("Erro: " + (e?.message || "falha"));
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, ratio, modelLabel, currentTab, sourceUrl, isGenerating, refreshProfile, setHistory, showToast, renderResultOnStage]);

  const handleHistoryClick = ({ img, prompt: p }: { img: string; prompt: string }) => {
    const el = viewRef.current;
    if (el) {
      const stageImg = el.querySelector("#stageImg") as HTMLImageElement | null;
      if (stageImg) stageImg.src = img;
      (el.querySelector(".stage-inner") as HTMLElement | null)?.style.setProperty(
        "--stage-bg",
        `url("${img}")`
      );
    }
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

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-grid" />

      <div className={"app" + (noRail ? " no-rail" : "")} id="app">
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
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
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              placeholder={tabConfig.placeholder}
              onAttach={handleAttach}
              hasAttachment={!!sourceUrl}
              attachmentRequired={tabRequiresUpload(currentTab)}
            />
          )}
        </section>

        {!noRail && (
          <Rail generations={history} onItemClick={handleHistoryClick} />
        )}
      </div>

      <Toast msg={msg} show={show} />
    </>
  );
}
