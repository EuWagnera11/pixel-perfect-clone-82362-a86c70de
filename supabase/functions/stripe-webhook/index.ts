// Stripe webhook — renovação automática de créditos e sync de subscriptions.
// Eventos tratados:
//   - invoice.paid                          → renova créditos do plano
//   - customer.subscription.updated         → sync status / cancel_at_period_end / período
//   - customer.subscription.deleted         → marca como canceled
//   - checkout.session.completed (topup)    → fallback caso verify-payment não tenha rodado
//
// Idempotência: usamos stripe_event_id em credit_transactions.metadata.
// IMPORTANTE: esta função roda com verify_jwt=false (Stripe não envia JWT).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { STRIPE_PRICES } from "../_shared/stripe-prices.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[stripe-webhook] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    log("missing env");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (e) {
    log("signature failed", { err: e instanceof Error ? e.message : String(e) });
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  log("event", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription?.id;
        if (!subId) { log("invoice without subscription, skip"); break; }

        const sub = await stripe.subscriptions.retrieve(subId);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        // Acha o user pelo stripe_customer_id ou stripe_subscription_id
        const { data: existingSub } = await admin
          .from("user_subscriptions")
          .select("id, user_id, plan_id, billing_cycle")
          .or(`stripe_subscription_id.eq.${subId},stripe_customer_id.eq.${customerId}`)
          .maybeSingle();

        if (!existingSub) {
          // Fallback: procura pelo email do customer
          const customer = await stripe.customers.retrieve(customerId);
          const email = (customer as Stripe.Customer).email;
          if (!email) { log("no user mapping, skip", { subId }); break; }

          const { data: userByEmail } = await admin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (!userByEmail) { log("no profile for email", { email }); break; }

          log("invoice.paid: user found by email but no subscription row yet", { userId: userByEmail.id });
          break;
        }

        const item = sub.items.data[0];
        const priceId = item.price.id;
        const meta = STRIPE_PRICES[priceId];
        if (!meta || meta.kind !== "subscription") {
          log("unknown subscription price", { priceId });
          break;
        }

        const periodStart = new Date((item.current_period_start ?? sub.current_period_start ?? 0) * 1000).toISOString();
        const periodEnd = new Date((item.current_period_end ?? sub.current_period_end ?? 0) * 1000).toISOString();

        // Idempotência: invoice.id como chave
        const { data: dup } = await admin
          .from("credit_transactions")
          .select("id")
          .eq("user_id", existingSub.user_id)
          .eq("type", "reset")
          .filter("metadata->>stripe_event_id", "eq", event.id)
          .maybeSingle();
        if (dup) { log("event already processed", { event: event.id }); break; }

        // Atualiza assinatura
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
        }).eq("id", existingSub.id);

        // Renova créditos do plano (busca capacity da tabela plans)
        const { data: plan } = await admin
          .from("plans")
          .select("credits_monthly, credits_yearly, features")
          .eq("id", meta.plan_id)
          .maybeSingle();
        if (!plan) { log("plan not found", { plan_id: meta.plan_id }); break; }

        const newPlanCredits = meta.billing_cycle === "yearly" ? plan.credits_yearly : plan.credits_monthly;

        // Rollover (apenas mensal e se plano tem rollover_percent)
        let rollover = 0;
        if (meta.billing_cycle === "monthly" && plan.features && (plan.features as any).rollover_percent) {
          const { data: cur } = await admin
            .from("user_credits")
            .select("plan_credits, rollover_credits")
            .eq("user_id", existingSub.user_id)
            .maybeSingle();
          if (cur) {
            const cap = Math.floor(newPlanCredits * Number((plan.features as any).rollover_percent) / 100);
            rollover = Math.min((cur.plan_credits ?? 0) + (cur.rollover_credits ?? 0), cap);
          }
        }

        const { data: credits } = await admin
          .from("user_credits")
          .select("topup_credits")
          .eq("user_id", existingSub.user_id)
          .maybeSingle();
        const topup = credits?.topup_credits ?? 0;
        const newBalance = newPlanCredits + rollover + topup;

        await admin.from("user_credits").update({
          balance: newBalance,
          plan_credits: newPlanCredits,
          rollover_credits: rollover,
          last_reset_at: new Date().toISOString(),
          next_reset_at: periodEnd,
          updated_at: new Date().toISOString(),
        }).eq("user_id", existingSub.user_id);

        await admin.from("credit_transactions").insert({
          user_id: existingSub.user_id,
          type: "reset",
          amount: newPlanCredits + rollover,
          balance_after: newBalance,
          reason: `Renovação ${meta.billing_cycle}` + (rollover > 0 ? ` (rollover ${rollover})` : ""),
          metadata: { stripe_event_id: event.id, invoice_id: invoice.id, price_id: priceId },
        });

        await admin.from("profiles").update({
          credits: newBalance,
          updated_at: new Date().toISOString(),
        }).eq("id", existingSub.user_id);

        log("renewed", { userId: existingSub.user_id, balance: newBalance });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const item = sub.items.data[0];
        const priceId = item?.price.id;
        const meta = priceId ? STRIPE_PRICES[priceId] : undefined;

        const periodStart = item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : new Date().toISOString();

        const status = event.type === "customer.subscription.deleted"
          ? "canceled"
          : (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due")
            ? sub.status
            : "canceled";

        // Snapshot do plano anterior pra detectar troca
        const { data: prevSub } = await admin
          .from("user_subscriptions")
          .select("id, user_id, plan_id, billing_cycle")
          .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${customerId}`)
          .maybeSingle();

        const update: Record<string, unknown> = {
          status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        };
        if (meta && meta.kind === "subscription") {
          update.plan_id = meta.plan_id;
          update.billing_cycle = meta.billing_cycle;
        }

        const { error } = await admin
          .from("user_subscriptions")
          .update(update)
          .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${customerId}`);
        if (error) { log("update sub error", { err: error.message }); break; }
        log("subscription synced", { userId: prevSub?.user_id, status });

        // ─── Proration imediata: se o plano mudou no meio do ciclo,
        // ajusta créditos pra o novo plano sem esperar invoice.paid.
        // Idempotente via stripe_event_id.
        if (
          event.type === "customer.subscription.updated" &&
          prevSub?.user_id &&
          meta?.kind === "subscription" &&
          (prevSub.plan_id !== meta.plan_id || prevSub.billing_cycle !== meta.billing_cycle)
        ) {
          const { data: dup } = await admin
            .from("credit_transactions")
            .select("id")
            .eq("user_id", prevSub.user_id)
            .filter("metadata->>stripe_event_id", "eq", event.id)
            .maybeSingle();

          if (!dup) {
            const { data: plan } = await admin
              .from("plans")
              .select("credits_monthly, credits_yearly")
              .eq("id", meta.plan_id)
              .maybeSingle();

            if (plan) {
              const newPlanCredits = meta.billing_cycle === "yearly" ? plan.credits_yearly : plan.credits_monthly;
              const { data: cur } = await admin
                .from("user_credits")
                .select("balance, plan_credits, topup_credits, rollover_credits")
                .eq("user_id", prevSub.user_id)
                .maybeSingle();

              const isUpgrade = newPlanCredits > (cur?.plan_credits ?? 0);
              const topup = cur?.topup_credits ?? 0;
              const rollover = cur?.rollover_credits ?? 0;
              // Upgrade: dá o saldo cheio do novo plano. Downgrade: cap no novo plano.
              const newPlanBalance = isUpgrade ? newPlanCredits : Math.min(cur?.plan_credits ?? 0, newPlanCredits);
              const newBalance = newPlanBalance + rollover + topup;
              const delta = newBalance - (cur?.balance ?? 0);

              await admin.from("user_credits").update({
                balance: newBalance,
                plan_credits: newPlanBalance,
                last_reset_at: new Date().toISOString(),
                next_reset_at: periodEnd,
                updated_at: new Date().toISOString(),
              }).eq("user_id", prevSub.user_id);

              await admin.from("credit_transactions").insert({
                user_id: prevSub.user_id,
                type: delta >= 0 ? "credit" : "debit",
                amount: Math.abs(delta),
                balance_after: newBalance,
                reason: `${isUpgrade ? "Upgrade" : "Downgrade"} ${prevSub.plan_id}→${meta.plan_id} (${meta.billing_cycle})`,
                metadata: { stripe_event_id: event.id, plan_change: true, from: prevSub.plan_id, to: meta.plan_id },
              });

              await admin.from("profiles").update({
                credits: newBalance,
                updated_at: new Date().toISOString(),
              }).eq("id", prevSub.user_id);

              log("plan changed mid-cycle", { userId: prevSub.user_id, from: prevSub.plan_id, to: meta.plan_id, delta });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription?.id;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!subId && !customerId) break;

        const orFilter = subId
          ? `stripe_subscription_id.eq.${subId},stripe_customer_id.eq.${customerId}`
          : `stripe_customer_id.eq.${customerId}`;

        await admin
          .from("user_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .or(orFilter);
        log("payment failed → past_due", { subId, customerId });
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || (session.metadata as any)?.user_id;
        const md = (session.metadata ?? {}) as Record<string, string>;

        // ─── Coupon redemption (subscription OR payment) ───
        if (md.coupon_id && userId) {
          const { data: existsRedemption } = await admin
            .from("coupon_redemptions")
            .select("id")
            .eq("coupon_id", md.coupon_id)
            .eq("user_id", userId)
            .maybeSingle();

          if (!existsRedemption) {
            const couponType = md.coupon_type;
            const couponValue = Number(md.coupon_value ?? 0);
            let creditsGranted: number | null = null;
            let discountBrl: number | null = null;

            if (couponType === "credits_bonus" && couponValue > 0) {
              const { error: cErr } = await admin.rpc("credit_user_credits", {
                p_user_id: userId,
                p_amount: couponValue,
                p_type: "credit",
                p_reason: `Bônus cupom ${md.coupon_code}`,
                p_generation_id: null,
                p_metadata: { coupon_id: md.coupon_id, coupon_code: md.coupon_code, stripe_session_id: session.id },
              });
              if (cErr) log("coupon bonus credit error", { err: cErr.message });
              else creditsGranted = couponValue;
            } else if (couponType === "percent_off") {
              const totalCents = (session.amount_subtotal ?? 0) - (session.amount_total ?? 0);
              discountBrl = totalCents > 0 ? totalCents / 100 : null;
            }

            await admin.from("coupon_redemptions").insert({
              coupon_id: md.coupon_id,
              user_id: userId,
              stripe_session_id: session.id,
              credits_granted: creditsGranted,
              discount_amount_brl: discountBrl,
            });

            // increment counter (best-effort)
            const { data: cp } = await admin.from("coupons").select("redemptions_count").eq("id", md.coupon_id).maybeSingle();
            if (cp) {
              await admin.from("coupons").update({
                redemptions_count: (cp.redemptions_count ?? 0) + 1,
                updated_at: new Date().toISOString(),
              }).eq("id", md.coupon_id);
            }
            log("coupon redeemed", { userId, coupon: md.coupon_code });
          }
        }

        // Fallback: se for top-up e verify-payment não tiver rodado, credita aqui.
        if (session.mode !== "payment") break;
        if (!userId) { log("no user_id in session", { id: session.id }); break; }

        const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items"] });
        const priceId = full.line_items?.data[0]?.price?.id;
        if (!priceId) break;
        const meta = STRIPE_PRICES[priceId];
        if (!meta || meta.kind !== "topup") break;

        const { data: dup } = await admin
          .from("credit_transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "topup")
          .filter("metadata->>stripe_session_id", "eq", session.id)
          .maybeSingle();
        if (dup) { log("topup already credited", { session: session.id }); break; }

        const { error } = await admin.rpc("credit_user_credits", {
          p_user_id: userId,
          p_amount: meta.credits,
          p_type: "topup",
          p_reason: `Top-up ${meta.topup_id} (webhook)`,
          p_generation_id: null,
          p_metadata: { stripe_session_id: session.id, stripe_event_id: event.id, topup_id: meta.topup_id, price_id: priceId },
        });
        if (error) { log("topup credit error", { err: error.message }); break; }
        log("topup credited via webhook", { userId, credits: meta.credits });
        break;
      }

      default:
        log("ignored", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    log("handler error", { err: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: "Handler failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
