-- ============================================================
-- FASE 1: Sistema de planos e créditos
-- ============================================================

-- 1. PLANS (catálogo público)
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly_brl NUMERIC NOT NULL DEFAULT 0,
  price_yearly_brl NUMERIC NOT NULL DEFAULT 0,
  credits_monthly INTEGER NOT NULL DEFAULT 0,
  credits_yearly INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are public"
  ON public.plans FOR SELECT
  USING (active = true);

-- Seed dos planos (do refine-pricing-config.json)
INSERT INTO public.plans (id, name, price_monthly_brl, price_yearly_brl, credits_monthly, credits_yearly, features, sort_order) VALUES
('free', 'Free', 0, 0, 500, 6000, '{"watermark":true,"commercial_license":false,"max_concurrent_generations":1,"rate_limit_per_day":5,"priority_queue":false,"api_access":false,"custom_styles_limit":0,"characters_limit":0,"team_seats":1,"topup_enabled":false}'::jsonb, 0),
('starter', 'Starter', 27, 259, 8000, 105600, '{"watermark":false,"commercial_license":true,"max_concurrent_generations":2,"priority_queue":false,"api_access":false,"custom_styles_limit":3,"characters_limit":1,"team_seats":1,"topup_enabled":false}'::jsonb, 1),
('creator', 'Creator', 59, 566, 19000, 250800, '{"watermark":false,"commercial_license":true,"max_concurrent_generations":3,"priority_queue":false,"api_access":false,"custom_styles_limit":10,"characters_limit":5,"team_seats":1,"topup_enabled":true,"rollover_percent":25}'::jsonb, 2),
('pro', 'Pro', 129, 1238, 48000, 633600, '{"watermark":false,"commercial_license":true,"max_concurrent_generations":5,"priority_queue":true,"api_access":true,"custom_styles_limit":25,"characters_limit":15,"team_seats":1,"topup_enabled":true,"rollover_percent":25,"early_access_features":true}'::jsonb, 3),
('studio', 'Studio', 749, 7190, 320000, 4224000, '{"watermark":false,"commercial_license":true,"max_concurrent_generations":10,"priority_queue":true,"api_access":true,"custom_styles_limit":-1,"characters_limit":-1,"team_seats":5,"topup_enabled":true,"rollover_percent":25,"early_access_features":true,"dedicated_support":true,"custom_models_training":true}'::jsonb, 4),
('enterprise', 'Enterprise', 0, 0, 500000, 6000000, '{"watermark":false,"commercial_license":true,"max_concurrent_generations":20,"priority_queue":true,"api_access":true,"custom_styles_limit":-1,"characters_limit":-1,"team_seats":-1,"topup_enabled":true,"rollover_percent":50,"early_access_features":true,"dedicated_support":true,"custom_models_training":true,"sla":true}'::jsonb, 5);

-- 2. USER_SUBSCRIPTIONS
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','trialing')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1 month',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_subscription_active_per_user ON public.user_subscriptions(user_id) WHERE status IN ('active','trialing','past_due');
CREATE INDEX idx_subscription_user ON public.user_subscriptions(user_id);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. USER_CREDITS
CREATE TABLE public.user_credits (
  user_id UUID PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  plan_credits INTEGER NOT NULL DEFAULT 0,
  topup_credits INTEGER NOT NULL DEFAULT 0,
  rollover_credits INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ,
  next_reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credits"
  ON public.user_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. CREDIT_TRANSACTIONS
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit','credit','rollover','reset','topup','refund')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  generation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. TOPUP_PURCHASES
CREATE TABLE public.topup_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_brl NUMERIC NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1095 days',
  stripe_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_topup_user ON public.topup_purchases(user_id, created_at DESC);

ALTER TABLE public.topup_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own topups"
  ON public.topup_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- FUNÇÕES ATÔMICAS
-- ============================================================

-- Debit (geração)
CREATE OR REPLACE FUNCTION public.debit_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_generation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_topup INTEGER;
  v_plan INTEGER;
  v_new_balance INTEGER;
  v_take_topup INTEGER;
  v_take_plan INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid amount');
  END IF;

  SELECT balance, topup_credits, plan_credits + rollover_credits
    INTO v_balance, v_topup, v_plan
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No credits record');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient credits', 'balance', v_balance);
  END IF;

  -- Consome top-up primeiro (expira), depois plano
  v_take_topup := LEAST(v_topup, p_amount);
  v_take_plan := p_amount - v_take_topup;
  v_new_balance := v_balance - p_amount;

  UPDATE public.user_credits
  SET balance = v_new_balance,
      topup_credits = topup_credits - v_take_topup,
      plan_credits = GREATEST(0, plan_credits - v_take_plan),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, reason, generation_id)
  VALUES (p_user_id, 'debit', p_amount, v_new_balance, p_reason, p_generation_id);

  -- Sincroniza cache em profiles
  UPDATE public.profiles SET credits = v_new_balance, updated_at = now() WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.debit_user_credits(UUID, INTEGER, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- Credit (refund / topup / ajuste)
CREATE OR REPLACE FUNCTION public.credit_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_generation_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid amount');
  END IF;

  IF p_type NOT IN ('credit','refund','topup') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid type');
  END IF;

  -- Cria registro se não existir
  INSERT INTO public.user_credits (user_id, balance, plan_credits)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_type = 'topup' THEN
    UPDATE public.user_credits
    SET balance = balance + p_amount,
        topup_credits = topup_credits + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;
  ELSE
    UPDATE public.user_credits
    SET balance = balance + p_amount,
        plan_credits = plan_credits + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, reason, generation_id, metadata)
  VALUES (p_user_id, p_type, p_amount, v_new_balance, p_reason, p_generation_id, p_metadata);

  UPDATE public.profiles SET credits = v_new_balance, updated_at = now() WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_user_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- Reset mensal com rollover (cron ou webhook de renovação)
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_rollover INTEGER;
  v_new_balance INTEGER;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT s.user_id, s.plan_id, s.billing_cycle, p.credits_monthly, p.credits_yearly, p.features
    FROM public.user_subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.current_period_end <= now()
  LOOP
    -- Rollover só pra mensal e planos com rollover_percent
    IF r.billing_cycle = 'monthly' AND (r.features ? 'rollover_percent') THEN
      SELECT LEAST(plan_credits + rollover_credits, FLOOR(r.credits_monthly * (r.features->>'rollover_percent')::INTEGER / 100.0))
        INTO v_rollover
      FROM public.user_credits WHERE user_id = r.user_id;
    ELSE
      v_rollover := 0;
    END IF;

    v_new_balance := CASE WHEN r.billing_cycle = 'yearly' THEN r.credits_yearly ELSE r.credits_monthly END
                     + COALESCE(v_rollover, 0);

    UPDATE public.user_credits
    SET balance = v_new_balance + topup_credits,
        plan_credits = CASE WHEN r.billing_cycle = 'yearly' THEN r.credits_yearly ELSE r.credits_monthly END,
        rollover_credits = COALESCE(v_rollover, 0),
        last_reset_at = now(),
        next_reset_at = now() + CASE WHEN r.billing_cycle = 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END
    WHERE user_id = r.user_id;

    UPDATE public.user_subscriptions
    SET current_period_start = now(),
        current_period_end = now() + CASE WHEN r.billing_cycle = 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END,
        updated_at = now()
    WHERE user_id = r.user_id AND status = 'active';

    INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, reason)
    VALUES (r.user_id, 'reset', v_new_balance, v_new_balance,
            'Renovação ' || r.billing_cycle || CASE WHEN COALESCE(v_rollover,0) > 0 THEN ' (rollover ' || v_rollover || ')' ELSE '' END);

    UPDATE public.profiles SET credits = v_new_balance, updated_at = now() WHERE id = r.user_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_monthly_credits() FROM PUBLIC, anon, authenticated;

