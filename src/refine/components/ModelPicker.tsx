/**
 * ModelPicker — popover rico para seleção de modelo de imagem.
 * - Busca, agrupamento por família, filtros rápidos, recentes (localStorage)
 * - Badges: Premium / Rápido / Edit
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IMAGE_MODELS, type ImageModel } from "../lib/models";

type Props = {
  value: string; // model label
  onChange: (label: string) => void;
};

const FAMILY_META: Record<ImageModel["family"], { name: string; initial: string }> = {
  "nano-banana": { name: "Nano Banana", initial: "N" },
  imagen:        { name: "Imagen",      initial: "I" },
  flux:          { name: "Flux",        initial: "F" },
  seedream:      { name: "Seedream",    initial: "S" },
  mystic:        { name: "Mystic",      initial: "M" },
  hyperflux:     { name: "Hyperflux",   initial: "H" },
  "z-image":     { name: "Z-Image",     initial: "Z" },
  runway:        { name: "RunWay",      initial: "R" },
};

// Tone do avatar por modelo (paleta restrita: laranja + cinza)
const AVATAR_TONE: Record<string, "premium" | "fast" | "edit" | "standard"> = {
  "nano-banana-pro": "premium",
  "nano-banana-pro-flash": "fast",
  "imagen4-ultra": "premium",
  "imagen4-fast": "fast",
  "flux-pro-1-1": "standard",
  "flux-kontext-pro": "edit",
  "flux-2-klein": "standard",
  "flux-2-pro": "premium",
  "flux-2-turbo": "fast",
  "flux-dev": "standard",
  "seedream-v4": "standard",
  "seedream-v4-edit": "edit",
  "seedream-v4-5": "standard",
  "seedream-v4-5-edit": "edit",
  "seedream-v5-lite": "fast",
  "seedream-v5-lite-edit": "edit",
  mystic: "premium",
  hyperflux: "premium",
  "z-image": "fast",
  "runway-t2i": "standard",
};

const DESCRIPTIONS: Record<string, string> = {
  "nano-banana-pro":       "Foto-realismo premium com Gemini 2.5",
  "nano-banana-pro-flash": "Geração ultra-rápida de alta qualidade",
  "imagen4-ultra":         "Topo de linha do Google para fotorrealismo",
  "imagen4-fast":          "Imagen rápido para iterações",
  "flux-pro-1-1":          "Equilíbrio entre detalhe e velocidade",
  "flux-kontext-pro":      "Edição contextual de imagens existentes",
  "flux-2-klein":          "Flux 2 leve para protótipos",
  "flux-2-pro":            "Flux 2 premium, máxima qualidade",
  "flux-2-turbo":          "Flux 2 acelerado para fluxos rápidos",
  "flux-dev":              "Versão dev do Flux para experimentos",
  "seedream-v4":           "Seedream v4 base, versátil",
  "seedream-v4-edit":      "Edição de imagens com Seedream v4",
  "seedream-v4-5":         "Seedream v4.5 com melhor coerência",
  "seedream-v4-5-edit":    "Edição com Seedream v4.5",
  "seedream-v5-lite":      "Geração rápida com Seedream v5",
  "seedream-v5-lite-edit": "Edição rápida com Seedream v5 Lite",
  mystic:                  "Estilizado, ideal para arte conceitual",
  hyperflux:               "Detalhamento extremo, alto custo",
  "z-image":               "Turbo: prévia em segundos",
  "runway-t2i":            "Text-to-image da RunWay",
};

const EDIT_IDS = new Set(["flux-kontext-pro", "seedream-v4-edit", "seedream-v4-5-edit", "seedream-v5-lite-edit"]);

const RECENTS_KEY = "img-ws:recent-models";

function badgeFor(m: ImageModel): { label: string; tone: "premium" | "fast" | "edit" } | null {
  if (EDIT_IDS.has(m.id)) return { label: "Edit", tone: "edit" };
  if (m.costHint === "Premium") return { label: "Premium", tone: "premium" };
  if (m.costHint === "Rápido") return { label: "Rápido", tone: "fast" };
  return null;
}

export function ModelPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "premium" | "fast" | "edit">("all");
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const select = (label: string) => {
    onChange(label);
    setOpen(false);
    setQuery("");
    const next = [label, ...recents.filter((r) => r !== label)].slice(0, 3);
    setRecents(next);
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch {}
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return IMAGE_MODELS.filter((m) => {
      if (q && !m.label.toLowerCase().includes(q) && !FAMILY_META[m.family].name.toLowerCase().includes(q)) return false;
      const b = badgeFor(m);
      if (filter === "premium" && (!b || b.tone !== "premium")) return false;
      if (filter === "fast" && (!b || b.tone !== "fast")) return false;
      if (filter === "edit" && (!b || b.tone !== "edit")) return false;
      return true;
    });
  }, [query, filter]);

  const grouped = useMemo(() => {
    const order: ImageModel["family"][] = ["nano-banana", "imagen", "flux", "seedream", "mystic", "hyperflux", "z-image", "runway"];
    return order
      .map((fam) => ({ fam, items: filtered.filter((m) => m.family === fam) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const recentItems = useMemo(
    () => recents.map((lbl) => IMAGE_MODELS.find((m) => m.label === lbl)).filter(Boolean) as ImageModel[],
    [recents]
  );

  const renderItem = (m: ImageModel, opts?: { showActive?: boolean }) => {
    const meta = FAMILY_META[m.family];
    const b = badgeFor(m);
    const showActive = opts?.showActive ?? true;
    const active = showActive && m.label === value;
    return (
      <button
        key={m.id}
        className={"mp-item" + (active ? " active" : "")}
        onClick={() => select(m.label)}
        title={`${m.label} · ${DESCRIPTIONS[m.id] || meta.name}`}
      >
        <span className={"mp-avatar mp-avatar--" + (AVATAR_TONE[m.id] || "standard")}>
          {meta.initial}
        </span>
        <span className="mp-item-text">
          <span className="mp-item-name">{m.label}</span>
          <span className="mp-item-desc">{DESCRIPTIONS[m.id] || meta.name}</span>
        </span>
        <span className="mp-trail">
          {b && <span className={"mp-badge mp-badge--" + b.tone}>{b.label}</span>}
          {active && (
            <span className="mp-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="mp-trigger" type="button">
          <span className="mp-trigger-name">{value}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="mp-popover" align="start" sideOffset={6}>
        <div className="mp-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            placeholder="Buscar modelo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mp-filters">
          {([
            ["all", "Todos"],
            ["premium", "Premium"],
            ["fast", "Rápido"],
            ["edit", "Edit"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              className={"mp-filter" + (filter === k ? " active" : "")}
              onClick={() => setFilter(k)}
            >{l}</button>
          ))}
        </div>
        <div className="mp-list">
          {recentItems.length > 0 && filter === "all" && !query && (
            <div className="mp-recent">
              <div className="mp-group-head">Recentes</div>
              {recentItems.map((m) => renderItem(m, { showActive: false }))}
            </div>
          )}
          {grouped.map((g) => (
            <div key={g.fam}>
              <div className="mp-group-head">
                {FAMILY_META[g.fam].name}
                <span className="mp-group-count">{g.items.length}</span>
              </div>
              {g.items.map((m) => renderItem(m))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="mp-empty">Nenhum modelo encontrado</div>
          )}
        </div>
        <div className="mp-footer">
          <div className="mp-shortcuts">
            <span><span className="mp-kbd">↑↓</span>Navegar</span>
            <span><span className="mp-kbd">↵</span>Selecionar</span>
            <span><span className="mp-kbd">Esc</span>Fechar</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
