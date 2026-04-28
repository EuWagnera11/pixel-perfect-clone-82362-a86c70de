import { useEffect, useState } from "react";
import { Check, Crown, Sparkles, Zap, Building2, Star, Receipt, ArrowRight, Loader2, Gift, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type TierKey =
  | "starter_monthly" | "creator_monthly" | "pro_monthly" | "studio_monthly"
  | "starter_yearly"  | "creator_yearly"  | "pro_yearly"  | "studio_yearly";

type PackKey = "boost_3k" | "boost_8k" | "boost_25k" | "boost_80k";

type AddonKey =
  | "kling_v3_pro_10s_audio" | "veo_4k_audio" | "magnific_8k"
  | "lora_medium" | "lora_ultra" | "voice_clone";

type BillingInterval = "monthly" | "yearly";

type TierMeta = {
  base: "starter" | "creator" | "pro" | "studio";
  icon: any;
  name: string;
  tagline: string;
  features: string[];
  featured?: boolean;
};

const TIERS_META: TierMeta[] = [
  {
    base: "starter",
    icon: Sparkles,
    name: "Starter",
    tagline: "Comece sua jornada",
    features: [
      "10.000 créditos / mês",
      "Todos os modelos liberados",
      "Imagem 1K / 2K / 4K",
      "Vídeos básicos (Hailuo, Pixverse)",
      "TTS multilingual PT-BR",
    ],
  },
  {
    base: "creator",
    icon: Star,
    name: "Creator",
    tagline: "Pra quem cria todo dia",
    featured: true,
    features: [
      "25.000 créditos / mês",
      "Magnific Upscale 4K",
      "Skin Enhancer Magnific",
      "Kling V2.6 + V3 Std",
      "Veo 3.1 Fast",
      "Drive import + Style learning",
      "Music generation",
    ],
  },
  {
    base: "pro",
    icon: Crown,
    name: "Pro",
    tagline: "Toda a Suite liberada",
    features: [
      "60.000 créditos / mês",
      "Kling V3 Pro silent",
      "Veo 3.1 1080p",
      "LTX 2.0 Pro",
      "Recreate (drive)",
      "Batch ilimitado",
      "Suporte prioritário",
    ],
  },
  {
    base: "studio",
    icon: Building2,
    name: "Studio",
    tagline: "Volume agência",
    features: [
      "380.000 créditos / mês",
      "Kling V3 Pro 10s silent",
      "Veo 3.1 4K silent",
      "Sem caps diários",
      "API access",
      "White-label opcional",
      "Manager dedicado",
    ],
  },
];

const TIER_PRICES_BRL: Record<TierMeta["base"], { monthly: number; yearly: number }> = {
  starter: { monthly: 27,  yearly: 227 },
  creator: { monthly: 59,  yearly: 496 },
  pro:     { monthly: 129, yearly: 1084 },
  studio:  { monthly: 799, yearly: 6712 },
};

const PACKS: { key: PackKey; name: string; price: string; credits: string; perCredit: string; tagline: string }[] = [
  { key: "boost_3k",  name: "Boost 3.000",  price: "R$ 19",  credits: "3.000 créditos",  perCredit: "R$ 0,0063 / cred", tagline: "Pra dar uma turbinada" },
  { key: "boost_8k",  name: "Boost 8.000",  price: "R$ 39",  credits: "8.000 créditos",  perCredit: "R$ 0,0049 / cred", tagline: "Mais popular" },
  { key: "boost_25k", name: "Boost 25.000", price: "R$ 99",  credits: "25.000 créditos", perCredit: "R$ 0,0040 / cred", tagline: "Melhor custo/benefício" },
  { key: "boost_80k", name: "Boost 80.000", price: "R$ 279", credits: "80.000 créditos", perCredit: "R$ 0,0035 / cred", tagline: "Volume" },
];

const ADDONS: { key: AddonKey; name: string; price: string; description: string; icon: any }[] = [
  {
    key: "kling_v3_pro_10s_audio",
    name: "Vídeo Kling V3 Pro 10s + Áudio",
    price: "R$ 24,90",
    description: "Vídeo cinematográfico de 10 segundos com áudio sincronizado.",
    icon: Crown,
  },
  {
    key: "veo_4k_audio",
    name: "Vídeo Veo 3.1 4K 5s + Áudio",
    price: "R$ 24,90",
    description: "Vídeo Veo em 4K com áudio (Google's flagship model).",
    icon: Crown,
  },
  {
    key: "magnific_8k",
    name: "Magnific Upscale 4K → 8K",
    price: "R$ 19,90",
    description: "Upscale ultra alta resolução para impressão / billboard.",
    icon: Sparkles,
  },
  {
    key: "lora_medium",
    name: "Treino LoRA Medium",
    price: "R$ 199",
    description: "Treina uma LoRA personalizada da sua persona (qualidade Medium).",
    icon: Star,
  },
  {
    key: "lora_ultra",
    name: "Treino LoRA Ultra",
    price: "R$ 349",
    description: "Treina LoRA com qualidade Ultra (alta fidelidade, melhor consistência).",
    icon: Crown,
  },
  {
    key: "voice_clone",
    name: "Voice Clone",
    price: "R$ 39",
    description: "Cadastre uma voz personalizada (sua ou de terceiro com permissão).",
    icon: Gift,
  },
];

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Billing() {
  const { toast } = useToast();
  const [me, setMe] = useState<{ tier: string; credits: number } | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    api.billing.me()
      .then((r: any) => setMe({ tier: r?.tier ?? "free", credits: r?.credits ?? 0 }))
      .catch(() => setMe({ tier: "free", credits: 0 }));
  }, []);

  const checkoutTier = async (base: TierMeta["base"]) => {
    const tierKey: TierKey = `${base}_${interval === "yearly" ? "yearly" : "monthly"}` as TierKey;
    setLoadingKey(`tier:${tierKey}`);
    try {
      const r = await api.billing.checkout({ tier: tierKey });
      window.location.href = r.url;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro ao abrir checkout";
      toast({ title: "Falha no checkout", description: msg, variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  };

  const checkoutPack = async (pack: PackKey) => {
    setLoadingKey(`pack:${pack}`);
    try {
      const r = await api.billing.checkout({ pack });
      window.location.href = r.url;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro ao abrir checkout";
      toast({ title: "Falha no checkout", description: msg, variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  };

  const checkoutAddon = async (addon: AddonKey) => {
    setLoadingKey(`addon:${addon}`);
    try {
      const r = await api.billing.checkout({ addon });
      window.location.href = r.url;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro ao abrir checkout";
      toast({ title: "Falha no checkout", description: msg, variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  };

  const openPortal = async () => {
    setLoadingKey("portal");
    try {
      const r = await api.billing.portal();
      window.location.href = r.url;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro ao abrir portal";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="container-suite animate-fade-in">
      {/* HEADER */}
      <div className="mb-10">
        <div className="eyebrow eyebrow-dot mb-4">Faturamento</div>
        <h1 className="display-2 mb-3">Plano e <span className="text-gradient-copper">créditos</span></h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="glass rounded-2xl px-5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">Plano atual</div>
            <div className="text-lg font-semibold capitalize">{me?.tier ?? "..."}</div>
          </div>
          <div className="glass rounded-2xl px-5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">Créditos</div>
            <div className="text-lg font-semibold text-gradient-copper">{me?.credits?.toLocaleString("pt-BR") ?? "..."}</div>
          </div>
          {me?.tier && me.tier !== "free" && (
            <button onClick={openPortal} disabled={loadingKey === "portal"} className="btn-pill-ghost text-sm">
              {loadingKey === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Gerenciar assinatura
            </button>
          )}
        </div>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="mb-8 inline-flex h-auto rounded-full border border-border bg-surface/40 p-1">
          <TabsTrigger value="plans"   className="rounded-full px-6 py-2 text-sm">Planos</TabsTrigger>
          <TabsTrigger value="boosts"  className="rounded-full px-6 py-2 text-sm">Boost (top-up)</TabsTrigger>
          <TabsTrigger value="addons"  className="rounded-full px-6 py-2 text-sm">Add-ons</TabsTrigger>
          <TabsTrigger value="compare" className="rounded-full px-6 py-2 text-sm">Comparar</TabsTrigger>
        </TabsList>

        {/* ─────────────── PLANOS (mensal/anual) ─────────────── */}
        <TabsContent value="plans" className="mt-0">
          {/* Toggle Monthly/Yearly */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                interval === "monthly" ? "gradient-copper text-white shadow-glow-soft" : "text-foreground-dim hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition-all ${
                interval === "yearly" ? "gradient-copper text-white shadow-glow-soft" : "text-foreground-dim hover:text-foreground"
              }`}
            >
              Anual
              <span className="ml-2 inline-block rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                −30%
              </span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS_META.map(t => {
              const Icon = t.icon;
              const tierKey: TierKey = `${t.base}_${interval === "yearly" ? "yearly" : "monthly"}` as TierKey;
              const active = me?.tier === t.base;
              const isLoading = loadingKey === `tier:${tierKey}`;
              const price = TIER_PRICES_BRL[t.base][interval === "yearly" ? "yearly" : "monthly"];
              const monthlyEq = interval === "yearly" ? Math.round(price / 12 * 100) / 100 : price;
              const savings = interval === "yearly"
                ? TIER_PRICES_BRL[t.base].monthly * 12 - TIER_PRICES_BRL[t.base].yearly
                : 0;

              return (
                <div key={t.base}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                    t.featured
                      ? "border-primary/60 bg-gradient-to-b from-primary/10 to-surface shadow-glow"
                      : "border-border bg-surface/40 hover:border-primary/30"
                  } ${active ? "ring-2 ring-primary" : ""}`}
                >
                  {t.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-copper px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white shadow-glow-soft">
                      Mais popular
                    </div>
                  )}

                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">{t.name}</div>

                  {/* Price block */}
                  <div className="mb-1 flex items-baseline gap-1">
                    {interval === "yearly" ? (
                      <>
                        <span className="text-3xl font-semibold tracking-tight">{formatBRL(monthlyEq)}</span>
                        <span className="text-sm text-foreground-muted">/mês</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-semibold tracking-tight">{formatBRL(price)}</span>
                        <span className="text-sm text-foreground-muted">/mês</span>
                      </>
                    )}
                  </div>

                  {interval === "yearly" && (
                    <div className="mb-1 text-xs text-foreground-muted">
                      cobrado {formatBRL(price)}/ano
                    </div>
                  )}

                  {savings > 0 && (
                    <div className="mb-2 text-xs font-medium text-success">
                      Economiza {formatBRL(savings)}/ano
                    </div>
                  )}

                  <div className="mb-5 mt-2 text-xs text-foreground-muted/80 italic">{t.tagline}</div>

                  <button
                    onClick={() => checkoutTier(t.base)}
                    disabled={active || isLoading}
                    className={`w-full rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-surface-3 text-foreground-muted cursor-not-allowed"
                        : t.featured
                          ? "gradient-copper text-white hover:shadow-glow"
                          : "border border-border-strong bg-white/5 text-foreground hover:border-primary/40 hover:bg-white/10"
                    }`}
                  >
                    {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> :
                      active ? "Plano atual" : "Escolher"}
                  </button>

                  <div className="hairline-soft my-5" />

                  <ul className="space-y-2.5">
                    {t.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground-dim">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Annual benefit callout */}
          {interval === "yearly" && (
            <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-success mb-2">
                🎁 Plano anual = todos os créditos liberados de uma vez
              </div>
              <p className="text-sm text-foreground-dim leading-relaxed">
                Você paga uma vez por ano e recebe os créditos de 12 meses na hora — sem expiração mensal,
                sem reposição parcelada. Use como quiser, com seu ritmo. Daily caps continuam ativos pra
                evitar abuso de modelos premium.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ─────────────── BOOST PACKS (top-up) ─────────────── */}
        <TabsContent value="boosts" className="mt-0">
          <div className="mb-6 max-w-2xl">
            <h3 className="display-3 mb-2">Boost <span className="text-gradient-copper">avulso</span></h3>
            <p className="lead">
              Acabou os créditos do mês? Compra um pacote sem mexer na assinatura. Os créditos não expiram.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PACKS.map(p => {
              const isLoading = loadingKey === `pack:${p.key}`;
              return (
                <div key={p.key} className="rounded-2xl border border-border bg-surface/40 p-6 transition-all hover:border-primary/30">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">{p.name}</div>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                  </div>
                  <div className="text-sm text-foreground-muted">{p.credits}</div>
                  <div className="mt-1 text-xs text-foreground-muted/80">{p.perCredit}</div>
                  <div className="mt-3 mb-5 text-xs text-foreground-muted/80 italic">{p.tagline}</div>
                  <button
                    onClick={() => checkoutPack(p.key)}
                    disabled={isLoading}
                    className="w-full rounded-full border border-border-strong bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-white/10"
                  >
                    {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <>Comprar <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></>}
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─────────────── ADD-ONS (one-shot) ─────────────── */}
        <TabsContent value="addons" className="mt-0">
          <div className="mb-6 max-w-2xl">
            <h3 className="display-3 mb-2">Add-ons <span className="text-gradient-copper">premium</span></h3>
            <p className="lead">
              Funções caras que não entram no plano. Pague só quando usar — perfeito pra projetos especiais.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADDONS.map(a => {
              const Icon = a.icon;
              const isLoading = loadingKey === `addon:${a.key}`;
              return (
                <div key={a.key} className="flex flex-col rounded-2xl border border-border bg-surface/40 p-6 transition-all hover:border-primary/30">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mb-2 text-base font-semibold">{a.name}</div>
                  <div className="mb-3 text-2xl font-semibold tracking-tight text-gradient-copper">{a.price}</div>
                  <p className="mb-5 text-sm text-foreground-dim leading-relaxed flex-grow">{a.description}</p>
                  <button
                    onClick={() => checkoutAddon(a.key)}
                    disabled={isLoading}
                    className="w-full rounded-full border border-border-strong bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-white/10"
                  >
                    {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <>Comprar <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></>}
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─────────────── COMPARAR ─────────────── */}
        <TabsContent value="compare" className="mt-0">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/60 text-left">
                  <th className="p-4 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">Feature</th>
                  {TIERS_META.map(t => (
                    <th key={t.base} className="p-4 font-mono text-[11px] uppercase tracking-wider text-foreground-muted text-center">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { feat: "Créditos / mês",         vals: ["10.000", "25.000", "60.000", "380.000"] },
                  { feat: "Preço mensal",            vals: ["R$ 27", "R$ 59", "R$ 129", "R$ 799"] },
                  { feat: "Preço anual (-30%)",      vals: ["R$ 227", "R$ 496", "R$ 1.084", "R$ 6.712"] },
                  { feat: "Imagens 4K (NB Pro)",    vals: ["19", "47", "112", "710"] },
                  { feat: "Vídeos Kling V3 Std 5s", vals: ["6", "16", "40", "253"] },
                  { feat: "Magnific Upscale 4K",     vals: ["✓", "✓", "✓", "✓"] },
                  { feat: "Skin Enhancer Magnific",  vals: ["✓", "✓", "✓", "✓"] },
                  { feat: "Music generation",        vals: ["✓", "✓", "✓", "✓"] },
                  { feat: "Voice Clone",             vals: ["✓", "✓", "✓", "✓"] },
                  { feat: "Drive import",            vals: ["✓", "✓", "✓", "✓"] },
                  { feat: "Style learning",          vals: ["✓", "✓", "✓", "✓"] },
                  { feat: "Recreate (drive)",        vals: ["—", "—", "✓", "✓"] },
                  { feat: "Daily cap Kling V3 Pro",  vals: ["1/dia", "4/dia", "12/dia", "Ilimitado"] },
                  { feat: "Daily cap NB Pro 4K",     vals: ["5/dia", "20/dia", "80/dia", "Ilimitado"] },
                  { feat: "Batch ilimitado",         vals: ["—", "—", "✓", "✓"] },
                  { feat: "API access",              vals: ["—", "—", "—", "✓"] },
                  { feat: "Suporte",                 vals: ["Chat", "Chat", "Prioritário", "Manager"] },
                ].map(row => (
                  <tr key={row.feat} className="hover:bg-surface/30">
                    <td className="p-4 text-foreground-dim">{row.feat}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} className="p-4 text-center">
                        {v === "✓" ? <Check className="mx-auto h-4 w-4 text-primary" /> :
                         v === "—" ? <span className="text-foreground-muted/50">—</span> :
                         <span className="font-medium text-foreground-dim">{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-primary mb-2">💡 Como funciona</div>
            <p className="text-sm text-foreground-dim leading-relaxed">
              Todos os planos têm acesso a <strong>todos os modelos</strong> (Flux, Nano Banana, Mystic, Kling V3, Veo, etc.).
              Cada modelo consome uma quantidade diferente de créditos baseada no custo real. Os planos diferem no
              <strong> volume de créditos</strong> e nos <strong>caps diários</strong> de modelos premium pra evitar abuso.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
