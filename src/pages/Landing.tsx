import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Image as ImageIcon, Lock, Layers, Briefcase, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CuboLogo } from "@/components/CuboLogo";
import { useAuth } from "@/lib/auth";
import heroSophia from "@/assets/hero-sophia.jpg";
import tplMediterranean from "@/assets/template-mediterranean.jpg";
import tplBeach from "@/assets/template-beach.jpg";
import tplCafe from "@/assets/template-cafe.jpg";
import tplStudio from "@/assets/template-studio.jpg";
import tplRooftop from "@/assets/template-rooftop.jpg";
import tplOotd from "@/assets/template-ootd.jpg";

const features = [
  { icon: ImageIcon, title: "Pipeline 4K editorial", desc: "Qualidade que rivaliza estúdios profissionais. Sem uncanny valley." },
  { icon: Zap, title: "Geração em 3-5 minutos", desc: "Do prompt à entrega. Sem espera, sem fila premium." },
  { icon: Layers, title: "25+ templates clusterizados", desc: "Lifestyle, travel, fitness, OOTD. Curados, não random." },
  { icon: Lock, title: "Identidade fixa garantida", desc: "Sua persona é canônica. Sempre o mesmo rosto, em qualquer cena." },
  { icon: Sparkles, title: "Carrosséis automáticos", desc: "1 sessão = 12 posts coerentes. Conteúdo de uma semana, num clique." },
  { icon: Briefcase, title: "White-label para agências", desc: "Acesso multi-persona, API, branding próprio. Tier Agency." },
];

const tiers = [
  { name: "Starter", price: "R$ 30", credits: "50 fotos / mês", features: ["1 persona", "Templates basic", "Resolução 2K"], cta: "Começar" },
  { name: "Pro", price: "R$ 97", credits: "300 fotos / mês", features: ["3 personas", "Todos os templates", "Magnific upscale", "Resolução 4K"], cta: "Escolher Pro", featured: true },
  { name: "Agency", price: "R$ 297", credits: "1.500 fotos / mês", features: ["15 personas", "White-label", "API access", "Suporte prioritário"], cta: "Escolher Agency" },
  { name: "Enterprise", price: "Custom", credits: "Sob medida", features: ["Modelo dedicada", "SLA garantido", "Onboarding 1:1"], cta: "Falar com vendas" },
];

