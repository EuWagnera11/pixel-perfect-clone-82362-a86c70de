import { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon";
import { MODEL_LABEL_TO_ID, ASPECT_RATIOS, type AspectRatio } from "../lib/models";

type DockProps = {
  prompt: string;
  onPromptChange: (s: string) => void;
  modelLabel: string;
  onModelChange: (s: string) => void;
  ratio: AspectRatio;
  onRatioChange: (r: AspectRatio) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  costLabel?: string;
  placeholder?: string;
  /** Disparado quando o usuário escolhe um arquivo no botão de anexo (+). */
  onAttach?: (file: File) => void;
  /** Marca o botão de anexo como ativo (já tem imagem). */
  hasAttachment?: boolean;
  /** Indica que a aba atual exige imagem — destaca o botão de anexo. */
  attachmentRequired?: boolean;
};

const QUALITIES = ["1K", "2K", "4K"];
const VARIATIONS = [1, 2, 4];

export function Dock({
  prompt,
  onPromptChange,
  modelLabel,
  onModelChange,
  ratio,
  onRatioChange,
  isGenerating,
  onGenerate,
  costLabel = "180 cr",
  placeholder = "Descreva o que você quer gerar…",
  onAttach,
  hasAttachment = false,
  attachmentRequired = false,
}: DockProps) {
  const [open, setOpen] = useState<"model" | "ratio" | "quality" | "variations" | "style" | null>(null);
  const [quality, setQuality] = useState("1K");
  const [variations, setVariations] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refs = {
    model: useRef<HTMLButtonElement>(null),
    ratio: useRef<HTMLButtonElement>(null),
    quality: useRef<HTMLButtonElement>(null),
    variations: useRef<HTMLButtonElement>(null),
    style: useRef<HTMLButtonElement>(null),
  };

  useEffect(() => {
    if (!open) return;
    const close = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (Object.values(refs).some((r) => r.current?.contains(target))) return;
      const pop = document.getElementById("__refine_popover");
      if (pop && !pop.contains(target)) setOpen(null);
    };
    setTimeout(() => document.addEventListener("click", close, true), 50);
    return () => document.removeEventListener("click", close, true);
  }, [open]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <>
      <div className="dock">
        <div className="dock-inner">
          <div className="dock-core">
            <div className="dock-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && onAttach) onAttach(f);
                  if (e.currentTarget) e.currentTarget.value = "";
                }}
              />
              <button
                className={"attach" + (hasAttachment ? " has-attachment" : "") + (attachmentRequired && !hasAttachment ? " required" : "")}
                onClick={() => fileInputRef.current?.click()}
                title={hasAttachment ? "Imagem anexada — clique para trocar" : attachmentRequired ? "Anexe uma imagem (obrigatório)" : "Anexar imagem"}
                style={hasAttachment ? { background: "rgba(255,180,90,.18)", borderColor: "rgba(255,180,90,.5)" } : undefined}
              >
                <Icon d={hasAttachment ? "M5 12l5 5L20 7" : "M12 5v14M5 12h14"} />
              </button>
              <textarea
                className="prompt-input"
                placeholder={placeholder}
                rows={1}
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={onKey}
              />
              <button
                className={"generate" + (isGenerating ? " loading" : "")}
                onClick={onGenerate}
                disabled={isGenerating}
              >
                <Icon d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" strokeWidth={2} />
                <span className="gen-label">{isGenerating ? "Gerando…" : "Gerar"}</span>
                <span className="cost">{costLabel}</span>
              </button>
            </div>
            <div className="dock-tools">
              <button
                ref={refs.model}
                className="dock-chip model"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(open === "model" ? null : "model");
                }}
              >
                <span className="g"></span>
                <span>{modelLabel}</span>
                <Icon d="m6 9 6 6 6-6" />
              </button>
              <button
                ref={refs.ratio}
                className="dock-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(open === "ratio" ? null : "ratio");
                }}
              >
                <Icon d="M4 6h16v12H4z" />
                <span>{ratio}</span>
              </button>
              <button
                ref={refs.quality}
                className="dock-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(open === "quality" ? null : "quality");
                }}
              >
                <Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" />
                <span>Qualidade · {quality}</span>
              </button>
              <button
                ref={refs.variations}
                className="dock-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(open === "variations" ? null : "variations");
                }}
              >
                <Icon d="M3 3h7v7H3z M14 3h7v7h-7z" />
                <span>{variations} variação{variations > 1 ? "ões" : ""}</span>
              </button>
              <button
                ref={refs.style}
                className="dock-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(open === "style" ? null : "style");
                }}
              >
                <Icon d="M3 12h18" />
                <span>Estilo</span>
              </button>
              <span style={{ flex: 1 }}></span>
              <span className="dock-chip kbd">Ctrl + Enter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Popovers */}
      {open === "model" && refs.model.current && (
        <Popover anchor={refs.model.current}>
          {Object.keys(MODEL_LABEL_TO_ID).map((label) => (
            <PopItem
              key={label}
              active={label === modelLabel}
              onClick={() => {
                onModelChange(label);
                setOpen(null);
              }}
            >
              {label}
            </PopItem>
          ))}
        </Popover>
      )}
      {open === "ratio" && refs.ratio.current && (
        <Popover anchor={refs.ratio.current}>
          {ASPECT_RATIOS.map((r) => (
            <PopItem
              key={r}
              active={r === ratio}
              onClick={() => {
                onRatioChange(r);
                setOpen(null);
              }}
            >
              {r}
            </PopItem>
          ))}
        </Popover>
      )}
      {open === "quality" && refs.quality.current && (
        <Popover anchor={refs.quality.current}>
          {QUALITIES.map((q) => (
            <PopItem key={q} active={q === quality} onClick={() => { setQuality(q); setOpen(null); }}>
              {q}
            </PopItem>
          ))}
        </Popover>
      )}
      {open === "variations" && refs.variations.current && (
        <Popover anchor={refs.variations.current}>
          {VARIATIONS.map((n) => (
            <PopItem key={n} active={n === variations} onClick={() => { setVariations(n); setOpen(null); }}>
              {n} variação{n > 1 ? "ões" : ""}
            </PopItem>
          ))}
        </Popover>
      )}
      {open === "style" && refs.style.current && (
        <Popover anchor={refs.style.current}>
          <PopItem onClick={() => setOpen(null)}>(em breve)</PopItem>
        </Popover>
      )}
    </>
  );
}

function Popover({ anchor, children }: { anchor: HTMLElement; children: React.ReactNode }) {
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

function PopItem({
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 10px",
        borderRadius: 8,
        background: active ? "rgba(255,106,26,.10)" : "transparent",
        border: 0,
        color: active ? "#ff8a3d" : "#f6f6f8",
        fontSize: 12,
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = active ? "rgba(255,106,26,.10)" : "transparent")
      }
    >
      {children}
    </button>
  );
}
