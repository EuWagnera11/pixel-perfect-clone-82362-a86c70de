import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Power } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  type: "percent_off" | "credits_bonus";
  value: number;
  applies_to: "subscription" | "topup" | "both";
  max_redemptions: number | null;
  redemptions_count: number;
  expires_at: string | null;
  active: boolean;
  stripe_coupon_id: string | null;
  description: string | null;
  created_at: string;
};

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "percent_off" as "percent_off" | "credits_bonus",
    value: 10,
    applies_to: "both" as "subscription" | "topup" | "both",
    max_redemptions: "" as string,
    expires_at: "" as string,
    stripe_coupon_id: "",
    description: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setCoupons((data as Coupon[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.code.trim() || form.value <= 0) return;
    if (form.type === "percent_off" && !form.stripe_coupon_id.trim()) {
      alert("Para desconto percentual você precisa criar o cupom no Stripe primeiro e colar o ID (ex: '10OFF').");
      return;
    }
    setCreating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.value,
        applies_to: form.applies_to,
        max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        stripe_coupon_id: form.stripe_coupon_id.trim() || null,
        description: form.description.trim() || null,
        created_by: u.user?.id,
      };
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) throw error;
      setForm({ code: "", type: "percent_off", value: 10, applies_to: "both", max_redemptions: "", expires_at: "", stripe_coupon_id: "", description: "" });
      await load();
    } catch (e: any) {
      alert("Erro: " + (e?.message || "falha ao criar"));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    await load();
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Excluir cupom ${c.code}?`)) return;
    await supabase.from("coupons").delete().eq("id", c.id);
    await load();
  };

  return (
    <div className="account-card" style={{ marginTop: 16 }}>
      <h2>Cupons</h2>
      <p className="account-card-sub">
        Crie códigos promocionais. <strong>Percent off:</strong> precisa criar antes no Stripe e colar o ID.
        <strong> Credits bonus:</strong> credita N créditos extra após pagamento confirmado.
      </p>

      {/* Form */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
        <input placeholder="CÓDIGO" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          style={inp} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} style={inp}>
          <option value="percent_off">% desconto</option>
          <option value="credits_bonus">+ créditos bônus</option>
        </select>
        <input type="number" placeholder={form.type === "percent_off" ? "% (1-100)" : "créditos extra"}
          value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} style={inp} />
        <select value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value as any })} style={inp}>
          <option value="both">Ambos</option>
          <option value="subscription">Só assinatura</option>
          <option value="topup">Só top-up</option>
        </select>
        <input type="number" placeholder="Máx usos (vazio=∞)" value={form.max_redemptions}
          onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} style={inp} />
        <input type="datetime-local" placeholder="Expira em" value={form.expires_at}
          onChange={(e) => setForm({ ...form, expires_at: e.target.value })} style={inp} />
        <input placeholder="Stripe coupon ID (se %)" value={form.stripe_coupon_id}
          onChange={(e) => setForm({ ...form, stripe_coupon_id: e.target.value })} style={inp} />
        <input placeholder="Descrição (interna)" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} style={inp} />
      </div>
      <button onClick={create} disabled={creating} className="btn-primary" style={{ marginTop: 10, display: "inline-flex", gap: 6, alignItems: "center" }}>
        {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Criar cupom
      </button>

      {/* List */}
      <div className="usage-table" style={{ marginTop: 16 }}>
        <div className="usage-row usage-head">
          <span>Código</span><span>Tipo</span><span>Valor</span><span>Aplica</span>
          <span className="right">Usos</span><span className="right">Ações</span>
        </div>
        {loading && <div className="account-empty"><Loader2 size={14} className="spin" /></div>}
        {!loading && coupons.length === 0 && <div className="account-empty">Nenhum cupom ainda.</div>}
        {coupons.map((c) => (
          <div className="usage-row" key={c.id}>
            <span style={{ fontFamily: "monospace", fontWeight: 600, opacity: c.active ? 1 : 0.4 }}>{c.code}</span>
            <span className="muted">{c.type === "percent_off" ? "% off" : "+ créditos"}</span>
            <span>{c.type === "percent_off" ? `${c.value}%` : `+${c.value}`}</span>
            <span className="muted">{c.applies_to}</span>
            <span className="right">{c.redemptions_count}{c.max_redemptions ? `/${c.max_redemptions}` : ""}</span>
            <span className="right" style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => toggleActive(c)} title={c.active ? "Desativar" : "Ativar"} style={iconBtn}>
                <Power size={14} />
              </button>
              <button onClick={() => remove(c)} title="Excluir" style={{ ...iconBtn, color: "#ef4444" }}>
                <Trash2 size={14} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 6, border: "1px solid hsl(var(--border))",
  background: "hsl(var(--surface) / 0.4)", color: "inherit", fontSize: 13,
};
const iconBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: 6,
  padding: 6, cursor: "pointer", color: "inherit", display: "inline-flex", alignItems: "center",
};
