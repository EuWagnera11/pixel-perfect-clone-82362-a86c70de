import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, CreditCard, Activity, ArrowLeft, Check, Sparkles, Loader2, Receipt, ExternalLink, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "../hooks/useAuth";
import { useBilling } from "../hooks/useBilling";
import pricing from "@/config/pricing.json";

type Tab = "profile" | "plan" | "usage" | "transactions" | "invoices";

type Props = {
  profile: Profile | null;
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  onUpgrade: () => void;
  onSignOut: () => void;
  refreshProfile: () => void;
  onOpenTopup?: () => void;
};

export function AccountPage({ profile, userId, email, isAnonymous, onUpgrade, onSignOut, refreshProfile, onOpenTopup }: Props) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as Tab) || "profile";
  const [tab, setTab] = useState<Tab>(initial);
  const billing = useBilling(userId);

  useEffect(() => {
    setParams({ tab }, { replace: true });
  }, [tab]);

  const planName = billing.currentPlan?.name ?? (profile?.tier ?? "Free");
  const credits = billing.balance ?? profile?.credits ?? 0;
  const capacity = billing.capacity || 500;
  const pct = Math.min(100, (credits / Math.max(1, capacity)) * 100);
  const cycle = billing.subscription?.billing_cycle ?? "monthly";
  const priceM = billing.currentPlan?.price_monthly_brl ?? 0;
  const periodEnd = billing.subscription?.current_period_end;

  return (
    <div className="account-page">
      <div className="account-header">
        <button className="account-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <h1>Sua conta</h1>
        <p className="account-sub">Perfil, plano, créditos e uso.</p>
      </div>

      <div className="account-tabs">
        <button className={"account-tab" + (tab === "profile" ? " active" : "")} onClick={() => setTab("profile")}>
          <User size={14} /> Perfil
        </button>
        <button className={"account-tab" + (tab === "plan" ? " active" : "")} onClick={() => setTab("plan")}>
          <CreditCard size={14} /> Plano e créditos
        </button>
        <button className={"account-tab" + (tab === "usage" ? " active" : "")} onClick={() => setTab("usage")}>
          <Activity size={14} /> Uso recente
        </button>
        <button className={"account-tab" + (tab === "transactions" ? " active" : "")} onClick={() => setTab("transactions")}>
          <Receipt size={14} /> Transações
        </button>
        <button className={"account-tab" + (tab === "invoices" ? " active" : "")} onClick={() => setTab("invoices")}>
          <FileText size={14} /> Faturas
        </button>
      </div>

      {tab === "profile" && (
        <ProfileTab email={email} isAnonymous={isAnonymous} onSignOut={onSignOut} refreshProfile={refreshProfile} />
      )}
      {tab === "plan" && (
        <PlanTab
          planName={planName}
          cycle={cycle}
          priceM={priceM}
          credits={credits}
          capacity={capacity}
          pct={pct}
          periodEnd={periodEnd}
          rolloverCredits={billing.credits?.rollover_credits ?? 0}
          topupCredits={billing.credits?.topup_credits ?? 0}
          topupEnabled={billing.currentPlan?.features?.topup_enabled === true}
          isPaidSubscription={!!billing.subscription?.stripe_customer_id || (billing.currentPlan?.price_monthly_brl ?? 0) > 0}
          cancelAtPeriodEnd={!!(billing.subscription as any)?.cancel_at_period_end}
          onUpgrade={onUpgrade}
          onOpenTopup={onOpenTopup}
          onRefresh={billing.refresh}
        />
      )}
      {tab === "usage" && <UsageTab />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "invoices" && <InvoicesTab />}
    </div>
  );
}

function ProfileTab({
  email, isAnonymous, onSignOut, refreshProfile,
}: { email: string | null; isAnonymous: boolean; onSignOut: () => void; refreshProfile: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles").select("full_name").eq("id", u.user.id).maybeSingle();
      setName(data?.full_name ?? "");
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    await supabase.from("profiles").update({ full_name: name }).eq("id", u.user.id);
    setLoading(false);
    setSaved(true);
    refreshProfile();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="account-card">
      <h2>Perfil</h2>
      <p className="account-card-sub">Como você aparece no Refine.</p>

      <label className="account-field">
        <span>E-mail</span>
        <input value={email ?? "Anônimo"} disabled />
      </label>

      <label className="account-field">
        <span>Nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          disabled={isAnonymous}
        />
      </label>

      <div className="account-actions">
        <button className="btn-primary" onClick={save} disabled={loading || isAnonymous}>
          {loading ? <Loader2 size={14} className="spin" /> : saved ? <><Check size={14} /> Salvo</> : "Salvar"}
        </button>
        {!isAnonymous && (
          <button className="btn-ghost-danger" onClick={onSignOut}>Sair da conta</button>
        )}
      </div>
    </div>
  );
}

