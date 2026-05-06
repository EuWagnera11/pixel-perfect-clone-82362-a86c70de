
-- enums
DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('percent_off','credits_bonus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_applies_to AS ENUM ('subscription','topup','both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type coupon_type NOT NULL,
  value integer NOT NULL CHECK (value > 0),
  applies_to coupon_applies_to NOT NULL DEFAULT 'both',
  max_redemptions integer,
  redemptions_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  stripe_coupon_id text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_session_id text,
  credits_granted integer,
  discount_amount_brl numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage redemptions"
  ON public.coupon_redemptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- validate_coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_context text DEFAULT 'both')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_coupon public.coupons%ROWTYPE;
  v_used_count integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_coupon FROM public.coupons
   WHERE upper(code) = upper(p_code) LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;

  IF NOT v_coupon.active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'inactive');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.redemptions_count >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'error', 'limit_reached');
  END IF;

  IF p_context IN ('subscription','topup')
     AND v_coupon.applies_to <> 'both'
     AND v_coupon.applies_to::text <> p_context THEN
    RETURN jsonb_build_object('valid', false, 'error', 'wrong_context');
  END IF;

  SELECT COUNT(*) INTO v_used_count FROM public.coupon_redemptions
   WHERE coupon_id = v_coupon.id AND user_id = v_user;
  IF v_used_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'already_used');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'type', v_coupon.type,
    'value', v_coupon.value,
    'applies_to', v_coupon.applies_to,
    'stripe_coupon_id', v_coupon.stripe_coupon_id,
    'description', v_coupon.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, text) TO authenticated;
