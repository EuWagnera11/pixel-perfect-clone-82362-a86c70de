/**
 * ReferencesPanel — sistema de referências premium "refine.".
 * - Upload, drag-global, paste (Ctrl+V), URL, biblioteca (placeholder).
 * - Limite dinâmico por modelo (MODEL_REF_LIMITS).
 * - Slots vazios + preenchidos com hover actions e badge da fonte.
 * - Paleta restrita: preto + cinza + laranja.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

export type RefSource = "upload" | "drop" | "paste" | "url" | "library";
export type RefItem = { url: string; source: RefSource; name?: string; mention?: string };

export const MODEL_REF_LIMITS: Record<string, number> = {
  "nano-banana-pro": 8,
  "nano-banana-pro-flash": 4,
  "imagen4-ultra": 6,
  "imagen4-fast": 4,
  "flux-pro-1-1": 4,
  "flux-kontext-pro": 8,
  "flux-2-klein": 2,
  "flux-2-pro": 6,
  "flux-2-turbo": 4,
  "flux-dev": 4,
  "seedream-v4": 4,
  "seedream-v4-edit": 8,
  "seedream-v4-5": 4,
  "seedream-v4-5-edit": 8,
  "seedream-v5-lite": 4,
  "seedream-v5-lite-edit": 8,
  "mystic": 6,
  "hyperflux": 6,
  "z-image": 2,
  "runway-t2i": 0,
};

export function getRefLimit(modelId: string): number {
  return MODEL_REF_LIMITS[modelId] ?? 4;
}

type Props = {
  refs: RefItem[];
  onChange: (next: RefItem[]) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  modelId: string;
  modelLabel: string;
  showToast: (m: string) => void;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024;

export function ReferencesPanel({ refs, onChange, onUploadFile, modelId, modelLabel, showToast }: Props) {
  const max = getRefLimit(modelId);
  const disabled = max === 0;
  const isFull = refs.length >= max;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLib, setShowLib] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  // Hint reaparece (4s) sempre que o modelo muda
  useEffect(() => {
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(t);
  }, [modelId]);

  // Trim refs se modelo novo tiver limite menor
  useEffect(() => {
    if (refs.length > max) onChange(refs.slice(0, max));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max]);

  const addFiles = useCallback(async (files: File[], source: RefSource) => {
    if (disabled) { showToast(`${modelLabel} não aceita referências`); return; }
    const slots = max - refs.length;
    if (slots <= 0) { showToast(`Limite de ${max} referências atingido`); return; }
    const valid: File[] = [];
    for (const f of files) {
      if (!ALLOWED.includes(f.type)) { showToast(`${f.name}: tipo não suportado`); continue; }
      if (f.size > MAX_BYTES) { showToast(`${f.name}: maior que 10MB`); continue; }
      valid.push(f);
    }
    const toAdd = valid.slice(0, slots);
    if (valid.length > slots) showToast(`Apenas ${slots} adicionada(s) — limite ${max}`);
    if (!toAdd.length) return;
    setUploading(true);
    const added: RefItem[] = [];
    for (const f of toAdd) {
      const url = await onUploadFile(f);
      if (url) added.push({ url, source, name: f.name });
    }
    setUploading(false);
    if (added.length) onChange([...refs, ...added]);
  }, [refs, max, disabled, modelLabel, onUploadFile, onChange, showToast]);

  // Drag global na janela
  useEffect(() => {
    if (disabled) return;
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      depth++;
      setDragOver(true);
    };
    const onLeave = () => { depth = Math.max(0, depth - 1); if (depth === 0) setDragOver(false); };
    const onOver = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      depth = 0; setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length) addFiles(files, "drop");
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles, disabled]);

  // Paste global
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgs = items.filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter(Boolean) as File[];
      if (!imgs.length) return;
      e.preventDefault();
      addFiles(imgs, "paste");
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, disabled]);

  const removeAt = (i: number) => onChange(refs.filter((_, j) => j !== i));

  const slotCount = Math.max(4, Math.min(max || 4, 8));
  const emptySlots = Math.max(0, slotCount - refs.length);

  const sourceIconPath = (s: RefSource) => {
    if (s === "url") return "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1";
    if (s === "paste") return "M9 4h6v3H9z M6 7h12v13H6z";
    if (s === "library") return "M4 6h16v12H4z M4 10h16";
    if (s === "drop") return "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14";
    return "M12 5v14M5 12h14";
  };

  return (
    <div className={"references-card" + (isFull ? " full" : "") + (disabled ? " disabled" : "")} data-current={refs.length} data-max={max}>
      <div className="references-header">
        <div className="img-ws-panel-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon d="M4 4h16v12H4z M4 16l4-4 4 4 4-4 4 4 M14 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
          Referências
        </div>
        <div className="references-counter">
          <span className="current">{refs.length}</span>
          <span className="separator">/</span>
          <span className="max">{max}</span>
        </div>
      </div>

      <div className={"references-dropzone"} data-state={dragOver ? "dragover" : "idle"}>
        <div className="references-grid">
          {refs.map((r, i) => (
            <div key={i} className="ref-slot filled" title={r.name || r.url}>
              <img src={r.url} alt={r.name || "ref"} />
              <div className="ref-slot-actions">
                <button className="ref-action-btn" title="Ampliar" onClick={() => window.open(r.url, "_blank")}>
                  <Icon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3 M8 11h6 M11 8v6" />
                </button>
                <button className="ref-action-btn remove" title="Remover" onClick={() => removeAt(i)}>
                  <Icon d="M6 6l12 12M6 18L18 6" strokeWidth={2.2} />
                </button>
              </div>
              <div className="ref-slot-source-badge">
                <Icon d={sourceIconPath(r.source)} />
              </div>
              {r.mention && (
                <div className="ref-slot-mention-tag">
                  <Icon d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M21 12a9 9 0 1 1-3.5-7" />
                  <span>{r.mention}</span>
                </div>
              )}
            </div>
          ))}
          {!disabled && Array.from({ length: emptySlots }).map((_, i) => (
            <button
              key={`empty-${i}`}
              className={"ref-slot empty" + (i === 0 && refs.length === 0 ? " primary" : "")}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || isFull}
              aria-label="Adicionar referência"
            >
              <Icon d="M12 5v14M5 12h14" className="ref-add-icon" />
            </button>
          ))}
        </div>

        {dragOver && (
          <div className="dropzone-overlay">
            <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" className="dropzone-icon" />
            <div className="dropzone-text">
              <strong>Solte para adicionar</strong>
              <span>JPG · PNG · WebP até 10MB</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) addFiles(files, "upload");
          if (e.currentTarget) e.currentTarget.value = "";
        }}
      />

      {!disabled && !isFull && (
        <div className="references-toolbar">
          <button className="ref-toolbar-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Icon d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
            <span className="label">{uploading ? "Enviando…" : "Upload"}</span>
          </button>
          <button className="ref-toolbar-btn" onClick={() => setShowLib(true)}>
            <Icon d="M4 6h16v12H4z M4 10h16" />
            <span className="label">Biblioteca</span>
            <span className="kbd">@</span>
          </button>
          <button className="ref-toolbar-btn" onClick={() => setShowUrl(true)}>
            <Icon d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
            <span className="label">URL</span>
          </button>
          <button className="ref-toolbar-btn" onClick={() => showToast("Use Ctrl+V em qualquer lugar")}>
            <Icon d="M9 4h6v3H9z M6 7h12v13H6z" />
            <span className="label">Colar</span>
            <span className="kbd">⌘V</span>
          </button>
        </div>
      )}

      {(hintVisible || isFull || disabled) && (
        <div className="references-hint">
          <Icon d="M12 8v4 M12 16v.01 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
          <span>
            {disabled
              ? `${modelLabel} não aceita referências`
              : isFull
              ? `Limite atingido (${max}). Remova uma para adicionar outra.`
              : `${modelLabel} aceita até ${max} referências`}
          </span>
        </div>
      )}

      {showUrl && (
        <UrlDialog
          onCancel={() => setShowUrl(false)}
          onAdd={(url) => {
            if (!url) return;
            if (refs.length >= max) { showToast(`Limite de ${max}`); return; }
            onChange([...refs, { url, source: "url" }]);
            setShowUrl(false);
          }}
        />
      )}

      {showLib && (
        <LibraryPopover
          onClose={() => setShowLib(false)}
          onPick={(item) => {
            if (refs.length >= max) { showToast(`Limite de ${max}`); return; }
            onChange([...refs, { url: item.url, source: "library", name: item.name, mention: item.mention }]);
            setShowLib(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- URL dialog ---------- */
