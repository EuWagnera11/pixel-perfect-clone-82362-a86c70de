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

const TABS = ["Em destaque", "Meus estilos", "Tudo", "Foto", "Ilustração", "3D", "Design"];

const CATEGORY_TO_TYPE: Record<Category, MentionType | "all"> = {
  estilo: "style",
  personagem: "character",
  elemento: "product",
  cor: "style",
  efeitos: "style",
  camera: "scene",
  stock: "all",
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
  const [tab, setTab] = useState<string>("Em destaque");
  const [search, setSearch] = useState(initialQuery);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      setSearch(initialQuery);
    }
  }, [open, defaultCategory, initialQuery]);

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
    const t = CATEGORY_TO_TYPE[category];
    let pool = items;
    if (t !== "all") pool = pool.filter((i) => i.type === t);
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
    estilo: "Estilos",
    personagem: "Personagens",
    elemento: "Elementos",
    cor: "Cores",
    efeitos: "Efeitos",
    camera: "Câmera",
    stock: "Histórico",
  };

  const handleApply = () => {
    if (!selected) return;
    onPick(selected);
    onClose();
  };

  return (
    <div
      className="style-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="style-modal">
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
            <h2 className="lib-title">{titleByCat[category]}</h2>
            <button className="lib-new-btn">
              <Icon d="M12 5v14M5 12h14" />
              Novo {category === "personagem" ? "personagem" : "estilo"}
            </button>
          </div>
          <div className="lib-tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className={"lib-tab" + (tab === t ? " active" : "")}
                onClick={() => setTab(t)}
              >
                {t === "Em destaque" && <Icon d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />}
                {t === "Meus estilos" && <Icon d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 20a8 8 0 0 1 16 0" />}
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

          {filtered.map((it) => {
            const isSel = selected && selected.type === it.type && selected.id === it.id;
            return (
              <button
                key={`${it.type}:${it.id}`}
                className={"lib-card style-card" + (isSel ? " selected" : "")}
                onClick={() => setSelected(it)}
                onDoubleClick={() => { onPick(it); onClose(); }}
              >
                <div className="card-thumb">
                  {it.avatarSrc ? (
                    <img src={it.avatarSrc} alt={it.name} />
                  ) : (
                    <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
                      <Icon d="M4 4h16v16H4z M4 16l4-4 4 4 4-4 4 4" />
                    </div>
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
            className={"rightpanel-empty" + (dragOver ? " dragover" : "")}
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
            <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
            <p>Arraste uma imagem ou<br />carregue sua própria mídia</p>
            <div className="rightpanel-actions">
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Icon d="M12 5v14M5 12h14" />
                {uploading ? "Enviando…" : "Carregar mídia"}
              </button>
              <button className="btn-secondary" onClick={() => showToast("Câmera ainda não disponível")}>
                <Icon d="M3 7h4l2-3h6l2 3h4v12H3z M12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                Tirar foto
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
