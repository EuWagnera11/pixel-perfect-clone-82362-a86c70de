/**
 * Sidebar navigation — extraido fielmente do mockup HTML (NAV array).
 * Cada item tem icon path SVG, label, e opcional pill (NEW/BETA/etc).
 */
export type NavItem = {
  key: string;
  label: string;
  ico: string;
  pill?: string;
  pillCls?: "new" | "beta";
};

export type NavGroup = {
  cap?: string;
  items?: NavItem[];
  group?: string;
};

export const NAV: NavGroup[] = [
  {
    cap: "Workspace",
    items: [
      { key: "home", label: "Início", ico: "M3 12 12 3l9 9 M5 10v10h14V10" },
      { key: "explore", label: "Explorar", ico: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z M3 12h18" },
      { key: "projects", label: "Projetos", ico: "M3 7h18M3 12h18M3 17h12" },
    ],
  },
  {
    cap: "Studio",
    items: [
      { key: "image", label: "Image", ico: "M3 3h18v18H3z M9 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M21 15l-5-5L5 21" },
      { key: "video", label: "Video", ico: "M3 5h18v14H3z M10 9l5 3-5 3z" },
      { key: "cinema", label: "Cinema", ico: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 m0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8" },
      { key: "edit", label: "Edit Image", ico: "M9 11l-7 7v4h4l7-7M14 6l4 4" },
      { key: "audio", label: "Audio", ico: "M12 3v18M8 6v12M4 9v6M16 6v12M20 9v6", pill: "NEW", pillCls: "new" },
      { key: "upscale", label: "Upscale", ico: "M12 19V5M5 12l7-7 7 7" },
      { key: "ecommerce", label: "E-commerce", ico: "M3 9h18l-2 11H5z M8 9V6a4 4 0 0 1 8 0v3" },
      { key: "product", label: "Product Gen", ico: "M21 16l-9 5-9-5V8l9-5 9 5z M3.27 6.96 12 12 20.73 6.96 M12 22.08V12", pill: "NEW", pillCls: "new" },
      { key: "r3d", label: "Realistic 3D", ico: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 3a14 14 0 0 1 0 18", pill: "NEW", pillCls: "new" },
      { key: "assets", label: "Assets Gen", ico: "M14 3v6h6 M14 3l6 6v12H4V3z", pill: "NEW", pillCls: "new" },
      { key: "depth", label: "Depth Map", ico: "M3 12h18M3 6h18M3 18h18", pill: "BETA", pillCls: "beta" },
      { key: "character", label: "Character", ico: "M12 9a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zM5 21c0-4 3-7 7-7s7 3 7 7" },
    ],
  },
  {
    cap: " ",
    items: [
      { key: "marketing", label: "Marketing", ico: "M3 11l18-7-7 18-2-7-9-4z" },
      { key: "all", label: "Todas as ferramentas", ico: "M3 3h7v7H3z M14 3h7v7h-7z" },
    ],
  },
];

/** Modelo + ratio default por aba (espelha TAB_CONFIG do mockup). */
export const TAB_CONFIG: Record<string, { model: string; ratio: string; placeholder?: string }> = {
  home:       { model: "Refine",            ratio: "—",    placeholder: "Esta tela é só um hub. Escolha uma ferramenta…" },
  image:      { model: "Nano-Banana Pro",   ratio: "16:9", placeholder: "Descreva a imagem que você quer gerar…" },
  cinema:     { model: "Nano-Banana Pro",   ratio: "21:9", placeholder: "Descreva a cena cinematográfica…" },
  video:      { model: "Kling 3.0",         ratio: "16:9", placeholder: "Descreva o vídeo (até 5s)…" },
  audio:      { model: "Suno V4",           ratio: "—",    placeholder: "Descreva a música/áudio…" },
  edit:       { model: "Nano-Banana Pro",   ratio: "1:1",  placeholder: "Como editar essa imagem…" },
  character:  { model: "Persona Trainer",   ratio: "4:5",  placeholder: "Descreva o personagem…" },
  product:    { model: "Nano-Banana Pro",   ratio: "1:1",  placeholder: "Cena de produto / brief…" },
  r3d:        { model: "Realistic 3D",      ratio: "1:1",  placeholder: "Descreva o personagem 3D…" },
  depth:      { model: "Depth/ControlNet",  ratio: "1:1",  placeholder: "Descreva a cena pra extrair maps…" },
  assets:     { model: "Assets Gen",        ratio: "1:1",  placeholder: "Descreva o asset/prop…" },
  ecommerce:  { model: "E-commerce Pro",    ratio: "1:1",  placeholder: "Descreva o produto/cena…" },
  upscale:    { model: "Magnific",          ratio: "—",    placeholder: "" },
  marketing:  { model: "Refine",            ratio: "1:1",  placeholder: "Briefing da campanha…" },
  all:        { model: "Refine",            ratio: "—",    placeholder: "" },
};
