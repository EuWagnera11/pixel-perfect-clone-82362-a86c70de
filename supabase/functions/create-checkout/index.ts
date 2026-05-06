import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  SUBSCRIPTION_PRICE_BY_KEY,
  TOPUP_PRICE_BY_KEY,
} from "../_shared/stripe-prices.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData?.user?.email) throw new Error("Not authenticated");
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { plan, topup, coupon_code } = body as { plan?: string; topup?: string; coupon_code?: string };

    let priceId: string | undefined;
    let mode: "subscription" | "payment";

    if (plan) {
      priceId = SUBSCRIPTION_PRICE_BY_KEY[plan];
      mode = "subscription";
    } else if (topup) {
      priceId = TOPUP_PRICE_BY_KEY[topup];
      mode = "payment";
    } else {
      throw new Error("Provide either 'plan' or 'topup'");
    }
    if (!priceId) throw new Error(`Unknown price for ${plan ?? topup}`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";

    // Validate coupon (if provided) using authed supabase client RPC
    let validatedCoupon: any = null;
    if (coupon_code && typeof coupon_code === "string") {
      const ctx = plan ? "subscription" : "topup";
      const { data: cpRes } = await supabase.rpc("validate_coupon", { p_code: coupon_code.trim(), p_context: ctx });
      if (!cpRes || (cpRes as any).valid !== true) {
        throw new Error(`Cupom inválido: ${(cpRes as any)?.error ?? "unknown"}`);
      }
      validatedCoupon = cpRes;
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        kind: plan ? "subscription" : "topup",
        key: (plan ?? topup)!,
        ...(validatedCoupon ? { coupon_id: validatedCoupon.coupon_id, coupon_code: validatedCoupon.code, coupon_type: validatedCoupon.type, coupon_value: String(validatedCoupon.value) } : {}),
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
    };

    if (validatedCoupon?.type === "percent_off" && validatedCoupon.stripe_coupon_id) {
      sessionParams.discounts = [{ coupon: validatedCoupon.stripe_coupon_id }];
    } else if (mode === "payment") {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
