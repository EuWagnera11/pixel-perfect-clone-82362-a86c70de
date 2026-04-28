import { useEffect, useState } from "react";
import { Check, Crown, Sparkles, Zap, Building2, Star, Receipt, ArrowRight, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type TierKey = "starter" | "creator" | "pro" | "agency" | "enterprise";
type PackKey = "500" | "2000" | "5000" | "15000";

const tiers: { key: TierKey; icon: any; name: string; price: string; credits: string; tagline: string; features: string[]; featured?: boolean }[] = [
  {
    key: "starter",
    icon: Sparkles,
    name: "Starter",
    price: "R$ 47",
    credits: "500 créditos / mês",
    tagline: "Comece sua jornada",
    features: ["1 persona", "Templates basic", "Resolução 2K", "5 vídeos / mês", "TTS 50k chars", "1 voz clonada"],
  },
  {
    key: "creator",
    icon: Star,
    name: "Creator",
    price: "R$ 147",
    credits: "2.500 créditos / mês",
    tagline: "Pra quem cria todo dia",
    featured: true,
    features: ["3 personas", "Todos os 100+ templates", "Magnific upscale 4K", "30 vídeos (Kling V3)", "TTS 200k chars", "3 vozes clonadas", "Drive import", "Style learning"],
  },
  {
    key: "pro",
    icon: Crown,
    name: "Pro",
    price: "R$ 297",
    credits: "7.500 créditos / mês",
    tagline: "Toda a Suite liberada",
    features: ["10 personas", "Todas as 50+ ferramentas", "100 vídeos / mês", "TTS 1M chars", "10 vozes clonadas", "Music generation", "Lip sync ilimitado", "Suporte prioritário"],
  },
  {
    key: "agency",
    icon: Building2,
    name: "Agency",
    price: "R$ 697",
    credits: "25.000 créditos / mês",
    tagline: "White-label completo",
    features: ["30 personas", "White-label", "API access", "300 vídeos / mês", "TTS ilimitado", "Batch ilimitado", "Manager dedicado", "Branded subdomain"],
  },
  {
    key: "enterprise",
    icon: Zap,
    name: "Enterprise",
    price: "Custom",
    credits: "Sob medida",
    tagline: "Volume e SLA garantido",
    features: ["Modelos dedicadas", "SLA 99.9%", "Onboarding 1:1", "Treinamento custom da IA", "Servidor dedicado", "Compliance LGPD/GDPR"],
  },
];

const packs: { key: PackKey; name: string; price: string; credits: string; perCredit: string; tagline: string }[] = [
  { key: "500",   name: "Pack 500",   price: "R$ 39",  credits: "500 créditos",   perCredit: "R$ 0,078", tagline: "Pra testar" },
  { key: "2000",  name: "Pack 2.000", price: "R$ 129", credits: "2.000 créditos", perCredit: "R$ 0,065", tagline: "Mais popular" },
  { key: "5000",  name: "Pack 5.000", price: "R$ 297", credits: "5.000 créditos", perCredit: "R$ 0,059", tagline: "Melhor custo/benefício" },
  { key: "15000", name: "Pack 15.000", price: "R$ 797", credits: "15.000 créditos", perCredit: "R$ 0,053", tagline: "Volume agency" },
];

export default function Billing() {
  const { toast } = useToast();
  const [me, setMe] = useState<{ tier: string; credits: number } | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    api.billing.me()
      .then((r: any) => setMe({ tier: r?.tier ?? "free", credits: r?.credits ?? 0 }))
      .catch(() => setMe({ tier: "free", credits: 0 }));
  }, []);

  const checkoutTier = async (tier: TierKey) => {
    if (tier === "enterprise") {
      window.open("mailto:hello@refinecubo.com.br?subject=Plano Enterprise", "_blank");
      return;
    }
    setLoadingKey(`tier:${tier}`);
    try {
      const r = await api.billing.checkout({ tier });
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

      {/* TABS */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="mb-8 inline-flex h-auto rounded-full border border-border bg-surface/40 p-1">
          <TabsTrigger value="monthly" className="rounded-full px-6 py-2 text-sm">Planos mensais</TabsTrigger>
          <TabsTrigger value="packs" className="rounded-full px-6 py-2 text-sm">Pacotes avulsos</TabsTrigger>
          <TabsTrigger value="compare" className="rounded-full px-6 py-2 text-sm">Comparar features</TabsTrigger>
        </TabsList>

        {/* ─────────────── MENSAL ─────────────── */}
        <TabsContent value="monthly" className="mt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {tiers.map(t => {
              const Icon = t.icon;
              const active = me?.tier === t.key;
              const isLoading = loadingKey === `tier:${t.key}`;
              return (
                <div key={t.key}
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
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">{t.price}</span>
                    {t.price !== "Custom" && <span className="text-sm text-foreground-muted">/mês</span>}
                  </div>
                  <div className="mb-2 text-sm text-foreground-muted">{t.credits}</div>
                  <div className="mb-5 text-xs text-foreground-muted/80 italic">{t.tagline}</div>

                  <button
                    onClick={() => checkoutTier(t.key)}
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
                      active ? "Plano atual" :
                      t.key === "enterprise" ? "Falar conosco" : "Escolher"}
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
        </TabsContent>

        {/* ─────────────── PACOTES AVULSOS ─────────────── */}
        <TabsContent value="packs" className="mt-0">
          <div className="mb-6 max-w-2xl">
            <h3 className="display-3 mb-2">Pacotes <span className="text-gradient-copper">sem assinatura</span></h3>
            <p className="lead">
              Compre créditos quando precisar. Sem compromisso, sem renovação automática. Os créditos não expiram.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packs.map(p => {
              const isLoading = loadingKey === `pack:${p.key}`;
              return (
                <div key={p.key} className="rounded-2xl border border-border bg-surface/40 p-6 transition-all hover:border-primary/30">
                  <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">{p.name}</div>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                  </div>
                  <div className="text-sm text-foreground-muted">{p.credits}</div>
                  <div className="mt-1 text-xs text-foreground-muted/80">{p.perCredit} / crédito</div>
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

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-primary mb-2">💡 Dica</div>
            <p className="text-sm text-foreground-dim leading-relaxed">
              Se você gera mais de <strong>500 créditos por mês</strong>, o plano <strong>Starter (R$ 47)</strong> sai mais barato que comprar pacotes avulsos. Plano <strong>Creator (R$ 147)</strong> dá 2.500 créditos — equivale a R$ 0,059/crédito.
            </p>
          </div>
        </TabsContent>

        {/* ─────────────── COMPARAR ─────────────── */}
        <TabsContent value="compare" className="mt-0">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/60 text-left">
                  <th className="p-4 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">Feature</th>
                  {tiers.map(t => (
                    <th key={t.key} className="p-4 font-mono text-[11px] uppercase tracking-wider text-foreground-muted text-center">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { feat: "Créditos / mês", vals: ["500", "2.500", "7.500", "25.000", "Custom"] },
                  { feat: "Personas", vals: ["1", "3", "10", "30", "∞"] },
                  { feat: "Imagens 4K", vals: ["✓", "✓", "✓", "✓", "✓"] },
                  { feat: "Vídeos / mês", vals: ["5", "30", "100", "300", "Custom"] },
                  { feat: "TTS chars", vals: ["50k", "200k", "1M", "∞", "∞"] },
                  { feat: "Voice clones", vals: ["1", "3", "10", "∞", "∞"] },
                  { feat: "Music generation", vals: ["—", "✓", "✓", "✓", "✓"] },
                  { feat: "Lip sync", vals: ["—", "✓", "✓", "✓", "✓"] },
                  { feat: "Drive import", vals: ["—", "✓", "✓", "✓", "✓"] },
                  { feat: "Style learning", vals: ["—", "✓", "✓", "✓", "✓"] },
                  { feat: "Recreate (drive)", vals: ["—", "—", "✓", "✓", "✓"] },
                  { feat: "Batch mass", vals: ["—", "✓", "✓", "∞", "∞"] },
                  { feat: "Magnific upscale 4K", vals: ["—", "✓", "✓", "✓", "✓"] },
                  { feat: "API access", vals: ["—", "—", "—", "✓", "✓"] },
                  { feat: "White-label", vals: ["—", "—", "—", "✓", "✓"] },
                  { feat: "Suporte", vals: ["Chat", "Chat", "Prioritário", "Manager", "1:1 SLA"] },
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
