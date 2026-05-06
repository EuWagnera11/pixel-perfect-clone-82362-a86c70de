import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState<"verifying" | "ok" | "error">("verifying");
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setErr("session_id ausente");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setInfo(data);
        setState("ok");
      } catch (e: any) {
        setState("error");
        setErr(e?.message || "Falha ao verificar");
      }
    })();
  }, [sessionId]);

  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center",
      background: "#0a0a0a", color: "#f5f5f7", padding: 24, fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <div style={{
        maxWidth: 520, width: "100%", textAlign: "center",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24,
        padding: 40, background: "rgba(255,255,255,0.02)"
      }}>
        {state === "verifying" && <>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Confirmando seu pagamento…</h1>
          <p style={{ color: "#9b9ba3" }}>Aguarde um instante.</p>
        </>}

        {state === "ok" && <>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Tudo certo!</h1>
          {info?.kind === "topup" && (
            <p style={{ color: "#9b9ba3", marginBottom: 24 }}>
              {info.credits?.toLocaleString("pt-BR")} créditos adicionados à sua conta.
            </p>
          )}
          {info?.kind === "subscription" && (
            <p style={{ color: "#9b9ba3", marginBottom: 24 }}>
              Plano <strong style={{ color: "#fff", textTransform: "capitalize" }}>{info.plan_id}</strong> ({info.billing_cycle === "yearly" ? "anual" : "mensal"}) ativo.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => navigate("/home")} style={btnPrimary}>Ir pro app</button>
            <button onClick={() => navigate("/account?tab=plan")} style={btnGhost}>Minha conta</button>
          </div>
        </>}

        {state === "error" && <>
          <div style={{ fontSize: 48, marginBottom: 12, color: "#ff6b6b" }}>!</div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Não conseguimos confirmar.</h1>
          <p style={{ color: "#9b9ba3", marginBottom: 24, fontSize: 13 }}>{err}</p>
          <button onClick={() => navigate("/pricing")} style={btnGhost}>Voltar pra preços</button>
        </>}
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "#ff5a1f", color: "#fff", border: "none",
  padding: "12px 20px", borderRadius: 999, fontWeight: 600, cursor: "pointer", fontSize: 14,
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#f5f5f7",
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "12px 20px", borderRadius: 999, fontWeight: 600, cursor: "pointer", fontSize: 14,
};
