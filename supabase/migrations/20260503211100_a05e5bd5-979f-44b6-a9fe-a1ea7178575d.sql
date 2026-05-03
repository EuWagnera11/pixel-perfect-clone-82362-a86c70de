-- ============= BUCKET =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('imageedit-outputs', 'imageedit-outputs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "imageedit-outputs public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'imageedit-outputs');

-- Owner-only write (pasta = user_id)
CREATE POLICY "imageedit-outputs owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'imageedit-outputs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "imageedit-outputs owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'imageedit-outputs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "imageedit-outputs owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'imageedit-outputs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============= imageedit_generations =============
CREATE TABLE public.imageedit_generations (
  generation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text NOT NULL,
  model text NOT NULL,
  task_id text,
  status text NOT NULL DEFAULT 'PENDING',
  input_urls jsonb DEFAULT '[]'::jsonb,
  output_url text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_imageedit_user_created ON public.imageedit_generations(user_id, created_at DESC);
CREATE INDEX idx_imageedit_tool ON public.imageedit_generations(tool);
CREATE INDEX idx_imageedit_status ON public.imageedit_generations(status);

ALTER TABLE public.imageedit_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own imageedit gens"
ON public.imageedit_generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own imageedit gens"
ON public.imageedit_generations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own imageedit gens"
ON public.imageedit_generations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own imageedit gens"
ON public.imageedit_generations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============= face_swap_logs =============
CREATE TABLE public.face_swap_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.imageedit_generations(generation_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_face_hash text,
  target_image_hash text,
  reported boolean NOT NULL DEFAULT false,
  report_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_face_swap_user ON public.face_swap_logs(user_id, created_at DESC);
CREATE INDEX idx_face_swap_reported ON public.face_swap_logs(reported) WHERE reported = true;

ALTER TABLE public.face_swap_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own face_swap_logs"
ON public.face_swap_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- inserts feitos via service role (edge function); sem policy de insert pra users.

-- ============= cloth_swap_logs =============
CREATE TABLE public.cloth_swap_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.imageedit_generations(generation_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  person_image_hash text,
  garment_image_hash text,
  category text,
  reported boolean NOT NULL DEFAULT false,
  report_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cloth_swap_user ON public.cloth_swap_logs(user_id, created_at DESC);
CREATE INDEX idx_cloth_swap_reported ON public.cloth_swap_logs(reported) WHERE reported = true;

ALTER TABLE public.cloth_swap_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cloth_swap_logs"
ON public.cloth_swap_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============= user_tos_accepts =============
CREATE TABLE public.user_tos_accepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,    -- 'face-swap' | 'cloth-swap'
  version text NOT NULL,    -- ex: 'v1'
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (user_id, feature, version)
);

CREATE INDEX idx_user_tos_lookup ON public.user_tos_accepts(user_id, feature, version);

ALTER TABLE public.user_tos_accepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tos accepts"
ON public.user_tos_accepts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own tos accepts"
ON public.user_tos_accepts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);