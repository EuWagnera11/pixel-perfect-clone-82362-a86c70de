import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, ArrowRight, Sparkle, Lightning, Crown, Rocket, Buildings } from "@phosphor-icons/react";
import pricing from "@/config/pricing.json";
import { supabase } from "@/integrations/supabase/client";

type BillingCycle = "monthly" | "yearly";

const PLAN_ORDER = ["free", "starter", "creator", "pro", "studio"];

const PLAN_ICONS: Record<string, any> = {
  free: Sparkle,
  starter: Lightning,
  creator: Rocket,
  pro: Crown,
  studio: Buildings,
};

const PLAN_TAGLINES: Record<string, string> = {
  free: "Pra experimentar",
  starter: "Pra começar a criar",
  creator: "Pra produção contínua",
  pro: "Pra estúdios e times",
  studio: "Pra alta demanda",
};

const HIGHLIGHTED = "creator";

function formatBRL(value: number) {
  if (value === 0) return "Grátis";
  return `R$${value.toLocaleString("pt-BR")}`;
}

function formatCredits(n: number) {
  return n.toLocaleString("pt-BR");
}

const FEATURE_ROWS: Array<{ key: string; label: string; format?: (v: any) => string }> = [
  { key: "credits_monthly", label: "Créditos/mês" },
  { key: "max_concurrent_generations", label: "Gerações simultâneas" },
  { key: "rate_limit_per_day", label: "Limite diário", format: (v) => v == null ? "Ilimitado" : `${v}/dia` },
  { key: "watermark", label: "Sem marca d'água", format: (v) => v ? "—" : "✓" },
  { key: "commercial_license", label: "Licença comercial" },
  { key: "priority_queue", label: "Fila prioritária" },
  { key: "api_access", label: "Acesso à API" },
  { key: "custom_styles_limit", label: "Estilos customizados", format: (v) => v === -1 ? "Ilimitado" : v === 0 ? "—" : String(v) },
  { key: "characters_limit", label: "Personagens", format: (v) => v === -1 ? "Ilimitado" : v === 0 ? "—" : String(v) },
  { key: "topup_enabled", label: "Top-ups disponíveis" },
  { key: "early_access_features", label: "Acesso antecipado" },
];

