/**
 * RefineApp — root React.
 * Orquestra: Sidebar (NAV completa) + Workspace (Canvas + Dock) + Rail + Toast.
 * Visual idêntico ao mockup HTML; views renderizadas via dangerouslySetInnerHTML
 * a partir de mockup-views.ts (copia fiel das view functions originais).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { useGenerations, createGeneration, pollGeneration } from "./hooks/useGenerations";
import { useToast } from "./hooks/useToast";
import { Sidebar } from "./components/Sidebar";
import { Dock } from "./components/Dock";
import { Rail } from "./components/Rail";
import { Toast } from "./components/Toast";
import { TAB_CONFIG } from "./lib/nav";
import type { AspectRatio } from "./lib/models";
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
  const viewRef = useRef<HTMLDivElement>(null);

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

  // ─── Generate ───
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      showToast("Digite um prompt primeiro");
      return;
    }
    if (isGenerating) return;
    setIsGenerating(true);
    const isVideo = currentTab === "video";
    const mediaType: "image" | "video" = isVideo ? "video" : "image";
    try {
      const created = await createGeneration({
        prompt: prompt.trim(),
        aspect_ratio: ratio,
        resolution: "1k",
        num_variations: 1,
        media_type: mediaType,
      });
      showToast(`Enfileirado · ${created.credits_used} cr · ${modelLabel}`);
      const final = await pollGeneration(created.id, isVideo ? 300_000 : 120_000);
      if (final.status === "failed") {
        showToast("Falha: " + (final.error_message || "desconhecida").slice(0, 80));
        return;
      }
      const url = isVideo ? final.video_urls?.[0] : final.image_urls?.[0];
      if (url) {
        const el = viewRef.current;
        if (el) {
          if (isVideo) {
            // Stage do mockup é <img id=stageImg> — substitui por <video> on the fly
            const stage = el.querySelector("#stageImg");
            if (stage && stage.parentNode) {
              const video = document.createElement("video");
              video.id = "stageImg";
              video.src = url;
              video.controls = true;
              video.autoplay = true;
              video.loop = true;
              video.muted = true;
              video.playsInline = true;
              video.style.width = "100%";
              video.style.height = "100%";
              video.style.objectFit = "cover";
              stage.parentNode.replaceChild(video, stage);
            }
            (el.querySelector(".stage-inner") as HTMLElement | null)?.style.setProperty("--stage-bg", "");
          } else {
            const stageImg = el.querySelector("#stageImg") as HTMLImageElement | null;
            if (stageImg) stageImg.src = url;
            (el.querySelector(".stage-inner") as HTMLElement | null)?.style.setProperty(
              "--stage-bg",
              `url("${url}")`
            );
          }
        }
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
  }, [prompt, ratio, modelLabel, currentTab, isGenerating, refreshProfile, setHistory, showToast]);

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
