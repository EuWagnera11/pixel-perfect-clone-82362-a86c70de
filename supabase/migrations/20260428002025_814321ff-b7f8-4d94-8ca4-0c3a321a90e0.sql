-- Enum para planos
CREATE TYPE public.subscription_tier AS ENUM ('free', 'starter', 'pro', 'agency', 'enterprise');

-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'agency');

-- Enum status geração
CREATE TYPE public.generation_status AS ENUM ('queued', 'processing', 'enhancing', 'upscaling', 'completed', 'failed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  credits INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PERSONAS ============
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reference_image_url TEXT,
  canonical_grid_url TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own personas" ON public.personas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own personas" ON public.personas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own personas" ON public.personas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own personas" ON public.personas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ TEMPLATES ============
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  prompt TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  uses_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views public templates" ON public.templates
  FOR SELECT TO authenticated
  USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users create own templates" ON public.templates
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update own templates" ON public.templates
  FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Admins manage all templates" ON public.templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own templates" ON public.templates
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- ============ GENERATIONS ============
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  status public.generation_status NOT NULL DEFAULT 'queued',
  prompt TEXT,
  aspect_ratio TEXT DEFAULT '4:5',
  resolution TEXT DEFAULT '2K',
  num_variations INTEGER DEFAULT 4,
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own generations" ON public.generations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own generations" ON public.generations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own generations" ON public.generations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER personas_updated_at BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-criar profile + role no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'creator');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed templates iniciais
INSERT INTO public.templates (name, category, description, prompt, uses_count, rating, preview_url) VALUES
('Mediterranean Travel', 'Travel', 'Costa mediterrânea ao pôr do sol, vibe coastal premium', 'editorial photograph, mediterranean coast, golden hour', 234, 4.8, '/templates/mediterranean.jpg'),
('Brazilian Beach Editorial', 'Beach', 'Praia brasileira, luz dourada, vibe orgânica', 'brazilian beach, natural light, editorial', 189, 4.7, '/templates/beach.jpg'),
('Café Lifestyle Selfie', 'Lifestyle', 'Café aconchegante, mood matinal, autêntico', 'cozy café morning, lifestyle selfie', 312, 4.9, '/templates/cafe.jpg'),
('Fitness Mirror Selfie', 'Fitness', 'Academia premium, espelho, lighting técnico', 'modern gym, mirror selfie, fitness aesthetic', 156, 4.6, '/templates/fitness.jpg'),
('OOTD Streetwear Europa', 'Editorial', 'Streetwear europeu, ruas históricas', 'european street fashion, ootd, streetwear', 278, 4.8, '/templates/ootd.jpg'),
('Editorial Studio Close-up', 'Editorial', 'Close editorial em estúdio, beauty premium', 'studio beauty close-up, editorial lighting', 421, 4.9, '/templates/studio.jpg'),
('Hotel Suite Glamour', 'Lifestyle', 'Suíte de hotel luxo, glamour cinematográfico', 'luxury hotel suite, glamour, cinematic', 198, 4.7, '/templates/hotel.jpg'),
('Roof Sunset Cocktail', 'Lifestyle', 'Rooftop ao pôr do sol, drink na mão', 'rooftop sunset, cocktail, golden hour', 167, 4.7, '/templates/rooftop.jpg'),
('Walking Street Cinematic', 'Editorial', 'Caminhada urbana cinematográfica', 'walking down street, cinematic, urban', 245, 4.8, '/templates/street.jpg'),
('Festival Cultural', 'Editorial', 'Festival cultural latino, cores vibrantes', 'cultural festival, vibrant colors, latin', 134, 4.6, '/templates/festival.jpg'),
('Ski Alpine Winter', 'Travel', 'Alpes nevados, ski resort premium', 'alpine ski resort, snow, winter fashion', 98, 4.5, '/templates/ski.jpg'),
('Boudoir Slip Dress', 'Editorial', 'Boudoir refinado, slip dress, luz natural', 'boudoir slip dress, natural light, refined', 187, 4.8, '/templates/boudoir.jpg');