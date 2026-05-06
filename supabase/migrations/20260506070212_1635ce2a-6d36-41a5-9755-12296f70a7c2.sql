CREATE OR REPLACE FUNCTION public.admin_refund_generation(
  p_generation_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_gen RECORD;
  v_already RECORD;
  v_credit jsonb;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id, user_id, credits_used, status, tool, model
    INTO v_gen
  FROM public.generations
  WHERE id = p_generation_id;

  IF v_gen.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'generation_not_found');
  END IF;

  IF COALESCE(v_gen.credits_used, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'nothing_to_refund');
  END IF;

  -- Idempotência: já existe refund pra essa geração?
  SELECT id INTO v_already
  FROM public.credit_transactions
  WHERE generation_id = p_generation_id AND type = 'refund'
  LIMIT 1;

  IF v_already.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_refunded');
  END IF;

  -- Credita de volta como refund
  v_credit := public.credit_user_credits(
    v_gen.user_id,
    v_gen.credits_used,
    'refund',
    COALESCE(p_reason, 'Reembolso admin: ' || COALESCE(v_gen.tool, '') || ' / ' || COALESCE(v_gen.model, '')),
    p_generation_id,
    jsonb_build_object('refunded_by', v_admin, 'original_status', v_gen.status)
  );

  -- Zera credits_used pra refletir o reembolso
  UPDATE public.generations
  SET credits_used = 0,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refunded_at', now(),
        'refunded_by', v_admin,
        'refunded_amount', v_gen.credits_used
      )
  WHERE id = p_generation_id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded_amount', v_gen.credits_used,
    'user_id', v_gen.user_id,
    'credit_result', v_credit
  );
END;
$$;