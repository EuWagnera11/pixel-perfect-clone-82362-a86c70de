import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  Wand2,
  // Criar
  Image as ImageIcon,
  Film,
  Mic,
  Music,
  Volume2,
  // Editar
  Brush,
  Maximize,
  Eraser,
  Pencil,
  Palette,
  Layers,
  ScanLine,
  Droplets,
  // Transformar
  UserCog,
  MountainSnow,
  Shirt,
  Scissors,
  Smile,
  Hourglass,
  Users as UsersIcon,
  // Melhorar
  ArrowUp,
  Sparkle,
  ImageOff,
  Sun,
  Wand,
  // Profissional
  Briefcase,
  Package,
  Building2,
  UtensilsCrossed,
  Newspaper,
  Youtube,
  IdCard,
  Baby,
  Heart,
  Home as HomeIcon,
  Camera,
  AudioLines,
  // Workflow
  HardDrive,
  Brain,
  Repeat,
  Images,
  Clapperboard,
} from "lucide-react";
import { ToolCard, type ToolCardProps } from "@/components/ToolCard";
import { cn } from "@/lib/utils";

type CategoryKey =
  | "all"
  | "criar"
  | "editar"
  | "transformar"
  | "melhorar"
  | "profissional"
  | "workflow";

type Tool = Omit<ToolCardProps, "icon" | "delay"> & {
  icon: ToolCardProps["icon"];
  category: Exclude<CategoryKey, "all">;
  keywords?: string[];
};

const categories: { key: CategoryKey; label: string; description: string }[] = [
  { key: "all", label: "Todas", description: "Todas as ferramentas da Suite" },
  { key: "criar", label: "Criar", description: "Geração do zero — imagens, vídeo, áudio." },
  { key: "editar", label: "Editar", description: "Refine pixels com IA cirúrgica." },
  { key: "transformar", label: "Transformar", description: "Troque rostos, roupas e cenas." },
  { key: "melhorar", label: "Melhorar", description: "Upscale e enhancement de qualidade studio." },
  { key: "profissional", label: "Profissional", description: "Templates editoriais por nicho." },
  { key: "workflow", label: "Workflow", description: "Automações e batch para escala." },
];

const categoryMeta: Record<Exclude<CategoryKey, "all">, { label: string; tone: ToolCardProps["tone"] }> = {
  criar: { label: "Criar", tone: "copper" },
  editar: { label: "Editar", tone: "amber" },
  transformar: { label: "Transformar", tone: "violet" },
  melhorar: { label: "Melhorar", tone: "emerald" },
  profissional: { label: "Profissional", tone: "sky" },
  workflow: { label: "Workflow", tone: "copper" },
};

