// Chamado pela página /payment-success com o session_id.
// - Top-up: credita os créditos via credit_user_credits (idempotente).
// - Subscription: dispara sync (mesma lógica do check-subscription).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { STRIPE_PRICES } from "../_shared/stripe-prices.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id") || (await req.json().catch(() => ({})))?.session_id;
    if (!sessionId) throw new Error("Missing session_id");

    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user?.email) throw new Error("Not authenticated");
    const user = userData.user;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "subscription"],
    });

    if (session.client_reference_id && session.client_reference_id !== user.id) {
      throw new Error("Session does not belong to user");
    }
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return json({ ok: false, status: session.payment_status });
    }

    const line = session.line_items?.data[0];
    const priceId = line?.price?.id;
    if (!priceId) throw new Error("No price in session");
    const meta = STRIPE_PRICES[priceId];
    if (!meta) throw new Error(`Unknown price ${priceId}`);

    if (meta.kind === "topup") {
      // Idempotência: verificar se já existe transação com esse session_id
      const { data: dup } = await admin
        .from("credit_transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "topup")
        .filter("metadata->>stripe_session_id", "eq", sessionId)
        .maybeSingle();

      if (dup) return json({ ok: true, already_credited: true, credits: meta.credits });

      const { data: r, error } = await admin.rpc("credit_user_credits", {
        p_user_id: user.id,
        p_amount: meta.credits,
        p_type: "topup",
        p_reason: `Top-up ${meta.topup_id}`,
        p_generation_id: null,
        p_metadata: { stripe_session_id: sessionId, topup_id: meta.topup_id, price_id: priceId },
      });
      if (error) throw error;

      return json({ ok: true, kind: "topup", credits: meta.credits, balance: r });
    }

    // Subscription: o sub ID já está no session.subscription
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subId) throw new Error("No subscription on session");
    const sub = await stripe.subscriptions.retrieve(subId);
    const item = sub.items.data[0];
    const periodEnd = new Date((item.current_period_end ?? sub.current_period_end ?? 0) * 1000).toISOString();
    const periodStart = new Date((item.current_period_start ?? sub.current_period_start ?? 0) * 1000).toISOString();
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    const { data: existing } = await admin
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle();

    const payload = {
      plan_id: meta.plan_id,
      billing_cycle: meta.billing_cycle,
      status: "active" as const,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
    };

    if (existing) {
      await admin.from("user_subscriptions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await admin.from("user_subscriptions").insert({ user_id: user.id, ...payload });
    }

    return json({ ok: true, kind: "subscription", plan_id: meta.plan_id, billing_cycle: meta.billing_cycle });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[verify-payment]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