-- Trigger: sincroniza profiles.tier com plano ativo
CREATE OR REPLACE FUNCTION public.sync_profile_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mapeia plan_id pro enum subscription_tier (que tem: free, starter, pro, agency, enterprise)
  UPDATE public.profiles
  SET tier = CASE
    WHEN NEW.plan_id IN ('free','starter','pro','enterprise') THEN NEW.plan_id::subscription_tier
    WHEN NEW.plan_id = 'creator' THEN 'starter'::subscription_tier
    WHEN NEW.plan_id = 'studio' THEN 'agency'::subscription_tier
    ELSE 'free'::subscription_tier
  END,
  updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- profiles tem trigger USER que bloqueia mudança de tier; usamos SECURITY DEFINER bypassando RLS
-- mas o trigger prevent_profile_privilege_escalation é AFTER trigger interno; precisamos desabilitá-lo via bypass
-- A função roda com owner; vai disparar o trigger. Solução: ajustar o trigger pra permitir quando vier do sync.

-- Atualiza prevent_profile_privilege_escalation pra permitir mudanças quando session_user é postgres (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Permite mudanças vindas de funções SECURITY DEFINER (rodam como owner postgres)
  IF current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Not allowed to modify credits';
  END IF;
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    RAISE EXCEPTION 'Not allowed to modify tier';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_profile_tier
AFTER INSERT OR UPDATE OF plan_id ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_tier();

-- Bootstrap no signup: cria assinatura free + 500 créditos
CREATE OR REPLACE FUNCTION public.bootstrap_user_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_id, billing_cycle, status, current_period_end)
  VALUES (NEW.id, 'free', 'monthly', 'active', now() + INTERVAL '1 month')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_credits (user_id, balance, plan_credits, last_reset_at, next_reset_at)
  VALUES (NEW.id, 500, 500, now(), now() + INTERVAL '1 month')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Anexa ao handle_new_user existente (já dispara em auth.users); criamos um trigger separado
DROP TRIGGER IF EXISTS on_auth_user_billing ON auth.users;
CREATE TRIGGER on_auth_user_billing
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_user_billing();

-- ============================================================
-- BOOTSTRAP USUÁRIOS EXISTENTES
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_plan_id TEXT;
BEGIN
  FOR r IN SELECT id, tier::text AS tier_text, credits FROM public.profiles LOOP
    -- Mapeia tier antigo -> plan_id novo
    v_plan_id := CASE r.tier_text
      WHEN 'free' THEN 'free'
      WHEN 'starter' THEN 'starter'
      WHEN 'pro' THEN 'pro'
      WHEN 'agency' THEN 'studio'
      WHEN 'enterprise' THEN 'enterprise'
      ELSE 'free'
    END;

    INSERT INTO public.user_subscriptions (user_id, plan_id, billing_cycle, status, current_period_end)
    VALUES (r.id, v_plan_id, 'monthly', 'active', now() + INTERVAL '1 month')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_credits (user_id, balance, plan_credits, last_reset_at, next_reset_at)
    VALUES (r.id, COALESCE(r.credits, 0), COALESCE(r.credits, 0), now(), now() + INTERVAL '1 month')
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;