/**
 * PromptInput — contenteditable com sistema de @ menção.
 * - Detecta `@query` no cursor e abre dropdown ancorado.
 * - Filtra por prefixo de categoria (img, p, s, product, scene, logo).
 * - Selecionar transforma `@query` em chip visual inline (contentEditable=false).
 * - Navegação por ↑ ↓ ↵ Esc; ⌘↵ dispara onSubmit.
 * - extractData() devolve { text, references } para envio à API.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon";

export type MentionType = "image" | "character" | "style" | "product" | "scene" | "logo";
export type MentionItem = {
  id: string;
  type: MentionType;
  name: string;
  avatarSrc?: string;
};

export type PromptInputHandle = {
  /** Texto puro com `@nome` no lugar dos chips. */
  extractData: () => { text: string; references: { id: string; type: MentionType; name: string; position: number }[] };
  focus: () => void;
  clear: () => void;
};

type Props = {
  value: string;
  placeholder?: string;
  items: MentionItem[];
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onMentionSelected?: (item: MentionItem) => void;
  onCreateNew?: (query: string) => void;
  onSeeAll?: (category: MentionType | "all", query: string) => void;
};

const TYPE_LABEL: Record<MentionType, string> = {
  image: "imagem",
  character: "personagem",
  style: "estilo",
  product: "produto",
  scene: "cena",
  logo: "logo",
};

const TYPE_ICON: Record<MentionType, string> = {
  image: "M4 4h16v16H4z M4 16l4-4 4 4 4-4 4 4",
  character: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 20a8 8 0 0 1 16 0",
  style: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12a2 2 0 1 1 0-.01 M16 12a2 2 0 1 1 0-.01 M12 16a2 2 0 1 1 0-.01",
  product: "M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7",
  scene: "M3 18l5-6 4 4 4-5 5 7 M3 21h18 M7 9a2 2 0 1 1 0-.01",
  logo: "M4 4h16v16H4z M9 9h6v6H9z",
};

function detectCategoryFromQuery(q: string): { type: MentionType | "all"; rest: string } {
  const lower = q.toLowerCase();
  if (lower.startsWith("img")) return { type: "image", rest: lower.slice(3) };
  if (lower === "p" || lower.startsWith("personagem") || lower.startsWith("char")) {
    return { type: "character", rest: lower.replace(/^(personagem|char|p)/, "") };
  }
  if (lower === "s" || lower.startsWith("style") || lower.startsWith("estilo")) {
    return { type: "style", rest: lower.replace(/^(style|estilo|s)/, "") };
  }
  if (lower.startsWith("product") || lower.startsWith("produto")) {
    return { type: "product", rest: lower.replace(/^(product|produto)/, "") };
  }
  if (lower.startsWith("scene") || lower.startsWith("cena")) {
    return { type: "scene", rest: lower.replace(/^(scene|cena)/, "") };
  }
  if (lower.startsWith("logo")) return { type: "logo", rest: lower.slice(4) };
  return { type: "all", rest: lower };
}

