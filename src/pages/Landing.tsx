import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, Image as ImageIcon, Video, Film, Pencil,
  AudioWaveform, ArrowUpToLine, ShoppingBag, Box, Boxes, Layers,
  UserCircle2, Send, Play, Check, Star, Zap,
} from "lucide-react";
import { CuboLogo } from "@/components/CuboLogo";
import { useAuth } from "@/lib/auth";
import heroSophia from "@/assets/hero-sophia.jpg";
import tplMediterranean from "@/assets/template-mediterranean.jpg";
import tplBeach from "@/assets/template-beach.jpg";
import tplCafe from "@/assets/template-cafe.jpg";
import tplStudio from "@/assets/template-studio.jpg";
import tplRooftop from "@/assets/template-rooftop.jpg";
import tplOotd from "@/assets/template-ootd.jpg";

/* ============================================================
   Refine Suite — dark cinematic landing
   ============================================================ */

const tools = [
  { icon: ImageIcon, title: "Image", desc: "Geração de imagem com Nano-Banana Pro, Seedream e Flux. Variações em paralelo, até 4K.", tag: "Core", media: tplCafe },
  { icon: Video, title: "Video", desc: "Image-to-video com Kling 2.5 Pro e Pixverse v5. Até 10s, 9:16 ou 16:9.", tag: "New", media: tplOotd },
  { icon: Film, title: "Cinema", desc: "Stills cinematográficos 21:9, anamórfico, lente longa e color grading editorial.", tag: "Pro", media: tplStudio },
  { icon: Pencil, title: "Edit Image", desc: "Remove/replace BG, expand, style transfer, inpaint, colorize, face e cloth swap.", tag: "Core", media: tplMediterranean },
  { icon: ArrowUpToLine, title: "Upscale", desc: "Magnific Creative e video upscaler até 4K com detalhe coerente.", tag: "Pro", media: tplBeach },
  { icon: AudioWaveform, title: "Audio", desc: "Música (Suno V4), SFX, voiceover TTS e isolamento de áudio.", tag: "New", media: tplRooftop },
  { icon: ShoppingBag, title: "E-commerce & Product", desc: "Product photography studio: fundo branco, packshot e cenas de produto.", tag: "Workflow", media: tplCafe },
  { icon: Box, title: "Realistic 3D", desc: "Converte qualquer referência em figurine, toy, escultura ou clay 3D.", tag: "New", media: tplOotd },
  { icon: Boxes, title: "Assets Gen", desc: "Ícones, sprites, props e UI assets com fundo transparente sob demanda.", tag: "New", media: tplBeach },
  { icon: Layers, title: "Depth Map", desc: "Extrai mapa de profundidade (grayscale/colored) pronto pra ControlNet.", tag: "Beta", media: tplStudio },
  { icon: UserCircle2, title: "Character", desc: "Persona consistente: mesmo rosto e identidade em qualquer cena ou pose.", tag: "Core", media: tplMediterranean },
  { icon: Send, title: "Marketing", desc: "Campanhas hero shot, mockups e variações para anúncios em 1 clique.", tag: "Workflow", media: tplRooftop },
];

const templates = [
  { src: tplMediterranean, name: "Mediterranean Travel", category: "Travel", uses: "1.2k" },
  { src: tplCafe, name: "Café Lifestyle", category: "Lifestyle", uses: "987" },
  { src: tplBeach, name: "Brazilian Beach", category: "Travel", uses: "2.3k" },
  { src: tplOotd, name: "OOTD Streetwear", category: "Fashion", uses: "1.8k" },
  { src: tplStudio, name: "Editorial Studio", category: "Editorial", uses: "742" },
  { src: tplRooftop, name: "Rooftop Sunset", category: "Lifestyle", uses: "1.5k" },
];

