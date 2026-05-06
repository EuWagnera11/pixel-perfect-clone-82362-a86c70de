// Verifica em tempo real qual subscription o user tem no Stripe e
// sincroniza public.user_subscriptions + public.profiles.tier.
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
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return json({ subscribed: false, plan_id: "free" });
    }
    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });

    if (subs.data.length === 0) {
      // marca como free (sem ativo)
      await admin.from("user_subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"]);
      return json({ subscribed: false, plan_id: "free" });
    }

    const sub = subs.data[0];
    const item = sub.items.data[0];
    const priceId = item.price.id;
    const meta = STRIPE_PRICES[priceId];

    if (!meta || meta.kind !== "subscription") {
      return json({ subscribed: true, plan_id: "unknown", note: "price not in registry" });
    }

    const periodEnd = new Date((item.current_period_end ?? sub.current_period_end ?? 0) * 1000).toISOString();
    const periodStart = new Date((item.current_period_start ?? sub.current_period_start ?? 0) * 1000).toISOString();

    // upsert
    const { data: existing } = await admin
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle();

    if (existing) {
      await admin.from("user_subscriptions").update({
        plan_id: meta.plan_id,
        billing_cycle: meta.billing_cycle,
        status: "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: meta.plan_id,
        billing_cycle: meta.billing_cycle,
        status: "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
      });
    }

    return json({
      subscribed: true,
      plan_id: meta.plan_id,
      billing_cycle: meta.billing_cycle,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[check-subscription]", msg);
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