function PlanTab({
  planName, cycle, priceM, credits, capacity, pct, periodEnd,
  rolloverCredits, topupCredits, topupEnabled, isPaidSubscription, cancelAtPeriodEnd,
  onUpgrade, onOpenTopup, onRefresh,
}: {
  planName: string;
  cycle: "monthly" | "yearly";
  priceM: number;
  credits: number; capacity: number; pct: number;
  periodEnd?: string;
  rolloverCredits: number;
  topupCredits: number;
  topupEnabled: boolean;
  isPaidSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  onUpgrade: () => void;
  onOpenTopup?: () => void;
  onRefresh: () => void | Promise<void>;
}) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const isPaid = priceM > 0;
  const renewLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if ((data as any)?.url) window.open((data as any).url, "_blank");
    } catch (e) {
      console.error("[customer-portal]", e);
      alert("Não foi possível abrir o portal de assinatura.");
    } finally {
      setPortalLoading(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke("check-subscription");
      await onRefresh();
    } catch (e) {
      console.error("[sync]", e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="account-grid">
      <div className="account-card account-card-feature">
        <div className="account-pill">Plano atual · {cycle === "yearly" ? "Anual" : "Mensal"}</div>
        <h2>{planName}</h2>
        <p className="account-card-sub">
          {priceM > 0 ? `R$ ${priceM} / mês` : "Grátis"}
          {cancelAtPeriodEnd && <span className="account-warn"> · cancela em {renewLabel}</span>}
        </p>

        <div className="account-credits">
          <div className="account-credits-head">
            <span className="account-credits-label">Créditos disponíveis</span>
            <span className="account-credits-num">
              {credits.toLocaleString("pt-BR")}
              <span className="muted"> / {capacity.toLocaleString("pt-BR")}</span>
            </span>
          </div>
          <div className="account-credits-bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="account-credits-foot">
            {cancelAtPeriodEnd ? "Termina" : "Renova"} em {renewLabel}
            {rolloverCredits > 0 && ` · ${rolloverCredits.toLocaleString("pt-BR")} de rollover`}
            {topupCredits > 0 && ` · ${topupCredits.toLocaleString("pt-BR")} avulsos`}
          </span>
        </div>

        <div className="account-actions" style={{ marginTop: 16, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={onUpgrade}>
            <Sparkles size={14} /> {isPaid ? "Mudar de plano" : "Fazer upgrade"}
          </button>
          {isPaidSubscription && (
            <button className="btn-ghost" onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />}
              Gerenciar assinatura
            </button>
          )}
          <button className="btn-ghost" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 size={14} className="spin" /> : <Activity size={14} />}
            Sincronizar
          </button>
        </div>
      </div>

      <div className="account-card">
        <h2>Top-up de créditos</h2>
        <p className="account-card-sub">Adicione créditos extras a qualquer momento.</p>
        <div className="topup-list">
          {Object.values(pricing.topup_packages).map((p: any) => (
            <div className="topup-item" key={p.id}>
              <div>
                <div className="topup-name">{p.name}</div>
                <div className="topup-credits">{p.credits.toLocaleString("pt-BR")} créditos</div>
              </div>
              <div className="topup-price">R$ {p.price_brl}</div>
            </div>
          ))}
        </div>
        {topupEnabled ? (
          <button className="btn-primary block" onClick={onOpenTopup} style={{ marginTop: 12 }}>
            Comprar créditos
          </button>
        ) : (
          <p className="account-note">Disponível a partir do plano Creator.</p>
        )}
      </div>
    </div>
  );
}

function UsageTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("generations")
        .select("id, tool, model, status, credits_used, created_at, media_type")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  const total = useMemo(() => items.reduce((s, i) => s + (i.credits_used ?? 0), 0), [items]);

  return (
    <div className="account-card">
      <h2>Uso recente</h2>
      <p className="account-card-sub">
        Últimas 30 gerações — total consumido: <strong>{total.toLocaleString("pt-BR")} créditos</strong>
      </p>

      {loading ? (
        <div className="account-empty"><Loader2 size={16} className="spin" /></div>
      ) : items.length === 0 ? (
        <div className="account-empty">Nenhuma geração ainda.</div>
      ) : (
        <div className="usage-table">
          <div className="usage-row usage-head">
            <span>Quando</span><span>Ferramenta</span><span>Modelo</span><span>Status</span><span className="right">Créditos</span>
          </div>
          {items.map((it) => (
            <div className="usage-row" key={it.id}>
              <span className="muted">{new Date(it.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              <span>{it.tool || it.media_type || "—"}</span>
              <span className="muted">{it.model || "—"}</span>
              <span><span className={"status-pill status-" + it.status}>{it.status}</span></span>
              <span className="right">{(it.credits_used ?? 0).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("credit_transactions")
        .select("id, type, amount, balance_after, reason, created_at, metadata")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  const labelOf = (t: string) => ({
    debit: "Consumo", credit: "Crédito", refund: "Reembolso",
    topup: "Top-up", reset: "Renovação",
  } as Record<string, string>)[t] ?? t;

  return (
    <div className="account-card">
      <h2>Transações</h2>
      <p className="account-card-sub">Últimas 50 movimentações de créditos.</p>

      {loading ? (
        <div className="account-empty"><Loader2 size={16} className="spin" /></div>
      ) : items.length === 0 ? (
        <div className="account-empty">Sem transações ainda.</div>
      ) : (
        <div className="usage-table">
          <div className="usage-row usage-head">
            <span>Quando</span><span>Tipo</span><span>Motivo</span><span className="right">Variação</span><span className="right">Saldo</span>
          </div>
          {items.map((it) => {
            const isOut = it.type === "debit";
            const sign = isOut ? "−" : "+";
            return (
              <div className="usage-row" key={it.id}>
                <span className="muted">{new Date(it.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                <span><span className={"status-pill status-" + it.type}>{labelOf(it.type)}</span></span>
                <span className="muted">{it.reason || "—"}</span>
                <span className="right" style={{ color: isOut ? "#e85d3a" : "#16a34a" }}>{sign}{(it.amount ?? 0).toLocaleString("pt-BR")}</span>
                <span className="right">{(it.balance_after ?? 0).toLocaleString("pt-BR")}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
