-- Drive imports + Learned styles (custom templates a partir de pastas Drive)

-- ============ DRIVE IMPORTS ============
CREATE TABLE public.drive_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_drive', 'dropbox', 'instagram', 'manual_upload')),
  source_url TEXT NOT NULL,
  folder_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'importing', 'analyzing', 'ready', 'failed')),
  total_files INTEGER NOT NULL DEFAULT 0,
  imported_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  storage_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.drive_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own drive_imports" ON public.drive_imports FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ LEARNED STYLES (custom templates extraídos via análise IA) ============
CREATE TABLE public.learned_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drive_import_id UUID REFERENCES public.drive_imports(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  style_summary JSONB NOT NULL DEFAULT '{}'::jsonb,  -- output do Opus 4.7 vision
  prompt_template TEXT NOT NULL,                       -- prompt base pra reproduzir o estilo
  example_count INTEGER NOT NULL DEFAULT 0,
  example_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.learned_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own learned_styles" ON public.learned_styles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ RECREATE JOBS (recriar fotos de pasta Drive com modelo do cliente) ============
CREATE TABLE public.recreate_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  drive_import_id UUID NOT NULL REFERENCES public.drive_imports(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  total_files INTEGER NOT NULL DEFAULT 0,
  completed_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  generation_ids UUID[] DEFAULT ARRAY[]::UUID[],
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,  -- skin_enhance, magnific, preserve_logos, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.recreate_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own recreate_jobs" ON public.recreate_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Adicionar relacionamento generations → recreate_job ============
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS recreate_job_id UUID REFERENCES public.recreate_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_image_path TEXT,           -- caminho da foto original (no Drive)
  ADD COLUMN IF NOT EXISTS learned_style_id UUID REFERENCES public.learned_styles(id) ON DELETE SET NULL;

-- ============ BATCH JOBS (mass image/video generation) ============
CREATE TABLE public.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('batch_image','batch_video','face_swap','scene_swap','cloth_swap','recreate')),
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  generation_ids UUID[] DEFAULT ARRAY[]::UUID[],
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own batch_jobs" ON public.batch_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_drive_imports_user ON public.drive_imports(user_id);
CREATE INDEX idx_learned_styles_user ON public.learned_styles(user_id);
CREATE INDEX idx_recreate_jobs_user ON public.recreate_jobs(user_id);
CREATE INDEX idx_batch_jobs_user ON public.batch_jobs(user_id);
CREATE INDEX idx_generations_recreate ON public.generations(recreate_job_id) WHERE recreate_job_id IS NOT NULL;