const tools: Tool[] = [
  // ============ CRIAR ============
  {
    icon: ImageIcon,
    title: "Image Generation",
    description: "Crie imagens fotorrealistas a partir de prompts ou referências.",
    to: "/app/generate",
    category: "criar",
    badge: "Criar",
    tone: "copper",
    keywords: ["imagem", "txt2img", "nano banana"],
  },
  {
    icon: Film,
    title: "Video Generation",
    description: "Transforme stills em vídeos cinematográficos com Kling e Veo.",
    to: "/app/video",
    category: "criar",
    badge: "Criar",
    tone: "copper",
    keywords: ["vídeo", "kling", "veo"],
  },
  {
    icon: Mic,
    title: "Audio TTS",
    description: "Vozes naturais multilíngues para narração e dublagem.",
    to: "/app/audio/tts",
    category: "criar",
    badge: "Criar",
    tone: "copper",
    keywords: ["voz", "narração", "speech"],
  },
  {
    icon: Music,
    title: "Music Generation",
    description: "Trilhas originais por descrição: gênero, mood, BPM.",
    to: "/app/audio/music",
    category: "criar",
    badge: "Criar",
    tone: "copper",
    keywords: ["música", "trilha", "score"],
  },
  {
    icon: Volume2,
    title: "Sound Effects",
    description: "SFX cinematográficos a partir de descrições curtas.",
    to: "/app/audio/sfx",
    category: "criar",
    badge: "Criar",
    tone: "copper",
    keywords: ["sfx", "som", "efeito"],
  },

  // ============ EDITAR ============
  {
    icon: Brush,
    title: "Inpaint",
    description: "Pinte áreas e regenere apenas o que você marcou.",
    to: "/app/edit/inpaint",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["mask", "pintar", "fix"],
  },
  {
    icon: Maximize,
    title: "Outpaint",
    description: "Expanda o canvas mantendo a coerência da cena original.",
    to: "/app/edit/outpaint",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["expand", "canvas"],
  },
  {
    icon: Eraser,
    title: "Remove Object",
    description: "Apague pessoas, objetos ou texto sem deixar rastro.",
    to: "/app/edit/remove",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["apagar", "remover"],
  },
  {
    icon: Pencil,
    title: "Sketch to Image",
    description: "Transforme rabiscos em renders fotográficos detalhados.",
    to: "/app/edit/sketch",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["esboço", "sketch"],
  },
  {
    icon: Palette,
    title: "Style Transfer",
    description: "Aplique a estética de uma referência em outra imagem.",
    to: "/app/edit/style",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["estilo", "referência"],
  },
  {
    icon: Layers,
    title: "Replace Background",
    description: "Troque o fundo preservando luz e perspectiva.",
    to: "/app/edit/background",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["fundo", "background"],
  },
  {
    icon: ScanLine,
    title: "Expand",
    description: "Estenda a imagem em qualquer direção mantendo continuidade.",
    to: "/app/edit/expand",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["expandir", "uncrop"],
  },
  {
    icon: Droplets,
    title: "Colorize",
    description: "Colorize fotos preto e branco com paleta natural.",
    to: "/app/edit/colorize",
    category: "editar",
    badge: "Editar",
    tone: "amber",
    keywords: ["cor", "p&b", "preto branco"],
  },

  // ============ TRANSFORMAR ============
  {
    icon: UserCog,
    title: "Face Swap",
    description: "Troque rostos com identidade preservada, sem AI plastic look.",
    to: "/app/transform/face-swap",
    category: "transformar",
    badge: "Transformar",
    tone: "violet",
    keywords: ["rosto", "face"],
  },
  {
    icon: MountainSnow,
    title: "Scene Swap",
    description: "Mantenha a persona e troque o cenário ao redor.",
    to: "/app/transform/scene-swap",
    category: "transformar",
    badge: "Transformar",
    tone: "violet",
    keywords: ["cenário", "scene"],
  },
  {
    icon: Shirt,
    title: "Cloth Swap",
    description: "Vista qualquer outfit no seu modelo sem refoto.",
    to: "/app/transform/cloth-swap",
    category: "transformar",
    badge: "Transformar",
    tone: "violet",
    keywords: ["roupa", "outfit", "vestir"],
  },
  {
    icon: Scissors,
    title: "Hair Change",
    description: "Mude corte, cor e penteado com precisão de salão.",
    to: "/app/transform/hair",
    category: "transformar",
    badge: "Transformar",
    tone: "violet",
    keywords: ["cabelo", "hair"],
  },
  {
    icon: Smile,
    title: "Expression Change",
    description: "Ajuste sorriso, olhar e emoção sem perder a identidade.",
    to: "/app/transform/expression",
    category: "transformar",
    badge: "Transformar",
    tone: "violet",
    keywords: ["expressão", "sorrir"],
  },
  {
    icon: Hourglass,
    title: "Age Change",
    description: "Envelheça ou rejuvenesça mantendo traços e proporções.",
    to: "/app/transform/age",
    category: "transformar",
    badge: "Transformar",
    tone: "violet",
    keywords: ["idade", "envelhecer"],
  },
  {
    icon: UsersIcon,
    title: "Twin",
    description: "Crie um gêmeo digital consistente da sua persona.",
    to: "/app/transform/twin",
    category: "transformar",
    badge: "Transformar",
    tone: "violet",
    keywords: ["gêmeo", "clone"],
  },

  // ============ MELHORAR ============
  {
    icon: ArrowUp,
    title: "Upscale",
    description: "Magnific Sparkle até 4K mantendo skin natural.",
    to: "/app/enhance/upscale",
    category: "melhorar",
    badge: "Melhorar",
    tone: "emerald",
    keywords: ["magnific", "4k", "ampliar"],
  },
  {
    icon: Sparkle,
    title: "Skin Enhance",
    description: "Pele realista com poros e textura — anti-AI plastic look.",
    to: "/app/enhance/skin",
    category: "melhorar",
    badge: "Melhorar",
    tone: "emerald",
    keywords: ["pele", "skin", "real"],
  },
  {
    icon: ImageOff,
    title: "Background Remove",
    description: "Recorte limpo com bordas precisas e cabelo perfeito.",
    to: "/app/enhance/bg-remove",
    category: "melhorar",
    badge: "Melhorar",
    tone: "emerald",
    keywords: ["fundo", "transparente", "png"],
  },
  {
    icon: Sun,
    title: "Relight",
    description: "Reilumine a cena — golden hour, studio, dramatic, neon.",
    to: "/app/enhance/relight",
    category: "melhorar",
    badge: "Melhorar",
    tone: "emerald",
    keywords: ["luz", "relight", "iluminação"],
  },
  {
    icon: Wand,
    title: "Photo Restoration",
    description: "Restaure fotos antigas, riscadas ou desfocadas.",
    to: "/app/enhance/restore",
    category: "melhorar",
    badge: "Melhorar",
    tone: "emerald",
    keywords: ["restaurar", "antigo", "old"],
  },

  // ============ PROFISSIONAL ============
  {
    icon: Briefcase,
    title: "Headshot Pro",
    description: "LinkedIn-ready em 2 minutos. Luz studio, fundo neutro.",
    to: "/app/pro/headshot",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["linkedin", "corporativo", "headshot"],
  },
  {
    icon: Package,
    title: "E-commerce Product",
    description: "Pack-shots editoriais em qualquer cenário ou modelo.",
    to: "/app/pro/ecommerce",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["produto", "shopify", "loja"],
  },
  {
    icon: Building2,
    title: "Real Estate",
    description: "Imóveis com staging virtual, céu azul e luz dourada.",
    to: "/app/pro/real-estate",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["imóvel", "casa", "staging"],
  },
  {
    icon: UtensilsCrossed,
    title: "Food Photography",
    description: "Pratos com vapor, brilho e composição de revista.",
    to: "/app/pro/food",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["comida", "restaurante", "menu"],
  },
  {
    icon: Newspaper,
    title: "Magazine Cover",
    description: "Capas editoriais com tipografia e art direction prontas.",
    to: "/app/pro/magazine",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["revista", "capa", "editorial"],
  },
  {
    icon: Youtube,
    title: "YouTube Thumbnail",
    description: "Miniaturas que geram CTR — composição comprovada.",
    to: "/app/pro/thumbnail",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["youtube", "thumbnail", "ctr"],
  },
  {
    icon: IdCard,
    title: "Passport Photo",
    description: "Foto 3x4 oficial — fundo branco, luz frontal, padrão ICAO.",
    to: "/app/pro/passport",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["passaporte", "documento", "3x4"],
  },
  {
    icon: Baby,
    title: "Maternity",
    description: "Ensaio gestante editorial com luz suave e props.",
    to: "/app/pro/maternity",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["gestante", "grávida", "maternidade"],
  },
  {
    icon: Heart,
    title: "Wedding",
    description: "Casamento editorial em qualquer destino do mundo.",
    to: "/app/pro/wedding",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["casamento", "noivos", "wedding"],
  },
  {
    icon: HomeIcon,
    title: "Family Portrait",
    description: "Retratos de família coesos, com identidade preservada.",
    to: "/app/pro/family",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["família", "retrato"],
  },
  {
    icon: Camera,
    title: "Multi-View",
    description: "Frente, perfil, costas — grid canônico para fichas.",
    to: "/app/pro/multi-view",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["multiview", "ângulos", "grid"],
  },
  {
    icon: AudioLines,
    title: "Lip Sync",
    description: "Sincronia de lábios precisa em qualquer idioma.",
    to: "/app/pro/lipsync",
    category: "profissional",
    badge: "Profissional",
    tone: "sky",
    keywords: ["lip", "sync", "boca"],
  },

  // ============ WORKFLOW ============
  {
    icon: Clapperboard,
    title: "Content Calendar",
    description: "Gera o mês inteiro em 1 clique. Pack curado ou prompts custom.",
    to: "/app/calendar",
    category: "workflow",
    badge: "Calendar",
    tone: "copper",
    status: "new",
    keywords: ["calendário", "calendar", "mês", "mass", "massa", "30 dias"],
  },
  {
    icon: HardDrive,
    title: "Bulk Import",
    description: "Importe múltiplas imagens via URLs ou upload em lote.",
    to: "/app/drive",
    category: "workflow",
    badge: "Workflow",
    tone: "copper",
    keywords: ["bulk", "import", "lote"],
  },
  {
    icon: Brain,
    title: "Style Learning",
    description: "Aprenda um estilo a partir de 10+ refs e replique em escala.",
    to: "/app/workflow/style-learning",
    category: "workflow",
    badge: "Workflow",
    tone: "copper",
    keywords: ["estilo", "learn", "treino"],
  },
  {
    icon: Repeat,
    title: "Recreate",
    description: "Recrie uma imagem em outro modelo, ângulo ou cenário.",
    to: "/app/workflow/recreate",
    category: "workflow",
    badge: "Workflow",
    tone: "copper",
    keywords: ["recriar", "remix"],
  },
  {
    icon: Images,
    title: "Batch Images",
    description: "Processe centenas de imagens com o mesmo preset.",
    to: "/app/workflow/batch-images",
    category: "workflow",
    badge: "Workflow",
    tone: "copper",
    keywords: ["batch", "lote", "imagens"],
  },
  {
    icon: Clapperboard,
    title: "Batch Videos",
    description: "Vídeos em lote — fila inteligente respeita seu daily cap.",
    to: "/app/workflow/batch-videos",
    category: "workflow",
    badge: "Workflow",
    tone: "copper",
    keywords: ["batch", "lote", "vídeo"],
  },
];

