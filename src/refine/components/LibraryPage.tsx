/**
 * LibraryPage — Biblioteca full-screen de referências.
 * Layout 3-col: sidebar (categorias) | grid central (cards) | painel direito (upload).
 * Esc fecha. Click em card chama onPick e fecha. Drag/drop no painel direito faz upload.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { MentionItem, MentionType } from "./PromptInput";

type Category = "estilo" | "personagem" | "elemento" | "cor" | "efeitos" | "camera" | "stock";

type Props = {
  open: boolean;
  defaultCategory?: Category;
  initialQuery?: string;
  items: MentionItem[];
  onClose: () => void;
  onPick: (item: MentionItem) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  showToast: (m: string) => void;
};

const SIDE_GROUPS: { eyebrow: string; items: { id: Category; label: string; icon: string; pin?: boolean }[] }[] = [
  {
    eyebrow: "CRIAÇÕES",
    items: [
      { id: "stock", label: "Histórico", icon: "M3 12a9 9 0 1 0 9-9 M3 12V3 M3 12h9" },
    ],
  },
  {
    eyebrow: "TODAS AS REFERÊNCIAS",
    items: [
      { id: "estilo", label: "Estilo", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12a2 2 0 1 1 0-.01 M16 12a2 2 0 1 1 0-.01", pin: true },
      { id: "personagem", label: "Personagem", icon: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 20a8 8 0 0 1 16 0", pin: true },
      { id: "elemento", label: "Elemento", icon: "M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7" },
      { id: "cor", label: "Cor", icon: "M12 3a9 9 0 1 0 0 18 4 4 0 0 1 0-8 4 4 0 0 0 0-8z" },
      { id: "efeitos", label: "Efeitos", icon: "M5 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2z M16 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" },
      { id: "camera", label: "Câmera", icon: "M3 7h4l2-3h6l2 3h4v12H3z M12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" },
    ],
  },
];

type CategoryConfig = {
  title: string;
  newLabel: string;
  tabs: string[];
  type: MentionType | "all";
  seeds: { name: string; meta?: string }[];
  emptyHint: string;
};

const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  stock: {
    title: "Histórico",
    newLabel: "Novo estilo",
    tabs: ["Em destaque", "Meus estilos", "Tudo", "Foto", "Ilustração", "3D", "Design"],
    type: "all",
    seeds: [
      { name: "cinematic" }, { name: "editorial" }, { name: "product" },
      { name: "anime" }, { name: "3d" }, { name: "noir" },
    ],
    emptyHint: "Faça upload no painel à direita ou crie uma nova referência.",
  },
  estilo: {
    title: "Estilos",
    newLabel: "Novo estilo",
    tabs: ["Em destaque", "Meus estilos", "Foto", "Ilustração", "3D", "Pintura", "Design"],
    type: "style",
    seeds: [
      { name: "cinematic" }, { name: "editorial" }, { name: "anime" },
      { name: "3d-render" }, { name: "watercolor" }, { name: "noir" },
      { name: "pop-art" }, { name: "vaporwave" },
    ],
    emptyHint: "Crie um estilo a partir de uma imagem ou descrição.",
  },
  personagem: {
    title: "Personagens",
    newLabel: "Novo personagem",
    tabs: ["Em destaque", "Meus personagens", "Realista", "Cartoon", "3D", "Anime"],
    type: "character",
    seeds: [
      { name: "alex" }, { name: "maya" }, { name: "kenji" },
      { name: "luna" }, { name: "rio" }, { name: "ada" },
    ],
    emptyHint: "Adicione fotos de referência para treinar um novo personagem.",
  },
  elemento: {
    title: "Elementos",
    newLabel: "Novo elemento",
    tabs: ["Em destaque", "Meus elementos", "Produtos", "Logos", "Objetos", "Texturas"],
    type: "product",
    seeds: [
      { name: "garrafa" }, { name: "tenis" }, { name: "logo-marca" },
      { name: "smartwatch" }, { name: "cadeira" }, { name: "perfume" },
    ],
    emptyHint: "Faça upload de um produto ou objeto isolado.",
  },
  cor: {
    title: "Cores",
    newLabel: "Nova paleta",
    tabs: ["Em destaque", "Minhas paletas", "Quente", "Fria", "Pastel", "Neon", "Monocromático"],
    type: "style",
    seeds: [
      { name: "sunset" }, { name: "midnight" }, { name: "pastel-spring" },
      { name: "neon-tokyo" }, { name: "earth-tones" }, { name: "mono-noir" },
    ],
    emptyHint: "Extraia uma paleta de uma imagem ou crie do zero.",
  },
  efeitos: {
    title: "Efeitos",
    newLabel: "Novo efeito",
    tabs: ["Em destaque", "Meus efeitos", "Luz", "Textura", "Filme", "Glitch", "Bokeh"],
    type: "style",
    seeds: [
      { name: "film-grain" }, { name: "bokeh" }, { name: "lens-flare" },
      { name: "glitch" }, { name: "long-exposure" }, { name: "vhs" },
    ],
    emptyHint: "Combine efeitos para dar acabamento à imagem.",
  },
  camera: {
    title: "Câmera",
    newLabel: "Novo preset",
    tabs: ["Em destaque", "Meus presets", "Lente", "Ângulo", "Movimento", "Profundidade"],
    type: "scene",
    seeds: [
      { name: "35mm" }, { name: "85mm-portrait" }, { name: "wide-16mm" },
      { name: "low-angle" }, { name: "drone-top" }, { name: "dolly-in" },
    ],
    emptyHint: "Defina lente, ângulo e movimento de câmera.",
  },
};

export function LibraryPage({
  open,
  defaultCategory = "estilo",
  initialQuery = "",
  items,
  onClose,
  onPick,
  onUploadFile,
  showToast,
}: Props) {
  const [category, setCategory] = useState<Category>(defaultCategory);
  const cfg = CATEGORY_CONFIG[category];
  const [tab, setTab] = useState<string>(cfg.tabs[0]);
  const [search, setSearch] = useState(initialQuery);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset tab quando trocar categoria
  useEffect(() => {
    setTab(CATEGORY_CONFIG[category].tabs[0]);
  }, [category]);

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      setSearch(initialQuery);
    }
  }, [open, defaultCategory, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const syncViewport = () => {
      setCompactViewport(window.innerHeight <= 760 || window.innerWidth <= 1240);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, [open]);

  // Esc fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const t = CATEGORY_CONFIG[category].type;
    let pool = items;
    if (t !== "all") pool = pool.filter((i) => i.type === t);
    // injetar seeds da categoria se vazio
    if (pool.length === 0) {
      pool = CATEGORY_CONFIG[category].seeds.map((s, i) => ({
        id: `seed-${category}-${i}`,
        type: t === "all" ? "style" : t,
        name: s.name,
      })) as MentionItem[];
    }
    const q = search.trim().toLowerCase();
    if (q) pool = pool.filter((i) => i.name.toLowerCase().includes(q));
    return pool;
  }, [items, category, search]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const valid = files.filter((f) => f.type.startsWith("image/"));
      if (!valid.length) return;
      setUploading(true);
      for (const f of valid) {
        const url = await onUploadFile(f);
        if (url) {
          onPick({
            id: `upload-${Date.now()}`,
            type: "image",
            name: f.name.replace(/\.[^.]+$/, ""),
            avatarSrc: url,
          });
        }
      }
      setUploading(false);
    },
    [onUploadFile, onPick]
  );

  const [selected, setSelected] = useState<MentionItem | null>(null);
  useEffect(() => { if (!open) setSelected(null); }, [open]);

  if (!open) return null;

  const titleByCat: Record<Category, string> = {
    estilo: CATEGORY_CONFIG.estilo.title,
    personagem: CATEGORY_CONFIG.personagem.title,
    elemento: CATEGORY_CONFIG.elemento.title,
    cor: CATEGORY_CONFIG.cor.title,
    efeitos: CATEGORY_CONFIG.efeitos.title,
    camera: CATEGORY_CONFIG.camera.title,
    stock: CATEGORY_CONFIG.stock.title,
  };

  const handleApply = () => {
    if (!selected) return;
    onPick(selected);
    onClose();
  };

  const trendingItems = filtered.slice(0, compactViewport ? 2 : 3);
  const recommendedItems = filtered.slice(compactViewport ? 2 : 3, compactViewport ? 4 : 7);

  return (
    <div
      className="style-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={"style-modal" + (compactViewport ? " compact" : "")}>
        {/* TOPBAR */}
        <div className="modal-topbar">
          <div className="topbar-left">
            <span className="topbar-icon">
              <Icon d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
            </span>
            <div className="topbar-title">
              <span className="topbar-eyebrow">REFINE · BIBLIOTECA</span>
              <span className="topbar-text">{titleByCat[category]}</span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn close" onClick={onClose} aria-label="Fechar">
              <Icon d="M6 6l12 12M6 18L18 6" strokeWidth={2.2} />
              <span className="kbd">Esc</span>
            </button>
          </div>
        </div>

      {/* SIDEBAR */}
      <aside className="library-sidebar">
        <div className="lib-side-section">
          <div className="lib-side-eyebrow">PROJETO</div>
          <button className="lib-side-item project">
            <span className="project-color" style={{ background: "linear-gradient(135deg, #ff6a1a, #ff3d00)" }} />
            <span className="project-name">Projeto pessoal</span>
            <Icon d="M8 9l4 4 4-4" />
          </button>
        </div>

        {SIDE_GROUPS.map((group) => (
          <div className="lib-side-section" key={group.eyebrow}>
            <div className="lib-side-eyebrow">{group.eyebrow}</div>
            {group.items.map((it) => (
              <button
                key={it.id}
                className={"lib-side-item" + (category === it.id ? " active" : "")}
                onClick={() => setCategory(it.id)}
              >
                <Icon d={it.icon} />
                <span>{it.label}</span>
                {it.pin && (
                  <span className="pin">
                    <Icon d="M12 2v6 M9 8h6l-1 6H10z M12 14v8" />
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* MAIN */}
      <main className="library-main">
        <div className="lib-search-bar">
          <Icon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3" />
          <input
            autoFocus
            placeholder={`Buscar em ${titleByCat[category].toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="kbd">⌘K</span>
        </div>

        <div className="lib-content-header">
          <div className="lib-header-row">
            <h2 className="lib-title">{cfg.title}</h2>
            <button
              className="lib-new-btn"
              onClick={() => showToast(`${cfg.newLabel} — em breve`)}
            >
              <Icon d="M12 5v14M5 12h14" />
              {cfg.newLabel}
            </button>
          </div>
          <div className="lib-tabs">
            {cfg.tabs.map((t, i) => (
              <button
                key={t}
                className={"lib-tab" + (tab === t ? " active" : "")}
                onClick={() => setTab(t)}
              >
                {i === 0 && <Icon d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />}
                {i === 1 && <Icon d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 20a8 8 0 0 1 16 0" />}
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="lib-grid">
          <button className="lib-card lib-card-all" onClick={() => setSearch("")}>
            <div className="card-thumb">
              <Icon d="M3 12h4l3-9 4 18 3-9h4" />
            </div>
            <span className="card-name">Todos</span>
          </button>

          {filtered.length === 0 && (
            <div className="lib-grid-empty">
              <Icon d="M4 6h16v12H4z M4 10h16" />
              <strong>Nada por aqui ainda</strong>
              <span>Faça upload no painel à direita ou crie um novo {titleByCat[category].toLowerCase()}.</span>
            </div>
          )}

          {filtered.map((it, idx) => {
            const isSel = selected && selected.type === it.type && selected.id === it.id;
            const styleIdx = (it.name.charCodeAt(0) + idx) % 6;
            const letter = (it.name || "?").trim().charAt(0).toUpperCase();
            return (
              <button
                key={`${it.type}:${it.id}`}
                className={"lib-card style-card" + (isSel ? " selected" : "")}
                onClick={() => setSelected(it)}
                onDoubleClick={() => { onPick(it); onClose(); }}
              >
                <div className="card-thumb" data-style={String(styleIdx)}>
                  {it.avatarSrc ? (
                    <img src={it.avatarSrc} alt={it.name} />
                  ) : (
                    <span className="card-letter">{letter}</span>
                  )}
                </div>
                <span className="card-name">#{it.name}</span>
              </button>
            );
          })}
        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="library-rightpanel modal-rightpanel">
        {!selected ? (
            <div
              className={"rightpanel-stack" + (compactViewport ? " compact" : "")}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length) handleFiles(files);
            }}
          >
            {/* EM ALTA */}
            <div className="rp-block">
              <div className="rp-block-header">
                <div className="rp-block-title">
                  <Icon d="M3 17l6-6 4 4 8-8 M14 7h7v7" />
                  Em alta
                </div>
                <span className="rp-period">7 dias</span>
              </div>
              {trendingItems.map((it, i) => {
                const styleIdx = (it.name.charCodeAt(0) + i) % 6;
                return (
                  <button key={`tr-${it.id}`} className="trending-item" onClick={() => setSelected(it)}>
                    <span className="trending-rank">{String(i + 1).padStart(2, "0")}</span>
                    <span className="trending-thumb" data-style={String(styleIdx)} />
                    <span className="trending-info">
                      <span className="trending-name">#{it.name}</span>
                      <span className="trending-uses">+{(1200 - i * 240)} usos</span>
                    </span>
                    <span className="trending-trend">+{24 - i * 6}%</span>
                  </button>
                );
              })}
            </div>

            {/* PRA VOCÊ */}
            <div className="rp-block">
              <div className="rp-block-header">
                <div className="rp-block-title">
                  <Icon d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
                  Pra você
                </div>
                <span className="rp-tag">IA</span>
              </div>
              <div className="rp-block-sub">Baseado nas últimas gerações</div>
              <div className="rec-grid">
                {recommendedItems.map((it, i) => {
                  const styleIdx = (it.name.charCodeAt(0) + i + 2) % 6;
                  return (
                    <button key={`rec-${it.id}`} className="rec-card" onClick={() => setSelected(it)}>
                      <span className="rec-thumb" data-style={String(styleIdx)} />
                      <span className="rec-name">#{it.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ATALHOS */}
            <div className="rp-block">
              <div className="rp-block-header">
                <div className="rp-block-title">
                  <Icon d="M13 2L3 14h7l-1 8 10-12h-7z" />
                  Atalhos
                </div>
              </div>
              <button className="shortcut-item" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <span className="shortcut-icon"><Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></span>
                <span className="shortcut-label">{uploading ? "Enviando…" : "Upload do PC"}</span>
                <span className="kbd">⌘U</span>
              </button>
              <button className="shortcut-item" onClick={() => showToast("Câmera ainda não disponível")}>
                <span className="shortcut-icon"><Icon d="M3 7h4l2-3h6l2 3h4v12H3z M12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" /></span>
                <span className="shortcut-label">Tirar foto</span>
              </button>
              <button className="shortcut-item" onClick={() => showToast("URL externa em breve")}>
                <span className="shortcut-icon"><Icon d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></span>
                <span className="shortcut-label">URL externa</span>
              </button>
              <button className="shortcut-item" onClick={() => showToast("Criação com IA em breve")}>
                <span className="shortcut-icon"><Icon d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" /></span>
                <span className="shortcut-label">Criar com IA</span>
                <span className="badge-new">NOVO</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rightpanel-selected">
            <div className="selected-preview">
              {selected.avatarSrc ? (
                <img src={selected.avatarSrc} alt={selected.name} />
              ) : (
                <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-3)" }}>
                  <Icon d="M4 4h16v16H4z M4 16l4-4 4 4 4-4 4 4" />
                </div>
              )}
            </div>
            <div className="selected-info">
              <span className="selected-eyebrow">{titleByCat[category]} selecionado</span>
              <h3 className="selected-name">#{selected.name}</h3>
            </div>
            <div className="selected-meta">
              <div className="meta-item">
                <span className="meta-label">Tipo</span>
                <span className="meta-value">{selected.type}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">ID</span>
                <span className="meta-value mono">{String(selected.id).slice(0, 8)}</span>
              </div>
            </div>
            <div className="selected-actions">
              <button className="btn-primary" onClick={handleApply}>
                <Icon d="M5 12l5 5L20 7" strokeWidth={2.2} />
                Aplicar {category === "personagem" ? "personagem" : "estilo"}
              </button>
              <button className="btn-ghost" onClick={() => setSelected(null)}>Remover</button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) handleFiles(files);
            if (e.currentTarget) e.currentTarget.value = "";
          }}
        />
      </aside>
      </div>
    </div>
  );
}