export const PromptInput = forwardRef<PromptInputHandle, Props>(function PromptInput(
  { value, placeholder, items, onChangeText, onSubmit, onMentionSelected, onCreateNew, onSeeAll },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mentionRangeRef = useRef<{ node: Node; start: number; end: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; placement: "below" | "above" }>({ top: 0, left: 0, placement: "below" });

  // Sincroniza valor externo (somente quando vazio) — evita reset do contenteditable
  useEffect(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.textContent || "";
    if (value === "" && current !== "") {
      editorRef.current.innerHTML = "";
    }
  }, [value]);

  // Filtragem
  const filtered = useMemo(() => {
    const { type, rest } = detectCategoryFromQuery(query);
    let pool = items;
    if (type !== "all") pool = pool.filter((i) => i.type === type);
    if (rest) pool = pool.filter((i) => i.name.toLowerCase().includes(rest));
    return pool.slice(0, 30);
  }, [items, query]);

  const detectedCategory = useMemo(() => detectCategoryFromQuery(query), [query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  /** Reposiciona o dropdown próximo ao cursor, com clamp/flip à viewport. */
  const positionDropdown = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0).cloneRange();
    const rect = range.getBoundingClientRect();
    const pad = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Largura: usa medida real se já montado, senão default 280
    const el = dropdownRef.current;
    const measuredW = el?.offsetWidth || 280;
    const measuredH = el?.offsetHeight || 360;
    const W = Math.min(measuredW, vw - pad * 2);
    const H = Math.min(measuredH, vh - pad * 2);

    // Horizontal: tenta alinhar à esquerda do cursor; se vazar, alinha à direita; se ainda vaza, clampa.
    let left = rect.left;
    if (left + W > vw - pad) left = rect.right - W;
    if (left < pad) left = pad;
    if (left + W > vw - pad) left = vw - W - pad;

    // Vertical: abaixo, senão acima, senão clampa.
    let top = rect.bottom + 6;
    let placement: "below" | "above" = "below";
    if (top + H > vh - pad) {
      const above = rect.top - H - 6;
      if (above >= pad) {
        top = above;
        placement = "above";
      } else {
        top = Math.max(pad, vh - H - pad);
      }
    }
    setPos({ top, left, placement });
  }, []);

  /** Detecta `@query` antes do cursor e abre/atualiza dropdown. */
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChangeText(editorRef.current.textContent || "");
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setOpen(false);
      return;
    }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      setOpen(false);
      return;
    }
    const before = (node.textContent || "").slice(0, range.startOffset);
    const m = before.match(/(?:^|\s)@([\w-]*)$/);
    if (m) {
      const matchLen = m[0].startsWith(" ") ? m[0].length - 1 : m[0].length;
      mentionRangeRef.current = {
        node,
        start: range.startOffset - matchLen,
        end: range.startOffset,
      };
      setQuery(m[1]);
      setOpen(true);
      requestAnimationFrame(positionDropdown);
    } else {
      setOpen(false);
      mentionRangeRef.current = null;
    }
  }, [onChangeText, positionDropdown]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    mentionRangeRef.current = null;
  }, []);

  /** Insere chip no DOM no lugar de @query, posiciona cursor depois. */
  const insertChip = useCallback(
    (item: MentionItem) => {
      const mr = mentionRangeRef.current;
      if (!mr || !editorRef.current) return;

      const range = document.createRange();
      try {
        range.setStart(mr.node, mr.start);
        range.setEnd(mr.node, mr.end);
      } catch {
        return;
      }
      range.deleteContents();

      const chip = document.createElement("span");
      chip.className = "mention-chip";
      chip.contentEditable = "false";
      chip.dataset.type = item.type;
      chip.dataset.id = item.id;
      chip.dataset.name = item.name;
      chip.setAttribute("data-mention", "true");
      chip.title = `${TYPE_LABEL[item.type]}: ${item.name}`;

      const iconWrap = document.createElement("span");
      iconWrap.className = "chip-icon" + (item.type === "character" ? " circle" : "");
      if (item.avatarSrc) {
        const img = document.createElement("img");
        img.src = item.avatarSrc;
        img.alt = "";
        iconWrap.appendChild(img);
      } else {
        iconWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${TYPE_ICON[item.type]}"/></svg>`;
      }
      chip.appendChild(iconWrap);
      const prefix = document.createElement("span");
      prefix.className = "chip-prefix";
      prefix.textContent = "@";
      chip.appendChild(prefix);
      chip.appendChild(document.createTextNode(item.name));

      range.insertNode(chip);

      const space = document.createTextNode("\u00A0");
      chip.after(space);

      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);

      onChangeText(editorRef.current.textContent || "");
      onMentionSelected?.(item);
      closeDropdown();
      editorRef.current.focus();
    },
    [closeDropdown, onChangeText, onMentionSelected]
  );

  /** Teclado: dropdown vs ⌘↵ submit. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (open) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIdx((i) => (i + 1) % Math.max(1, filtered.length));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIdx((i) => (i - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length));
          return;
        }
        if (e.key === "Enter") {
          if (filtered.length) {
            e.preventDefault();
            insertChip(filtered[activeIdx]);
            return;
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeDropdown();
          return;
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit?.();
      }
    },
    [open, filtered, activeIdx, insertChip, closeDropdown, onSubmit]
  );

  // Click fora fecha
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        editorRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      closeDropdown();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, closeDropdown]);

  // Recalcula posição em scroll/resize
  useLayoutEffect(() => {
    if (!open) return;
    const f = () => positionDropdown();
    // Reposiciona após o dropdown ter dimensões reais
    requestAnimationFrame(f);
    window.addEventListener("scroll", f, true);
    window.addEventListener("resize", f);
    return () => {
      window.removeEventListener("scroll", f, true);
      window.removeEventListener("resize", f);
    };
  }, [open, filtered.length, positionDropdown]);

  // Expose API
  useImperativeHandle(
    ref,
    () => ({
      focus: () => editorRef.current?.focus(),
      clear: () => {
        if (editorRef.current) editorRef.current.innerHTML = "";
        onChangeText("");
      },
      extractData: () => {
        if (!editorRef.current) return { text: "", references: [] };
        const clone = editorRef.current.cloneNode(true) as HTMLElement;
        const refs: { id: string; type: MentionType; name: string; position: number }[] = [];
        clone.querySelectorAll(".mention-chip").forEach((chip, idx) => {
          const id = (chip as HTMLElement).dataset.id || "";
          const type = ((chip as HTMLElement).dataset.type || "image") as MentionType;
          const name = (chip as HTMLElement).dataset.name || chip.textContent?.replace(/^@/, "") || "";
          refs.push({ id, type, name, position: idx });
          chip.replaceWith(document.createTextNode(`@${name}`));
        });
        return { text: (clone.textContent || "").trim(), references: refs };
      },
    }),
    [onChangeText]
  );

  return (
    <>
      <div
        ref={editorRef}
        className="prompt-input"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder || "Ex: cena cinematográfica com @img1 no estilo @cinematic…"}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // não fecha aqui — onDoc handler trata
        }}
      />

      {open && (
        <div
          ref={dropdownRef}
          className="mention-dropdown"
          data-open="true"
          data-placement={pos.placement}
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="mention-header">
            <span className="mention-prefix">@</span>
            <span className="mention-query">{query || ""}</span>
            <span className="mention-hint">
              {detectedCategory.type === "all"
                ? "todas as referências"
                : `selecionar ${TYPE_LABEL[detectedCategory.type as MentionType]}`}
            </span>
          </div>

          {filtered.length > 0 ? (
            <div className="mention-list" role="listbox">
              {filtered.map((it, i) => (
                <button
                  key={`${it.type}:${it.id}`}
                  type="button"
                  className={"mention-item" + (i === activeIdx ? " active" : "")}
                  data-id={it.id}
                  data-type={it.type}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertChip(it);
                  }}
                >
                  <span className={"mention-avatar " + (it.type === "character" ? "circle" : "square")}>
                    {it.avatarSrc ? (
                      <img src={it.avatarSrc} alt="" />
                    ) : (
                      <Icon d={TYPE_ICON[it.type]} />
                    )}
                  </span>
                  <span className="mention-info">
                    <span className="mention-name">{it.name}</span>
                  </span>
                  <span className="mention-type-icon" title={TYPE_LABEL[it.type]}>
                    <Icon d={TYPE_ICON[it.type]} />
                  </span>
                </button>
              ))}
              {detectedCategory.type !== "all" && (
                <button
                  type="button"
                  className="mention-item see-all"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSeeAll?.(detectedCategory.type as MentionType, detectedCategory.rest);
                    closeDropdown();
                  }}
                >
                  <span className="mention-avatar square" style={{ background: "rgba(255,106,26,0.12)" }}>
                    <Icon d="M4 6h16v12H4z M4 10h16" />
                  </span>
                  <span className="mention-info">
                    <span className="mention-name" style={{ color: "var(--accent-2)" }}>
                      Ver todos em Biblioteca
                    </span>
                  </span>
                  <Icon d="M5 12h14M13 5l7 7-7 7" />
                </button>
              )}
            </div>
          ) : (
            <div className="mention-empty">
              <Icon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3" />
              <span>
                Nada encontrado para <strong>@{query || "…"}</strong>
              </span>
              {onCreateNew && (
                <button
                  type="button"
                  className="mention-create-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onCreateNew(query);
                    closeDropdown();
                  }}
                >
                  + Criar novo
                </button>
              )}
            </div>
          )}

          <div className="mention-footer">
            <span>
              <span className="kbd">↑↓</span>Navegar
            </span>
            <span>
              <span className="kbd">↵</span>Selecionar
            </span>
            <span>
              <span className="kbd">Esc</span>Fechar
            </span>
          </div>
        </div>
      )}
    </>
  );
});