export default function Suite() {
  const [active, setActive] = useState<CategoryKey>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter(t => {
      const matchCat = active === "all" || t.category === active;
      if (!matchCat) return false;
      if (!q) return true;
      const haystack = [
        t.title,
        t.description,
        t.badge ?? "",
        ...(t.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [active, query]);

  const counts = useMemo(() => {
    const map: Record<CategoryKey, number> = {
      all: tools.length,
      criar: 0,
      editar: 0,
      transformar: 0,
      melhorar: 0,
      profissional: 0,
      workflow: 0,
    };
    tools.forEach(t => {
      map[t.category] += 1;
    });
    return map;
  }, []);

  const activeMeta = categories.find(c => c.key === active)!;

  return (
    <div className="container-suite animate-fade-in">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-cinematic">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ background: "var(--gradient-mesh)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: "var(--gradient-glow)" }}
        />

        <div className="relative px-6 py-12 lg:px-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <span className="eyebrow eyebrow-dot mb-4">Refine Suite</span>
            <h1 className="display-2">
              Toda IA criativa, em <span className="text-gradient-copper">um só estúdio</span>.
            </h1>
            <p className="lead mt-4">
              {tools.length} ferramentas profissionais — geração, edição, transformação e workflow.
              Escolha um fluxo abaixo ou pesquise pelo nome.
            </p>

            {/* Search */}
            <div className="mt-7 flex w-full max-w-xl items-center gap-3 rounded-full border border-border-strong bg-surface/80 px-5 py-3 backdrop-blur-md transition-colors focus-within:border-primary/60 focus-within:shadow-glow-soft">
              <Search className="h-4 w-4 text-foreground-muted" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar ferramenta — face swap, upscale, headshot..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-muted"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted hover:text-foreground"
                >
                  limpar
                </button>
              )}
              <kbd className="hidden rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground-muted md:inline">
                {filtered.length} resultados
              </kbd>
            </div>

            {/* Quick stats pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground-dim">
                <Sparkles className="h-3 w-3 text-primary" /> {tools.length} tools
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground-dim">
                <Wand2 className="h-3 w-3 text-primary" /> 7 categorias
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Category tabs ===== */}
      <section className="sticky top-16 z-10 -mx-5 mt-8 px-5 lg:-mx-8 lg:px-8">
        <div className="glass rounded-2xl border-border-strong px-3 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map(c => {
              const isActive = active === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setActive(c.key)}
                  className={cn(
                    "group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "border-primary/50 bg-primary/15 text-primary shadow-glow-soft"
                      : "border-transparent text-foreground-muted hover:border-border-strong hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span>{c.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-3 text-foreground-muted",
                    )}
                  >
                    {counts[c.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Active category description ===== */}
      <div className="mt-8 mb-6 flex items-baseline justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-dot mb-2">{activeMeta.label}</div>
          <p className="text-foreground-dim">{activeMeta.description}</p>
        </div>
        <div className="hidden font-mono text-xs text-foreground-muted sm:block">
          {filtered.length} de {tools.length}
        </div>
      </div>

      {/* ===== Tools grid ===== */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-16 text-center">
          <Search className="mx-auto mb-4 h-8 w-8 text-foreground-muted" />
          <div className="text-base font-semibold">Nenhuma ferramenta encontrada</div>
          <p className="mt-1 text-sm text-foreground-muted">
            Tente outra palavra-chave ou troque de categoria.
          </p>
        </div>
      ) : active === "all" ? (
        // All view: grouped by category
        <div className="space-y-12">
          {(Object.keys(categoryMeta) as Array<Exclude<CategoryKey, "all">>).map(catKey => {
            const inCat = filtered.filter(t => t.category === catKey);
            if (inCat.length === 0) return null;
            const meta = categoryMeta[catKey];
            return (
              <div key={catKey}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="display-3">{meta.label}</h2>
                  <span className="font-mono text-xs text-foreground-muted">
                    {inCat.length} {inCat.length === 1 ? "tool" : "tools"}
                  </span>
                  <div className="hairline-soft flex-1" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {inCat.map((t, i) => (
                    <ToolCard
                      key={t.title}
                      icon={t.icon}
                      title={t.title}
                      description={t.description}
                      badge={t.badge}
                      to={t.to}
                      tone={t.tone}
                      gradient={t.gradient}
                      status={t.status}
                      delay={i * 0.04}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Single category view
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t, i) => (
            <ToolCard
              key={t.title}
              icon={t.icon}
              title={t.title}
              description={t.description}
              badge={t.badge}
              to={t.to}
              tone={t.tone}
              gradient={t.gradient}
              status={t.status}
              delay={i * 0.04}
            />
          ))}
        </div>
      )}

      <div className="h-24" />
    </div>
  );
}
