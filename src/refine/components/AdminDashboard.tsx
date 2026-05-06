import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Users, TrendingUp, Zap, AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { AdminCoupons } from "./AdminCoupons";

type Stats = {
  period_days: number;
  users: { total_users: number; new_users: number };
  mrr_brl: number;
  subscriptions_by_plan: { plan_id: string; billing_cycle: string; subs: number; mrr_brl: number }[];
  credits: { credits_spent: number; credits_topup: number; credits_reset: number; debit_tx_count: number };
  generations_by_status: Record<string, number>;
  top_consumers: { user_id: string; name: string | null; spent: number }[];
  recent_errors: { id: string; user_id: string; tool: string | null; model: string | null; error: string | null; at: string }[];
};

type RecentUser = {
  id: string; full_name: string | null; tier: string; credits: number;
  plan_id: string | null; billing_cycle: string | null; status: string | null; created_at: string;
};

const DAYS_OPTIONS = [7, 30, 90];

export function AdminDashboard() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setAuthorized(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setAuthorized(!!data);
    })();
  }, []);

  const load = async (d = days) => {
    setLoading(true); setError(null);
    try {
      const [statsRes, usersRes] = await Promise.all([
        supabase.rpc("admin_dashboard_stats", { p_days: d }),
        supabase.rpc("admin_recent_users", { p_limit: 50 }),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (usersRes.error) throw usersRes.error;
      setStats(statsRes.data as unknown as Stats);
      setUsers((usersRes.data as RecentUser[]) ?? []);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authorized) load(days); /* eslint-disable-next-line */ }, [authorized, days]);

  if (authorized === null) {
    return <div className="account-empty"><Loader2 size={16} className="spin" /></div>;
  }
  if (!authorized) {
    return (
      <div className="account-page">
        <div className="account-card" style={{ textAlign: "center", padding: 48 }}>
          <ShieldAlert size={32} style={{ opacity: 0.6, margin: "0 auto 12px" }} />
          <h2>Acesso restrito</h2>
          <p className="account-card-sub">Esta área é exclusiva para administradores.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/home")}>Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-header">
        <button className="account-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <h1>Admin · Dashboard</h1>
        <p className="account-sub">Visão geral de billing, uso e erros.</p>
      </div>

      <div className="account-tabs" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {DAYS_OPTIONS.map((d) => (
            <button key={d} className={"account-tab" + (days === d ? " active" : "")} onClick={() => setDays(d)}>
              Últimos {d}d
            </button>
          ))}
        </div>
        <button className="account-tab" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Atualizar
        </button>
      </div>

      {error && <div className="account-card" style={{ borderColor: "#e85d3a", color: "#e85d3a" }}>{error}</div>}

      {stats && (
        <>
          <div className="account-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <StatCard icon={<Users size={16} />} label="Usuários totais" value={stats.users.total_users.toLocaleString("pt-BR")}
              foot={`+${stats.users.new_users} nos últimos ${days}d`} />
            <StatCard icon={<TrendingUp size={16} />} label="MRR estimado"
              value={`R$ ${Number(stats.mrr_brl).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
              foot={`${stats.subscriptions_by_plan.reduce((s, x) => s + x.subs, 0)} assinaturas ativas`} />
            <StatCard icon={<Zap size={16} />} label="Créditos consumidos"
              value={stats.credits.credits_spent.toLocaleString("pt-BR")}
              foot={`${stats.credits.debit_tx_count.toLocaleString("pt-BR")} gerações pagas`} />
            <StatCard icon={<AlertTriangle size={16} />} label="Gerações com erro"
              value={(stats.generations_by_status["failed"] ?? 0).toLocaleString("pt-BR")}
              foot={`${(stats.generations_by_status["completed"] ?? 0).toLocaleString("pt-BR")} concluídas`} />
          </div>

          <div className="account-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
            <div className="account-card">
              <h2>Assinaturas por plano</h2>
              <p className="account-card-sub">Ativas, em trial ou em atraso.</p>
              <div className="usage-table">
                <div className="usage-row usage-head">
                  <span>Plano</span><span>Ciclo</span><span className="right">Subs</span><span className="right">MRR</span>
                </div>
                {stats.subscriptions_by_plan.length === 0 && <div className="account-empty">Nenhuma assinatura paga.</div>}
                {stats.subscriptions_by_plan.map((p, i) => (
                  <div className="usage-row" key={`${p.plan_id}-${p.billing_cycle}-${i}`}>
                    <span>{p.plan_id}</span>
                    <span className="muted">{p.billing_cycle}</span>
                    <span className="right">{p.subs}</span>
                    <span className="right">R$ {Number(p.mrr_brl).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="account-card">
              <h2>Top consumidores</h2>
              <p className="account-card-sub">Quem mais gastou créditos no período.</p>
              <div className="usage-table">
                <div className="usage-row usage-head">
                  <span>Usuário</span><span>ID</span><span className="right">Créditos</span>
                </div>
                {stats.top_consumers.length === 0 && <div className="account-empty">Sem dados.</div>}
                {stats.top_consumers.map((u) => (
                  <div className="usage-row" key={u.user_id}>
                    <span>{u.name || "—"}</span>
                    <span className="muted" style={{ fontFamily: "monospace", fontSize: 11 }}>{u.user_id.slice(0, 8)}…</span>
                    <span className="right">{Number(u.spent).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="account-card" style={{ marginTop: 16 }}>
            <h2>Erros recentes</h2>
            <p className="account-card-sub">Últimas 20 gerações com falha.</p>
            <div className="usage-table">
              <div className="usage-row usage-head">
                <span>Quando</span><span>Ferramenta</span><span>Modelo</span><span>Mensagem</span>
              </div>
              {stats.recent_errors.length === 0 && <div className="account-empty">Sem erros 🎉</div>}
              {stats.recent_errors.map((e) => (
                <div className="usage-row" key={e.id}>
                  <span className="muted">{new Date(e.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span>{e.tool || "—"}</span>
                  <span className="muted">{e.model || "—"}</span>
                  <span className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.error || ""}>
                    {e.error || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="account-card" style={{ marginTop: 16 }}>
            <h2>Usuários recentes</h2>
            <p className="account-card-sub">Últimas 50 contas criadas.</p>
            <div className="usage-table">
              <div className="usage-row usage-head">
                <span>Quando</span><span>Nome</span><span>Plano</span><span>Status</span><span className="right">Créditos</span>
              </div>
              {users.map((u) => (
                <div className="usage-row" key={u.id}>
                  <span className="muted">{new Date(u.created_at).toLocaleString("pt-BR", { dateStyle: "short" })}</span>
                  <span>{u.full_name || "—"}</span>
                  <span>{u.plan_id || u.tier} <span className="muted">{u.billing_cycle ? `· ${u.billing_cycle}` : ""}</span></span>
                  <span><span className={"status-pill status-" + (u.status || "free")}>{u.status || "free"}</span></span>
                  <span className="right">{u.credits.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>

          <AdminCoupons />
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, foot }: { icon: React.ReactNode; label: string; value: string; foot?: string }) {
  return (
    <div className="account-card">
      <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.7, fontSize: 12 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{value}</div>
      {foot && <div className="account-card-sub" style={{ marginTop: 4 }}>{foot}</div>}
    </div>
  );
}