const templates = [
  { src: tplMediterranean, name: "Mediterranean Travel" },
  { src: tplCafe, name: "Café Lifestyle" },
  { src: tplBeach, name: "Brazilian Beach" },
  { src: tplOotd, name: "OOTD Streetwear" },
  { src: tplStudio, name: "Editorial Studio" },
  { src: tplRooftop, name: "Roof Sunset" },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ctaTo = user ? "/app" : "/signup";
  const ctaLabel = user ? "Abrir studio" : "Começar grátis";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container-cubo flex h-16 items-center justify-between">
          <CuboLogo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#templates" className="hover:text-foreground transition-colors">Templates</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button onClick={() => navigate("/app")}>Abrir studio</Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
                <Button asChild><Link to="/signup">Começar <ArrowRight /></Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-warm opacity-60" aria-hidden />
        <div className="container-cubo relative grid gap-12 py-20 lg:grid-cols-12 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> AI Influencer Studio
            </div>
            <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-[72px]">
              Crie sua influencer IA em <span className="text-primary">minutos</span>.
              <br />Não em meses.
            </h1>
            <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
              Pipeline de produção que rivaliza Aitana e Olivia Roa. Para creators, agências e brands que querem qualidade editorial — sem prompt random.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="hero" asChild>
                <Link to={ctaTo}>{ctaLabel} <ArrowRight /></Link>
              </Button>
              <Button size="lg" variant="outline">Ver demo Sophia</Button>
            </div>
            <div className="mt-8 flex items-center gap-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <span>3 gerações grátis</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Sem cartão</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Cancela quando quiser</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden />
              <div className="relative overflow-hidden rounded-2xl shadow-elegant ring-1 ring-foreground/5">
                <img src={heroSophia} alt="Sophia, persona IA criada com Cubo Studio" className="h-full w-full object-cover" width={800} height={1000} />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-elegant backdrop-blur">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Persona ativa</div>
                <div className="text-sm font-semibold">Sophia · Editorial 4K</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-y border-border/60 bg-surface py-10">
        <div className="container-cubo">
          <p className="mb-6 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Confiado por creators e agências brasileiras
          </p>
          <div className="grid grid-cols-2 items-center gap-8 opacity-60 md:grid-cols-6">
            {["Refine", "Lumen", "Atelier", "Norte", "Verbo", "Cubo"].map(b => (
              <div key={b} className="text-center font-mono text-sm tracking-wider text-muted-foreground">{b.toUpperCase()}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container-cubo">
          <div className="mb-14 max-w-2xl">
            <div className="mb-3 font-mono text-xs uppercase tracking-wider text-primary">Recursos</div>
            <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Tudo que estúdios profissionais usam. Sem o estúdio.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-border md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-background p-8 transition-colors hover:bg-surface"
              >
                <div className="mb-5 grid h-10 w-10 place-items-center rounded-md bg-primary-light text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates showcase */}
      <section id="templates" className="bg-surface py-24">
        <div className="container-cubo">
          <div className="mb-14 flex items-end justify-between gap-8">
            <div className="max-w-2xl">
              <div className="mb-3 font-mono text-xs uppercase tracking-wider text-primary">Templates</div>
              <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
                25+ cenas pré-clusterizadas. Geradas em 1 clique.
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {templates.map(t => (
              <div key={t.name} className="group relative overflow-hidden rounded-xl">
                <img src={t.src} alt={t.name} loading="lazy" width={800} height={1000} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/70">Template</div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container-cubo">
          <div className="mb-14 text-center">
            <div className="mb-3 font-mono text-xs uppercase tracking-wider text-primary">Planos</div>
            <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Comece grátis. Cresce com você.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              3 fotos grátis para testar. Sem cartão. Sem compromisso.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {tiers.map(t => (
              <div
                key={t.name}
                className={`relative rounded-2xl border p-6 transition-all ${t.featured ? "border-primary bg-primary-light/40 shadow-glow" : "border-border bg-background hover:border-foreground/20"}`}
              >
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
                    Mais popular
                  </div>
                )}
                <div className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">{t.name}</div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{t.price}</span>
                  {t.price !== "Custom" && <span className="text-sm text-muted-foreground">/mês</span>}
                </div>
                <div className="mb-6 text-sm text-muted-foreground">{t.credits}</div>
                <Button variant={t.featured ? "default" : "outline"} className="w-full" asChild>
                  <Link to={ctaTo}>{t.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-3">
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-24">
        <div className="container-cubo gradient-orange relative overflow-hidden rounded-3xl px-8 py-20 text-center text-primary-foreground shadow-glow">
          <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Pronto para criar sua IA influencer?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            3 gerações grátis. Sem cartão. Veja a qualidade antes de assinar.
          </p>
          <Button size="xl" variant="secondary" className="mt-8" asChild>
            <Link to={ctaTo}>{ctaLabel} <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="container-cubo grid gap-12 py-16 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <CuboLogo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Studio de produção para IA influencers fotorrealistas. Feito por <a href="https://refinecubo.com.br" className="underline hover:text-foreground">Cubo</a> em São Paulo.
            </p>
          </div>
          {[
            { title: "Produto", links: ["Recursos", "Templates", "Planos", "Casos"] },
            { title: "Empresa", links: ["Sobre", "Sophia", "Blog", "Contato"] },
            { title: "Legal", links: ["Termos", "Privacidade", "Cookies"] },
          ].map(col => (
            <div key={col.title}>
              <div className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">{col.title}</div>
              <ul className="space-y-2 text-sm">
                {col.links.map(l => <li key={l}><a href="#" className="text-foreground/80 hover:text-foreground">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="container-cubo flex h-16 items-center justify-between text-xs text-muted-foreground">
            <span>© 2026 Cubo Studio. Todos os direitos reservados.</span>
            <span className="font-mono">São Paulo · Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