function UrlDialog({ onCancel, onAdd }: { onCancel: () => void; onAdd: (url: string) => void }) {
  const [v, setV] = useState("");
  const valid = useMemo(() => /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(v.trim()), [v]);
  return (
    <div className="ref-modal-backdrop" onClick={onCancel}>
      <div className="ref-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ref-modal-head">
          <strong>Importar de URL</strong>
          <button onClick={onCancel}><Icon d="M6 6l12 12M6 18L18 6" /></button>
        </div>
        <input
          autoFocus
          className="ref-modal-input"
          placeholder="https://…/imagem.jpg"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && valid) onAdd(v.trim()); }}
        />
        {v && !valid && <p className="ref-modal-hint">URL deve terminar em .jpg, .png, .webp ou .gif</p>}
        <div className="ref-modal-actions">
          <button className="ref-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="ref-btn-primary" disabled={!valid} onClick={() => onAdd(v.trim())}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Library popover (placeholder; integra com assets reais depois) ---------- */
function LibraryPopover({ onClose, onPick }: { onClose: () => void; onPick: (i: { url: string; name: string; mention?: string }) => void }) {
  const [tab, setTab] = useState<"all" | "characters" | "styles" | "uploads">("all");
  const [q, setQ] = useState("");
  const tabs: { id: typeof tab; label: string; icon: string }[] = [
    { id: "all", label: "Todos", icon: "M4 6h16v12H4z" },
    { id: "characters", label: "Personagens", icon: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 20a8 8 0 0 1 16 0" },
    { id: "styles", label: "Estilos", icon: "M3 12h18 M12 3v18" },
    { id: "uploads", label: "Uploads", icon: "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" },
  ];
  return (
    <div className="ref-modal-backdrop" onClick={onClose}>
      <div className="library-popover" onClick={(e) => e.stopPropagation()}>
        <div className="library-search">
          <Icon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3" className="search-icon" />
          <input autoFocus placeholder="Buscar referências…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="kbd">⌘K</span>
        </div>
        <div className="library-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={"lib-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
              <Icon d={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className="library-content">
          <div className="lib-empty">
            <Icon d="M4 6h16v12H4z M4 10h16" />
            <strong>Sua biblioteca está vazia</strong>
            <span>Faça upload de imagens ou crie personagens para reutilizar aqui.</span>
          </div>
        </div>
        <div className="library-footer">
          <div className="lib-shortcuts">
            <span><span className="kbd">↑↓</span>Navegar</span>
            <span><span className="kbd">↵</span>Selecionar</span>
            <span><span className="kbd">Esc</span>Fechar</span>
          </div>
          <button className="lib-upload-btn" onClick={onClose}>
            <Icon d="M12 5v14M5 12h14" />
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
