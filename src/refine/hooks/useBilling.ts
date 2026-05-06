import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Plan = {
  id: string;
  name: string;
  price_monthly_brl: number;
  price_yearly_brl: number;
  credits_monthly: number;
  credits_yearly: number;
  features: Record<string, any>;
  sort_order: number;
};

export type Subscription = {
  id: string;
  plan_id: string;
  billing_cycle: "monthly" | "yearly";
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

export type CreditsRow = {
  balance: number;
  plan_credits: number;
  topup_credits: number;
  rollover_credits: number;
  last_reset_at: string | null;
  next_reset_at: string | null;
};

export function useBilling(userId: string | null | undefined) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [credits, setCredits] = useState<CreditsRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setCredits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [plansRes, subRes, creditsRes] = await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trialing", "past_due"])
        .maybeSingle(),
      supabase.from("user_credits").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setPlans((plansRes.data as Plan[]) ?? []);
    setSubscription((subRes.data as Subscription) ?? null);
    setCredits((creditsRes.data as CreditsRow) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: créditos podem mudar a qualquer geração
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`billing-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_credits", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new) setCredits(payload.new as CreditsRow);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_subscriptions", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const currentPlan = plans.find((p) => p.id === subscription?.plan_id) ?? null;
  const capacity = currentPlan
    ? subscription?.billing_cycle === "yearly"
      ? currentPlan.credits_yearly
      : currentPlan.credits_monthly
    : 500;
  const balance = credits?.balance ?? 0;
  const daysToReset = subscription
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return {
    plans,
    subscription,
    credits,
    currentPlan,
    capacity,
    balance,
    daysToReset,
    loading,
    refresh: load,
  };
}
