/**
 * Refine Glue — conecta os botoes/inputs do mockup ao backend cubo deployado.
 *
 * NAO altera nenhum estilo/HTML/CSS do site. Apenas:
 *   - Faz auto-login Supabase (anonymous se nao logado)
 *   - Sobrescreve a funcao generate() simulada do mockup
 *   - Atualiza saldo de creditos no UI
 *   - Conecta dropdowns de modelo/aspect ratio
 *   - Faz polling de jobs e mostra resultado em #stageImg
 *
 * Carregado via <script src="/refine-glue.js" defer></script> antes do </body>.
 */
(function () {
  "use strict";

  // ============== CONFIG ==============
  const API_URL = "https://refine-saas-cubo-api.ewp1z9.easypanel.host";
  const SUPABASE_URL = "https://obxbwawlvtbfbxocnxzl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_NY_ToQeIZmjraQkAdso2_w_5t8AnW7T";

  // Map: label visivel no UI -> model id no backend
  const MODEL_LABEL_TO_ID = {
    "Nano-Banana Pro": "nano-banana-pro",
    "Nano Banana Pro": "nano-banana-pro",
    "Nano-Banana Pro Flash": "nano-banana-pro-flash",
    "Nano-Banana 2": "nano-banana-2",
    "Flux Dev": "flux-dev",
    "Flux Pro": "flux-pro-1-1",
    "Flux 2 Pro": "flux-2-pro",
    "Flux 2 Turbo": "flux-2-turbo",
    "Flux 2 Klein": "flux-2-klein",
    "Mystic": "mystic",
    "Imagen 3": "imagen-3",
    "Imagen 4 Fast": "imagen-4-fast",
    "Imagen 4 Ultra": "imagen-4-ultra",
    "Seedream v4": "seedream-v4",
    "Hyperflux": "hyperflux",
    "Refine": "nano-banana-pro",
  };

  // Map: ratio UI (16:9) -> aspect_ratio backend (mesmo formato)
  function normalizeRatio(label) {
    if (!label) return "1:1";
    const m = String(label).match(/(\d+)\s*[:x×]\s*(\d+)/);
    if (m) return `${m[1]}:${m[2]}`;
    return "1:1";
  }

  // ============== STATE ==============
  let supabase = null;
  let currentSession = null;
  let currentProfile = null;

  function $(id) { return document.getElementById(id); }

  function showToast(msg) {
    if (window.showToast) return window.showToast(msg);
    const t = $("toast"), m = $("toastMsg");
    if (!t || !m) return console.log("[refine]", msg);
    m.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 3000);
  }

  // ============== SUPABASE LOAD ==============
  async function loadSupabase() {
    if (window.supabase && window.supabase.createClient) return window.supabase;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.onload = () => resolve(window.supabase);
      s.onerror = () => reject(new Error("Falha ao carregar Supabase JS"));
      document.head.appendChild(s);
    });
  }

  async function ensureAuth() {
    const sb = await loadSupabase();
    supabase = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
    });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentSession = session;
      return session;
    }
    // Sem sessao: auto-login anonymous
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[refine] signInAnonymously failed:", error);
      showToast("Erro de auth: " + error.message);
      throw error;
    }
    currentSession = data.session;
    return data.session;
  }

  // ============== API CLIENT ==============
  async function api(path, opts = {}) {
    if (!currentSession) await ensureAuth();
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${currentSession.access_token}`,
      ...(opts.headers || {}),
    };
    let body = opts.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      body = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(API_URL + path, { ...opts, headers, body });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const msg = (json && (json.detail || json.error)) || `HTTP ${res.status}`;
      const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  // ============== UI INTEGRATION ==============
  async function refreshBilling() {
    try {
      const me = await api("/billing/me");
      currentProfile = me;
      // Tenta atualizar chip de creditos no UI sem mudar layout
      const chip = document.querySelector(".cta-new .badge, .credits-badge, [data-credits]");
      if (chip) chip.textContent = `${me.credits} cr`;
      // Atualiza .gen-cost no botao de gerar (custo dinamico vai no momento da geracao)
      const userMetaSpan = document.querySelector(".user-meta span");
      if (userMetaSpan && currentSession?.user?.email) {
        userMetaSpan.textContent = currentSession.user.email;
      }
      console.log("[refine] billing OK — credits:", me.credits, "tier:", me.tier);
    } catch (e) {
      console.warn("[refine] billing failed:", e);
    }
  }

  async function realGenerate() {
    const promptEl = $("promptInput");
    const modelEl = $("modelName");
    const ratioEl = $("ratioVal");
    const btn = $("genBtn");
    const stage = $("stageImg");

    const prompt = (promptEl?.value || "").trim();
    if (!prompt) {
      showToast("Digite um prompt primeiro");
      promptEl?.focus();
      return;
    }

    const modelLabel = (modelEl?.textContent || "").trim();
    const modelId = MODEL_LABEL_TO_ID[modelLabel] || "nano-banana-pro";
    const ratio = normalizeRatio(ratioEl?.textContent);

    // UI loading state (reusa as classes do mockup)
    btn.classList.add("loading");
    const lbl = btn.querySelector(".gen-label");
    if (lbl) lbl.textContent = "Gerando...";

    try {
      // Detecta media_type pela aba ativa (currentTab eh global do mockup)
      const tab = window.currentTab || "home";
      let mediaType = "image";
      if (tab === "video" || tab === "videos") mediaType = "video";

      const body = {
        prompt,
        media_type: mediaType,
        aspect_ratio: ratio,
        resolution: "1k",
        num_variations: 1,
      };
      const created = await api("/generations", { method: "POST", body });
      showToast(`Enfileirado · ${created.credits_used} cr · ${modelLabel}`);

      // Polling
      const id = created.id;
      let attempts = 0, finalDoc = null;
      while (attempts < 60) {
        await new Promise(r => setTimeout(r, 4000));
        attempts++;
        const doc = await api(`/generations/${id}`);
        if (doc.status === "completed") { finalDoc = doc; break; }
        if (doc.status === "failed") {
          const err = doc.error_message || "Falha desconhecida";
          showToast("Falha: " + err.slice(0, 80));
          return;
        }
      }
      if (!finalDoc) {
        showToast("Timeout aguardando geracao");
        return;
      }

      const urls = finalDoc.image_urls || finalDoc.video_urls || [];
      if (urls[0] && stage) {
        stage.src = urls[0];
        const inner = document.querySelector(".stage-inner");
        if (inner) inner.style.setProperty("--stage-bg", `url("${urls[0]}")`);
      }
      showToast("Pronto · " + modelLabel);
      refreshBilling();
    } catch (e) {
      console.error("[refine] generate failed:", e);
      showToast("Erro: " + (e.message || "falha"));
    } finally {
      btn.classList.remove("loading");
      if (lbl) lbl.textContent = "Gerar";
    }
  }

  // ============== DROPDOWNS DE MODELO/RATIO/QUALIDADE ==============
  // Como os botoes existem como visual mas sem dropdown real, vamos adicionar
  // popover via JS quando clicados. Sem mudar CSS — usa elementos absolute simples.
  let modelsCache = null;
  async function loadModels() {
    if (modelsCache) return modelsCache;
    try {
      const r = await api("/catalog/models");
      modelsCache = r;
      return r;
    } catch (e) {
      console.warn("[refine] catalog/models falhou:", e);
      return { images: [], videos: [] };
    }
  }

  function attachDockChipPopover(chipEl, type) {
    // type: "model" | "ratio" | "quality" | "variations" | "style"
    chipEl.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Se ja tem popover aberto, remove e sai
      const existing = document.getElementById("__refine_popover");
      if (existing) { existing.remove(); return; }

      const rect = chipEl.getBoundingClientRect();
      const pop = document.createElement("div");
      pop.id = "__refine_popover";
      pop.style.cssText = `
        position:fixed; z-index:9999;
        left:${rect.left}px; bottom:${window.innerHeight - rect.top + 8}px;
        background:rgba(20,20,22,.96); backdrop-filter:blur(20px);
        border:1px solid rgba(255,255,255,.16);
        border-radius:14px; padding:8px;
        min-width:200px; max-height:380px; overflow:auto;
        font-family:inherit; color:#f6f6f8; font-size:12.5px;
        box-shadow:0 16px 40px rgba(0,0,0,.6);
      `;

      let items = [];
      if (type === "model") {
        const cat = await loadModels();
        items = (cat.images || []).map(m => ({
          label: m.name,
          value: m.id,
          right: m.tier ? m.tier[0].toUpperCase() + m.tier.slice(1) : "",
          onClick: () => {
            $("modelName").textContent = m.name;
            // adicionar ao MODEL_LABEL_TO_ID dinamicamente
            MODEL_LABEL_TO_ID[m.name] = m.id;
            pop.remove();
          },
        }));
      } else if (type === "ratio") {
        const ratios = ["1:1", "9:16", "16:9", "4:3", "3:4", "21:9"];
        items = ratios.map(r => ({
          label: r,
          onClick: () => { $("ratioVal").textContent = r; pop.remove(); },
        }));
      }

      if (items.length === 0) {
        items = [{ label: "(em breve)", onClick: () => pop.remove() }];
      }

      items.forEach(it => {
        const btn = document.createElement("button");
        btn.style.cssText = `
          display:flex; align-items:center; justify-content:space-between;
          width:100%; padding:8px 10px; border-radius:8px;
          background:transparent; border:0; color:inherit; font-size:12px;
          cursor:pointer; gap:10px; text-align:left;
        `;
        btn.onmouseenter = () => btn.style.background = "rgba(255,255,255,.06)";
        btn.onmouseleave = () => btn.style.background = "transparent";
        btn.onclick = (ev) => { ev.stopPropagation(); it.onClick(); };
        btn.innerHTML = `<span>${it.label}</span>` + (it.right ? `<span style="opacity:.6;font-size:10px">${it.right}</span>` : "");
        pop.appendChild(btn);
      });

      document.body.appendChild(pop);

      // Click fora fecha
      const close = (ev) => {
        if (!pop.contains(ev.target) && ev.target !== chipEl) {
          pop.remove();
          document.removeEventListener("click", close, true);
        }
      };
      setTimeout(() => document.addEventListener("click", close, true), 50);
    }, true);
  }

  // ============== INIT ==============
  async function init() {
    try {
      await ensureAuth();
      console.log("[refine] auth OK, user:", currentSession.user.id);
      await refreshBilling();

      // Sobrescrever click do botao gerar — addEventListener com capture
      const btn = $("genBtn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.stopImmediatePropagation();
          realGenerate();
        }, true);
      }

      // Cmd/Ctrl+Enter no prompt
      const pi = $("promptInput");
      if (pi) {
        pi.addEventListener("keydown", (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            e.stopImmediatePropagation();
            realGenerate();
          }
        }, true);
      }

      // Dropdowns: model chip e ratio chip
      const dockChips = document.querySelectorAll(".dock-chip");
      dockChips.forEach(chip => {
        if (chip.classList.contains("model")) {
          attachDockChipPopover(chip, "model");
        } else {
          // Heuristica: se contem id ratioVal eh ratio
          if (chip.querySelector("#ratioVal")) {
            attachDockChipPopover(chip, "ratio");
          }
        }
      });

      console.log("[refine] glue ready");
    } catch (e) {
      console.error("[refine] init failed:", e);
      showToast("Backend offline ou auth falhou");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 200));
  } else {
    setTimeout(init, 200);
  }
})();
