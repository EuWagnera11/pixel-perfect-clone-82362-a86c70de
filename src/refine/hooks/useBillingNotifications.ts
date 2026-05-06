// Notificações in-app de billing.
// - Saldo baixo (<10% da capacidade) → 1x por sessão por nível
// - Renovação detectada (last_reset_at avançou) → toast de sucesso
// - Sub cancelada / cancel_at_period_end ligado → toast de aviso
// Usa o canal realtime que o useBilling já expõe via mudanças nas tabelas.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type CreditsRow = {
  balance: number;
  plan_credits: number;
  topup_credits: number;
  rollover_credits: number;
  last_reset_at: string | null;
  next_reset_at: string | null;
};

type SubRow = {
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string;
  plan_id: string;
};

const SESSION_KEY = "refine:billing-notif";

function readState(): Record<string, string | number | boolean> {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}"); } catch { return {}; }
}
function writeState(s: Record<string, string | number | boolean>) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

export function useBillingNotifications(userId: string | null | undefined, capacity: number) {
  const lastResetRef = useRef<string | null>(null);
  const cancelFlagRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`billing-notif-${userId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_credits", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as CreditsRow;
          const prev = payload.old as CreditsRow;

          // Renovação: last_reset_at avançou
          if (next.last_reset_at && next.last_reset_at !== lastResetRef.current && lastResetRef.current !== null) {
            toast.success("Créditos renovados", {
              description: `Saldo atual: ${next.balance.toLocaleString("pt-BR")} créditos.`,
            });
          }
          lastResetRef.current = next.last_reset_at;

          // Saldo baixo: <10% da capacidade, dispara só quando cruzar o limite
          if (capacity > 0) {
            const threshold = Math.floor(capacity * 0.1);
            const wasAbove = (prev?.balance ?? next.balance) > threshold;
            const isBelow = next.balance <= threshold && next.balance > 0;
            const state = readState();
            const lastWarnedAt = state.lowBalanceAt as string | undefined;
            const cooldown = lastWarnedAt && Date.now() - new Date(lastWarnedAt).getTime() < 1000 * 60 * 60 * 6;
            if (wasAbove && isBelow && !cooldown) {
              toast.warning("Créditos acabando", {
                description: `Restam ${next.balance.toLocaleString("pt-BR")} créditos (${Math.round((next.balance / capacity) * 100)}%).`,
                action: { label: "Comprar", onClick: () => { window.location.href = "/account?tab=plan"; } },
              });
              writeState({ ...state, lowBalanceAt: new Date().toISOString() });
            }
            if (next.balance === 0) {
              const lastZeroAt = state.zeroBalanceAt as string | undefined;
              const zeroCooldown = lastZeroAt && Date.now() - new Date(lastZeroAt).getTime() < 1000 * 60 * 60;
              if (!zeroCooldown) {
                toast.error("Sem créditos", {
                  description: "Faça upgrade ou compre top-up pra continuar gerando.",
                  action: { label: "Ver planos", onClick: () => { window.location.href = "/account?tab=plan"; } },
                });
                writeState({ ...state, zeroBalanceAt: new Date().toISOString() });
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_subscriptions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as SubRow;

          if (next.status === "canceled" && cancelFlagRef.current !== false) {
            toast.error("Assinatura cancelada", {
              description: "Seu plano foi encerrado. Você pode reativar a qualquer momento.",
            });
          } else if (next.cancel_at_period_end && cancelFlagRef.current === false) {
            const end = new Date(next.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
            toast.warning("Cancelamento agendado", {
              description: `Seu plano permanece ativo até ${end}.`,
            });
          } else if (!next.cancel_at_period_end && cancelFlagRef.current === true) {
            toast.success("Cancelamento revertido", {
              description: "Sua assinatura continua ativa.",
            });
          }
          cancelFlagRef.current = next.cancel_at_period_end;
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, capacity]);
}
