CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_since timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH
  user_counts AS (
    SELECT
      COUNT(*) AS total_users,
      COUNT(*) FILTER (WHERE created_at >= v_since) AS new_users
    FROM public.profiles
  ),
  sub_counts AS (
    SELECT
      s.plan_id, s.billing_cycle, COUNT(*) AS subs,
      COALESCE(SUM(
        CASE WHEN s.billing_cycle = 'yearly' THEN COALESCE(p.price_yearly_brl, 0) / 12.0
             ELSE COALESCE(p.price_monthly_brl, 0) END
      ), 0) AS mrr_brl
    FROM public.user_subscriptions s
    LEFT JOIN public.plans p ON p.id = s.plan_id
    WHERE s.status IN ('active', 'trialing', 'past_due')
    GROUP BY s.plan_id, s.billing_cycle
  ),
  credits_period AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'debit'), 0) AS credits_spent,
      COALESCE(SUM(amount) FILTER (WHERE type = 'topup'), 0) AS credits_topup,
      COALESCE(SUM(amount) FILTER (WHERE type = 'reset'), 0) AS credits_reset,
      COALESCE(SUM(amount) FILTER (WHERE type = 'refund'), 0) AS credits_refunded,
      COUNT(*) FILTER (WHERE type = 'debit') AS debit_tx_count
    FROM public.credit_transactions
    WHERE created_at >= v_since
  ),
  gen_status AS (
    SELECT status::text AS status, COUNT(*) AS n
    FROM public.generations
    WHERE created_at >= v_since
    GROUP BY status
  ),
  top_users AS (
    SELECT ct.user_id, pr.full_name, SUM(ct.amount) AS spent
    FROM public.credit_transactions ct
    LEFT JOIN public.profiles pr ON pr.id = ct.user_id
    WHERE ct.type = 'debit' AND ct.created_at >= v_since
    GROUP BY ct.user_id, pr.full_name
    ORDER BY spent DESC LIMIT 10
  ),
  recent_errors AS (
    SELECT g.id, g.user_id, g.tool, g.model, g.error_message, g.created_at, g.credits_used,
           EXISTS(
             SELECT 1 FROM public.credit_transactions ct
             WHERE ct.generation_id = g.id AND ct.type = 'refund'
           ) AS refunded
    FROM public.generations g
    WHERE g.status = 'failed'
    ORDER BY g.created_at DESC LIMIT 30
  )
  SELECT jsonb_build_object(
    'period_days', p_days,
    'users', (SELECT row_to_json(uc) FROM user_counts uc),
    'mrr_brl', (SELECT COALESCE(SUM(mrr_brl), 0) FROM sub_counts),
    'subscriptions_by_plan', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'plan_id', plan_id, 'billing_cycle', billing_cycle, 'subs', subs, 'mrr_brl', mrr_brl
      )) FROM sub_counts), '[]'::jsonb),
    'credits', (SELECT row_to_json(cp) FROM credits_period cp),
    'generations_by_status', COALESCE((SELECT jsonb_object_agg(status, n) FROM gen_status), '{}'::jsonb),
    'top_consumers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'user_id', user_id, 'name', full_name, 'spent', spent
      )) FROM top_users), '[]'::jsonb),
    'recent_errors', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'user_id', user_id, 'tool', tool, 'model', model,
        'error', error_message, 'at', created_at,
        'credits_used', credits_used, 'refunded', refunded
      )) FROM recent_errors), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;