// Mapeamento Price ID Stripe → metadados internos.
// Source of truth pra checkout, verify-payment e check-subscription.

export type SubscriptionPriceMeta = {
  kind: "subscription";
  plan_id: "starter" | "creator" | "pro" | "studio";
  billing_cycle: "monthly" | "yearly";
  product_id: string;
};

export type TopupPriceMeta = {
  kind: "topup";
  topup_id: "mini" | "medium" | "large" | "mega";
  credits: number;
  product_id: string;
};

export type PriceMeta = SubscriptionPriceMeta | TopupPriceMeta;

export const STRIPE_PRICES: Record<string, PriceMeta> = {
  // ── Subscriptions ──
  price_1TTxY8Jqy76NEQfcRr9JrWEe: { kind: "subscription", plan_id: "starter", billing_cycle: "monthly", product_id: "prod_UStKV8qUroYnDP" },
  price_1TTxYFJqy76NEQfcVHL134Q2: { kind: "subscription", plan_id: "starter", billing_cycle: "yearly",  product_id: "prod_UStKNE1yrrXwoT" },
  price_1TTxYGJqy76NEQfc9BJsTMNU: { kind: "subscription", plan_id: "creator", billing_cycle: "monthly", product_id: "prod_UStKLYwvT7UP94" },
  price_1TTxYHJqy76NEQfc9Nuh0Ajn: { kind: "subscription", plan_id: "creator", billing_cycle: "yearly",  product_id: "prod_UStK18AtWeQImI" },
  price_1TTxYJJqy76NEQfccXtoIK8A: { kind: "subscription", plan_id: "pro",     billing_cycle: "monthly", product_id: "prod_UStKJAugeyxsJQ" },
  price_1TTxYKJqy76NEQfcW4NsO0lj: { kind: "subscription", plan_id: "pro",     billing_cycle: "yearly",  product_id: "prod_UStLoecoIuHc60" },
  price_1TTxYLJqy76NEQfcRXPz3O1l: { kind: "subscription", plan_id: "studio",  billing_cycle: "monthly", product_id: "prod_UStLFdlsAOBo4p" },
  price_1TTxYMJqy76NEQfckE6KHzdc: { kind: "subscription", plan_id: "studio",  billing_cycle: "yearly",  product_id: "prod_UStLnvucxOMA6B" },
  // ── Top-ups (one-time) ──
  price_1TTxYOJqy76NEQfc64lNWv1V: { kind: "topup", topup_id: "mini",   credits: 5000,  product_id: "prod_UStLdWM93CIUEm" },
  price_1TTxYPJqy76NEQfcRqvgRnwV: { kind: "topup", topup_id: "medium", credits: 11500, product_id: "prod_UStLuRL4bjZxZO" },
  price_1TTxYQJqy76NEQfcbBNeQV3q: { kind: "topup", topup_id: "large",  credits: 30000, product_id: "prod_UStLvJYVErHj3F" },
  price_1TTxYRJqy76NEQfcCmCwoJvD: { kind: "topup", topup_id: "mega",   credits: 75000, product_id: "prod_UStLQR3qgUtv5u" },
};

// Lookups por chave amigável usada pelo frontend
export const SUBSCRIPTION_PRICE_BY_KEY: Record<string, string> = {
  starter_monthly: "price_1TTxY8Jqy76NEQfcRr9JrWEe",
  starter_yearly:  "price_1TTxYFJqy76NEQfcVHL134Q2",
  creator_monthly: "price_1TTxYGJqy76NEQfc9BJsTMNU",
  creator_yearly:  "price_1TTxYHJqy76NEQfc9Nuh0Ajn",
  pro_monthly:     "price_1TTxYJJqy76NEQfccXtoIK8A",
  pro_yearly:      "price_1TTxYKJqy76NEQfcW4NsO0lj",
  studio_monthly:  "price_1TTxYLJqy76NEQfcRXPz3O1l",
  studio_yearly:   "price_1TTxYMJqy76NEQfckE6KHzdc",
};

export const TOPUP_PRICE_BY_KEY: Record<string, string> = {
  mini:   "price_1TTxYOJqy76NEQfc64lNWv1V",
  medium: "price_1TTxYPJqy76NEQfcRqvgRnwV",
  large:  "price_1TTxYQJqy76NEQfcbBNeQV3q",
  mega:   "price_1TTxYRJqy76NEQfcCmCwoJvD",
};