const tiers = [
  {
    name: "Free",
    priceMonthly: "R$ 0",
    priceYearly: "R$ 0",
    creditsMonthly: "500 créditos / mês",
    creditsYearly: "6.000 créditos / ano",
    features: [
      "Com marca d'água",
      "1 geração simultânea",
      "5 gerações / dia",
      "Sem licença comercial",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Starter",
    priceMonthly: "R$ 27",
    priceYearly: "R$ 21,58",
    yearlyTotal: "R$ 259 / ano",
    creditsMonthly: "8.000 créditos / mês",
    creditsYearly: "105.600 créditos / ano",
    features: [
      "Sem marca d'água",
      "Licença comercial",
      "2 gerações simultâneas",
      "1 personagem",
      "3 estilos custom",
    ],
    cta: "Escolher Starter",
  },
  {
    name: "Creator",
    priceMonthly: "R$ 59",
    priceYearly: "R$ 47,17",
    yearlyTotal: "R$ 566 / ano",
    creditsMonthly: "19.000 créditos / mês",
    creditsYearly: "250.800 créditos / ano",
    features: [
      "3 gerações simultâneas",
      "5 personagens",
      "10 estilos custom",
      "Top-up disponível",
      "Rollover 25%",
    ],
    cta: "Escolher Creator",
    featured: true,
  },
  {
    name: "Pro",
    priceMonthly: "R$ 129",
    priceYearly: "R$ 103,17",
    yearlyTotal: "R$ 1.238 / ano",
    creditsMonthly: "48.000 créditos / mês",
    creditsYearly: "633.600 créditos / ano",
    features: [
      "5 gerações simultâneas",
      "Fila prioritária",
      "API access",
      "15 personagens",
      "25 estilos custom",
      "Early access",
    ],
    cta: "Escolher Pro",
  },
  {
    name: "Studio",
    priceMonthly: "R$ 749",
    priceYearly: "R$ 599,17",
    yearlyTotal: "R$ 7.190 / ano",
    creditsMonthly: "320.000 créditos / mês",
    creditsYearly: "4.224.000 créditos / ano",
    features: [
      "10 gerações simultâneas",
      "Personagens ilimitados",
      "Estilos ilimitados",
      "5 assentos",
      "Treino de modelos custom",
      "Suporte dedicado",
    ],
    cta: "Falar conosco",
  },
];

const trustBrands = ["CUBO", "SOPHIA", "LUMEN", "ATELIER", "NORTE", "VERBO", "COSTA", "EFEMERA", "MIRA", "STUDIO 21"];

const stats = [
  { num: "80+", label: "Modelos integrados" },
  { num: "4K", label: "Resolução máxima" },
  { num: "36", label: "Modelos de imagem" },
  { num: "34", label: "Modelos de vídeo" },
];

const stepsProcess = [
  { num: "01", title: "Escolha a ferramenta", desc: "Image, Video, Edit, Upscale, Audio, 3D, Assets, Depth — tudo num só studio." },
  { num: "02", title: "Descreva ou anexe", desc: "Prompt + referências, ou suba a imagem base. Modelo e aspect ratio são automáticos por aba." },
  { num: "03", title: "Dispara em paralelo", desc: "A fila roda jobs simultâneos sem travar a UI. Você acompanha tudo no painel." },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ctaTo = user ? "/app" : "/signup";
  const ctaLabel = user ? "Abrir studio" : "Começar grátis";
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-2xl">
        <div className="container-suite flex h-16 items-center justify-between">
          <CuboLogo />
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { href: "#suite", label: "Suite" },
              { href: "#templates", label: "Templates" },
              { href: "#process", label: "Processo" },
              { href: "#pricing", label: "Planos" },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-foreground-dim transition-colors hover:bg-white/5 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={() => navigate("/app")} className="btn-pill-primary text-sm">
                Abrir studio <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm text-foreground-dim transition-colors hover:text-foreground sm:inline-flex">
                  Entrar
                </Link>
                <Link to="/signup" className="btn-pill-primary text-sm">
                  Começar grátis <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============ HERO FULLBLEED CINEMATIC ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-100" aria-hidden />
        <div className="absolute inset-x-0 -top-32 h-[600px] gradient-glow opacity-60" aria-hidden />

        <div className="container-suite relative grid gap-12 pb-20 pt-16 lg:grid-cols-12 lg:gap-8 lg:pb-32 lg:pt-20">
          {/* LEFT — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative z-10 lg:col-span-7"
          >
            <div className="eyebrow eyebrow-dot mb-6">
              Refine Suite · v1.0 · São Paulo
            </div>

            <h1 className="display-hero">
              Toda a criação visual com IA,
              <br />
              <span className="text-gradient-copper">num só studio</span>.
            </h1>

            <p className="lead mt-7 text-foreground-dim">
              Imagem, vídeo, edição, upscale, áudio, 3D e assets — com os melhores modelos do mercado.
              <br className="hidden md:block" />
              Nano-Banana Pro, Kling 2.5, Magnific, Suno V4 e mais. Jobs rodam em paralelo.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to={ctaTo} className="btn-pill-primary text-base px-7 py-3.5">
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#suite" className="btn-pill-ghost text-base">
                <Play className="h-4 w-4" /> Ver demo
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground-muted">
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> 3 gerações grátis</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Sem cartão</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Cancela quando quiser</span>
            </div>
          </motion.div>

          {/* RIGHT — Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="relative lg:col-span-5"
          >
            <div className="hero-frame ring-1 ring-white/10 shadow-elevated">
              <img
                src={heroSophia}
                alt="Sophia · persona Refine"
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
              {/* Overlay badges */}
              <div className="absolute bottom-5 left-5 right-5 z-20 flex items-end justify-between gap-3">
                <div className="glass rounded-2xl px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">Persona ativa</div>
                  <div className="text-sm font-semibold text-foreground">Sophia · Editorial 4K</div>
                </div>
                <div className="glass flex items-center gap-2 rounded-full px-3 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">Live</span>
                </div>
              </div>
            </div>

            {/* Floating stats card */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute -left-4 top-1/3 hidden glass rounded-2xl p-4 shadow-elevated lg:block"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">Geração #2.847</div>
              <div className="mt-1 text-lg font-semibold">2m 47s</div>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============ TRUST MARQUEE ============ */}
      <section className="relative border-y border-border/50 bg-surface/40 py-8">
        <div className="container-suite">
          <div className="mb-5 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-foreground-muted">
            Plataforma da Cubo · usada por creators, agências e marcas brasileiras
          </div>
          <div className="marquee">
            <div className="marquee-track">
              {[...trustBrands, ...trustBrands].map((b, i) => (
                <span key={i} className="font-mono text-sm tracking-[0.2em] text-foreground-muted">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ SUITE GRID ============ */}
      <section id="suite" className="relative py-24 lg:py-32">
        <div className="container-suite">
          <div className="mb-14 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="eyebrow eyebrow-dot mb-4">A Suite Refine</div>
              <h2 className="display-1">
                40+ ferramentas. <span className="text-gradient-copper">Uma suite.</span>
                <br />
                O stack completo de criação visual.
              </h2>
            </div>
            <p className="lead lg:max-w-sm lg:text-right">
              Criar, Editar, Transformar, Melhorar, Profissional e Workflow — 6 categorias cobrindo imagem, vídeo, áudio e automação.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
                className="tool-card p-6"
              >
                {/* Media preview */}
                <div className="relative mb-5 overflow-hidden rounded-xl">
                  <img
                    src={tool.media}
                    alt={tool.title}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                  <div className="absolute right-3 top-3 rounded-full glass px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider">
                    {tool.tag}
                  </div>
                </div>

                {/* Content */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                        <tool.icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-semibold">{tool.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground-muted">{tool.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="border-y border-border/50 bg-surface/40 py-14">
        <div className="container-suite">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map(s => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="text-4xl font-semibold tracking-tight text-gradient-copper md:text-5xl">{s.num}</div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TEMPLATES SHOWCASE ============ */}
      <section id="templates" className="relative py-24 lg:py-32">
        <div className="container-suite">
          <div className="mb-14 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="eyebrow eyebrow-dot mb-4">Galeria de exemplos</div>
              <h2 className="display-1">
                Resultados <span className="text-gradient-copper">reais</span>.
                <br />
                Gerados na própria suite.
              </h2>
            </div>
            <Link to={ctaTo} className="btn-pill-ghost">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4">
            {templates.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
                className="media-card group ring-1 ring-white/5 hover:ring-primary/30"
              >
                <img src={t.src} alt={t.name} loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-white/60">{t.category}</div>
                      <div className="mt-1 text-lg font-semibold text-white">{t.name}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-full glass px-2.5 py-1 font-mono text-[10px] text-white">
                      <Zap className="h-3 w-3 text-primary" />
                      {t.uses}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROCESS / SHOWCASE ============ */}
      <section id="process" className="relative py-24 lg:py-32">
        <div className="absolute inset-x-0 top-1/2 -z-0 h-96 gradient-glow opacity-40" aria-hidden />
        <div className="container-suite relative">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
            {/* Image side */}
            <div className="relative">
              <div className="hero-frame ring-1 ring-white/10 shadow-elevated">
                <img src={tplStudio} alt="Sophia editorial studio" className="aspect-[4/5] w-full object-cover" loading="lazy" />
              </div>
              <div className="absolute -bottom-6 -right-6 glass rounded-2xl p-4 shadow-elevated">
                <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">Identidade fixa</div>
                <div className="mt-1 text-sm font-semibold">100% match</div>
                <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full w-full gradient-copper animate-glow-pulse" />
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="lg:py-8">
              <div className="eyebrow eyebrow-dot mb-4">Como funciona</div>
              <h2 className="display-1 mb-10">
                Do prompt ao resultado
                <br />
                em <span className="text-gradient-copper">3 passos</span>.
              </h2>

              <ol className="space-y-2">
                {stepsProcess.map((step, i) => (
                  <motion.li
                    key={step.num}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="group relative flex gap-5 rounded-2xl border border-transparent p-5 transition-all hover:border-border hover:bg-surface/50"
                  >
                    <div className="font-mono text-3xl font-bold text-gradient-copper">{step.num}</div>
                    <div className="flex-1 border-l border-border pl-5">
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{step.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="relative py-24 lg:py-32">
        <div className="container-suite">
          <div className="mb-14 text-center">
            <div className="eyebrow eyebrow-dot mx-auto mb-4 inline-flex">Planos</div>
            <h2 className="display-1">
              Comece grátis. <span className="text-gradient-copper">Cresça com você.</span>
            </h2>
            <p className="lead mx-auto mt-5">
              3 fotos grátis para testar. Sem cartão. Sem compromisso.
            </p>

            {/* Billing toggle */}
            <div className="mx-auto mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-surface/40 p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  billing === "monthly" ? "bg-white/10 text-foreground" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  billing === "yearly" ? "bg-white/10 text-foreground" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Anual
                <span className="rounded-full gradient-copper px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {tiers.map((t, i) => {
              const price = billing === "yearly" ? t.priceYearly : t.priceMonthly;
              const credits = billing === "yearly" ? t.creditsYearly : t.creditsMonthly;
              return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={`relative rounded-2xl border p-7 transition-all ${
                  t.featured
                    ? "border-primary/60 bg-gradient-to-b from-primary/10 to-surface shadow-glow"
                    : "border-border bg-surface/40 hover:border-primary/30 hover:bg-surface"
                }`}
              >
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-copper px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white shadow-glow-soft">
                    Mais popular
                  </div>
                )}
                <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">{t.name}</div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{price}</span>
                  <span className="text-sm text-foreground-muted">/mês</span>
                </div>
                {billing === "yearly" && t.yearlyTotal && (
                  <div className="mb-1 text-[11px] text-foreground-muted">cobrado {t.yearlyTotal}</div>
                )}
                <div className="mb-7 text-sm text-foreground-muted">{credits}</div>

                <Link
                  to={ctaTo}
                  className={`block w-full rounded-full px-5 py-3 text-center text-sm font-medium transition-all ${
                    t.featured
                      ? "gradient-copper text-white hover:shadow-glow"
                      : "border border-border-strong bg-white/5 text-foreground hover:border-primary/40 hover:bg-white/10"
                  }`}
                >
                  {t.cta}
                </Link>

                <div className="hairline-soft my-7" />

                <ul className="space-y-3">
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground-dim">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="px-5 pb-24 lg:px-8">
        <div className="container-suite">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-surface via-surface-2 to-background p-12 text-center shadow-elevated lg:p-20">
            <div className="absolute inset-0 gradient-glow opacity-50" aria-hidden />
            <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="eyebrow eyebrow-dot mx-auto mb-5 inline-flex">Pronto para criar?</div>
              <h2 className="display-1 mx-auto max-w-3xl">
                Pare de pular entre apps.
                <br />
                Tudo num <span className="text-gradient-copper">só studio</span>.
              </h2>
              <p className="lead mx-auto mt-5">
                Comece grátis e teste cada ferramenta da suite.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link to={ctaTo} className="btn-pill-primary px-8 py-4 text-base">
                  {ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="https://soph.ia.com.br" target="_blank" rel="noreferrer" className="btn-pill-ghost text-base">
                  Ver Sophia <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-border/60 bg-surface/30">
        <div className="container-suite grid gap-12 py-16 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <CuboLogo />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-foreground-muted">
              A suite premium de criação visual com IA. Imagem, vídeo, edição, áudio e 3D num só lugar. Feita por <a href="https://refinecubo.com.br" className="text-foreground underline-offset-2 hover:underline">Cubo</a> em São Paulo.
            </p>
            <div className="mt-6 flex gap-3 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
              <a href="https://soph.ia.com.br" className="hover:text-foreground">Sophia ↗</a>
              <span>·</span>
              <a href="https://refinecubo.com.br" className="hover:text-foreground">Cubo ↗</a>
              <span>·</span>
              <a href="https://api.refinecubo.com.br/docs" className="hover:text-foreground">API ↗</a>
            </div>
          </div>
          {[
            { title: "Produto", links: ["Suite", "Templates", "Vídeos", "Drive Import", "Style Learning", "Batch"] },
            { title: "Empresa", links: ["Sobre", "Sophia", "Blog", "Contato", "Carreiras"] },
            { title: "Legal", links: ["Termos", "Privacidade", "Cookies", "DMCA"] },
          ].map(col => (
            <div key={col.title}>
              <div className="mb-5 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">{col.title}</div>
              <ul className="space-y-3 text-sm">
                {col.links.map(l => <li key={l}><a href="#" className="text-foreground-dim transition-colors hover:text-foreground">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60">
          <div className="container-suite flex h-16 flex-col items-center justify-between gap-3 text-xs text-foreground-muted sm:flex-row">
            <span>© 2026 Refine by Cubo. Todos os direitos reservados.</span>
            <span className="font-mono">São Paulo · Brasil · feito com 🖤</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