const FAQ = [
  {
    q: "Como funcionam os créditos?",
    a: "Cada geração consome créditos com base no modelo, qualidade e duração. O custo aparece em tempo real no Dock antes de você gerar."
  },
  {
    q: "O que acontece com créditos não usados?",
    a: "Planos pagos (Creator, Pro, Studio) têm rollover de 25% dos créditos não consumidos pro próximo mês. Top-ups nunca expiram."
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Cancela a qualquer momento direto na sua conta. Você mantém acesso até o fim do período já pago."
  },
  {
    q: "Qual a diferença entre mensal e anual?",
    a: "No anual você economiza ~20% e ainda recebe um bônus de créditos no momento da contratação."
  },
  {
    q: "Posso comprar créditos avulsos?",
    a: "Sim, planos Creator, Pro e Studio podem comprar pacotes de top-up a partir de R$19. Top-ups não expiram."
  },
  {
    q: "Geração que falha gasta crédito?",
    a: "Não. Se a geração falhar por erro nosso ou do provedor, os créditos são automaticamente devolvidos."
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const plans = useMemo(() => PLAN_ORDER.map((id) => (pricing as any).plans[id]).filter(Boolean), []);
  const topups = useMemo(() => Object.values((pricing as any).topup_packages || {}) as any[], []);

  const startCheckout = async (planId: string) => {
    if (planId === "free") { navigate("/signup"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate(`/signup?next=/pricing`); return; }
    const planKey = `${planId}_${cycle}`;
    setLoadingKey(`plan:${planKey}`);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planKey },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (url) window.location.href = url;
      else throw new Error("Sem URL de checkout");
    } catch (e: any) {
      alert("Erro: " + (e?.message || "checkout falhou"));
    } finally {
      setLoadingKey(null);
    }
  };

  const startTopup = async (topupKey: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate(`/signup?next=/pricing`); return; }
    setLoadingKey(`topup:${topupKey}`);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { topup: topupKey },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (url) window.location.href = url;
      else throw new Error("Sem URL de checkout");
    } catch (e: any) {
      alert("Erro: " + (e?.message || "checkout falhou"));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="pricing-page">
      {/* Top nav */}
      <header className="pricing-nav">
        <button className="pricing-brand" onClick={() => navigate("/")}>Refine</button>
        <nav className="pricing-nav-actions">
          <button className="pricing-link" onClick={() => navigate("/login")}>Entrar</button>
          <button className="pricing-cta-sm" onClick={() => navigate("/signup")}>
            Começar grátis <ArrowRight weight="bold" size={14} />
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="pricing-hero">
        <span className="pricing-eyebrow">Preços</span>
        <h1 className="pricing-title">Planos que escalam<br/>com a sua criação.</h1>
        <p className="pricing-subtitle">
          Comece grátis. Faça upgrade quando precisar. Pague só pelo que usa em créditos.
        </p>

        <div className="cycle-toggle" role="tablist">
          <button
            className={`cycle-btn ${cycle === "monthly" ? "active" : ""}`}
            onClick={() => setCycle("monthly")}
          >Mensal</button>
          <button
            className={`cycle-btn ${cycle === "yearly" ? "active" : ""}`}
            onClick={() => setCycle("yearly")}
          >
            Anual
            <span className="cycle-badge">−20%</span>
          </button>
        </div>
      </section>

      {/* Plan cards */}
      <section className="plans-grid">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Sparkle;
          const isFree = plan.id === "free";
          const isHighlighted = plan.id === HIGHLIGHTED;
          const price = cycle === "monthly" ? plan.price_monthly_brl : Math.round(plan.price_yearly_brl / 12);
          const credits = cycle === "monthly" ? plan.credits_monthly : plan.credits_yearly;
          const yearlyTotal = plan.price_yearly_brl;

          return (
            <article key={plan.id} className={`plan-card ${isHighlighted ? "highlighted" : ""}`}>
              {isHighlighted && <span className="plan-ribbon">Mais popular</span>}
              <div className="plan-head">
                <div className="plan-icon"><Icon weight="fill" size={18} /></div>
                <div>
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-tagline">{PLAN_TAGLINES[plan.id]}</p>
                </div>
              </div>

              <div className="plan-price">
                <span className="plan-price-value">{formatBRL(price)}</span>
                {!isFree && <span className="plan-price-suffix">/mês</span>}
              </div>
              {!isFree && cycle === "yearly" && (
                <p className="plan-price-note">{formatBRL(yearlyTotal)} cobrado anualmente</p>
              )}
              {!isFree && cycle === "monthly" && (
                <p className="plan-price-note">ou {formatBRL(Math.round(plan.price_yearly_brl / 12))}/mês no anual</p>
              )}
              {isFree && <p className="plan-price-note">Sem cartão</p>}

              <button
                className={`plan-cta ${isHighlighted ? "primary" : ""}`}
                onClick={() => startCheckout(plan.id)}
                disabled={loadingKey === `plan:${plan.id}_${cycle}`}
              >
                {loadingKey === `plan:${plan.id}_${cycle}`
                  ? "Abrindo…"
                  : isFree ? "Começar grátis" : `Assinar ${plan.name}`}
                <ArrowRight weight="bold" size={14} />
              </button>

              <div className="plan-credits">
                <span className="plan-credits-value">{formatCredits(credits)}</span>
                <span className="plan-credits-label">créditos {cycle === "monthly" ? "/mês" : "/ano"}</span>
              </div>

              <ul className="plan-features">
                <li><Check weight="bold" size={14} /> {plan.features.max_concurrent_generations} {plan.features.max_concurrent_generations === 1 ? "geração simultânea" : "gerações simultâneas"}</li>
                <li>
                  {plan.features.watermark
                    ? <><X weight="bold" size={14} /> Com marca d'água</>
                    : <><Check weight="bold" size={14} /> Sem marca d'água</>}
                </li>
                <li>
                  {plan.features.commercial_license
                    ? <><Check weight="bold" size={14} /> Licença comercial</>
                    : <><X weight="bold" size={14} /> Sem licença comercial</>}
                </li>
                {plan.features.priority_queue && <li><Check weight="bold" size={14} /> Fila prioritária</li>}
                {plan.features.api_access && <li><Check weight="bold" size={14} /> Acesso à API</li>}
                {plan.features.topup_enabled && <li><Check weight="bold" size={14} /> Top-ups disponíveis</li>}
                {plan.features.rollover_percent && <li><Check weight="bold" size={14} /> Rollover de {plan.features.rollover_percent}%</li>}
                {plan.features.early_access_features && <li><Check weight="bold" size={14} /> Acesso antecipado</li>}
              </ul>
            </article>
          );
        })}
      </section>

      {/* Top-ups */}
      <section className="topups-section">
        <div className="section-head">
          <span className="pricing-eyebrow">Top-ups</span>
          <h2 className="section-title">Precisou de mais? Compra avulsa.</h2>
          <p className="section-sub">Disponível pra Creator, Pro e Studio. Top-ups não expiram.</p>
        </div>
        <div className="topups-grid">
          {topups.map((t: any) => (
            <div key={t.id} className="topup-card">
              <div className="topup-name">{t.name}</div>
              <div className="topup-credits">{formatCredits(t.credits)} <span>cr</span></div>
              <div className="topup-price">R${t.price_brl}</div>
              <div className="topup-rate">R${(t.price_brl / t.credits * 1000).toFixed(2)} / 1k créditos</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="compare-section">
        <div className="section-head">
          <span className="pricing-eyebrow">Comparativo</span>
          <h2 className="section-title">Tudo o que está incluso.</h2>
        </div>
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th></th>
                {plans.map((p) => (
                  <th key={p.id} className={p.id === HIGHLIGHTED ? "highlighted" : ""}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="row-label">{row.label}</td>
                  {plans.map((p) => {
                    const v = p.features?.[row.key] ?? p[row.key];
                    let display: string;
                    if (row.format) display = row.format(v);
                    else if (typeof v === "boolean") display = v ? "✓" : "—";
                    else if (typeof v === "number") display = formatCredits(v);
                    else display = v == null ? "—" : String(v);
                    return (
                      <td key={p.id} className={p.id === HIGHLIGHTED ? "highlighted" : ""}>{display}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-head">
          <span className="pricing-eyebrow">FAQ</span>
          <h2 className="section-title">Perguntas frequentes.</h2>
        </div>
        <div className="faq-grid">
          {FAQ.map((item, i) => (
            <details key={i} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pricing-final-cta">
        <h2>Pronto pra criar?</h2>
        <p>Comece grátis com 500 créditos. Sem cartão.</p>
        <button className="pricing-cta-lg" onClick={() => navigate("/signup")}>
          Começar agora <ArrowRight weight="bold" size={16} />
        </button>
      </section>

      <footer className="pricing-footer">
        <span>© Refine</span>
        <button onClick={() => navigate("/")}>Voltar pro início</button>
      </footer>
    </div>
  );
}
