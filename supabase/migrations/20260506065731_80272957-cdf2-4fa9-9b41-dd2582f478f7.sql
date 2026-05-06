CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  user_id uuid NOT NULL,
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window
  ON public.rate_limit_buckets (window_start);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Sem policies públicas: somente service role acessa.

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'no_user');
  END IF;

  -- Janela alinhada (tumbling window) em múltiplos de p_window_seconds
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  ) AT TIME ZONE 'UTC';

  INSERT INTO public.rate_limit_buckets (user_id, bucket_key, window_start, count, updated_at)
  VALUES (p_user_id, p_bucket, v_window_start, 1, now())
  ON CONFLICT (user_id, bucket_key, window_start)
  DO UPDATE SET count = public.rate_limit_buckets.count + 1, updated_at = now()
  RETURNING count INTO v_count;

  IF v_count > p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', p_limit,
      'count', v_count,
      'retry_after_seconds', GREATEST(1,
        p_window_seconds - extract(epoch from (now() - v_window_start))::int
      )
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'limit', p_limit, 'count', v_count, 'remaining', p_limit - v_count);
END;
$$;

-- Faxina: remove buckets antigos (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.rate_limit_buckets
   WHERE window_start < now() - INTERVAL '1 day';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;