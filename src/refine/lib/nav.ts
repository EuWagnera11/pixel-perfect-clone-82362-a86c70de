/**
 * Sidebar navigation — ícones Phosphor (variant filled).
 */
import {
  House,
  Compass,
  FolderSimple,
  Image as ImageIcon,
  VideoCamera,
  FilmSlate,
  PencilSimple,
  Waveform,
  ArrowFatUp,
  ShoppingBag,
  Cube,
  CubeFocus,
  FileText,
  StackSimple,
  UserCircle,
  PaperPlaneTilt,
  GridFour,
  type Icon as PhosphorIconType,
} from "@phosphor-icons/react";

export type NavItem = {
  key: string;
  label: string;
  IconComp: PhosphorIconType;
  pill?: string;
  pillCls?: "new" | "beta" | "pro";
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
      { key: "home", label: "Início", IconComp: House },
      { key: "explore", label: "Explorar", IconComp: Compass },
      { key: "projects", label: "Projetos", IconComp: FolderSimple },
    ],
  },
  {
    cap: "Studio",
    items: [
      { key: "image", label: "Image", IconComp: ImageIcon },
      { key: "video", label: "Video", IconComp: VideoCamera },
      { key: "cinema", label: "Cinema", IconComp: FilmSlate },
      { key: "edit", label: "Edit Image", IconComp: PencilSimple },
      { key: "audio", label: "Audio", IconComp: Waveform, pill: "NEW", pillCls: "new" },
      { key: "upscale", label: "Upscale", IconComp: ArrowFatUp },
      { key: "ecommerce", label: "E-commerce", IconComp: ShoppingBag },
      { key: "product", label: "Product Gen", IconComp: Cube, pill: "NEW", pillCls: "new" },
      { key: "r3d", label: "Realistic 3D", IconComp: CubeFocus, pill: "NEW", pillCls: "new" },
      { key: "assets", label: "Assets Gen", IconComp: FileText, pill: "NEW", pillCls: "new" },
      { key: "depth", label: "Depth Map", IconComp: StackSimple, pill: "BETA", pillCls: "beta" },
      { key: "character", label: "Character", IconComp: UserCircle },
    ],
  },
  {
    cap: " ",
    items: [
      { key: "marketing", label: "Marketing", IconComp: PaperPlaneTilt },
      { key: "all", label: "Todas as ferramentas", IconComp: GridFour },
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
