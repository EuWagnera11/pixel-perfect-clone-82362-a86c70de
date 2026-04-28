-- ============================================================
-- Content Calendars — calendário de conteúdo (mês inteiro)
-- User: brief + persona + n_posts → sistema monta calendário automático
-- e dispara batch de N generations.
-- ============================================================

-- ============ CONTENT CALENDARS ============
CREATE TABLE IF NOT EXISTS public.content_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brief TEXT,
  start_date DATE,
  end_date DATE,
  pack_key TEXT,          -- pack pré-curado usado (lifestyle_30d, travel_30d, etc)
  n_posts INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','ready','failed')),
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  batch_job_id UUID REFERENCES public.batch_jobs(id) ON DELETE SET NULL,
  generation_ids UUID[] DEFAULT ARRAY[]::UUID[],
  posts JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{date, caption, prompt, template_id, generation_id}]
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.content_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own content_calendars" ON public.content_calendars FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_calendars_user ON public.content_calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendars_status ON public.content_calendars(status);

-- ============ CONTENT PACKS (templates curados pra calendário) ============
CREATE TABLE IF NOT EXISTS public.content_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  duration_days INTEGER NOT NULL,        -- 7, 15, 30
  template_keys TEXT[] DEFAULT ARRAY[]::TEXT[],  -- nomes/categorias usadas
  template_pattern JSONB NOT NULL DEFAULT '[]'::jsonb,  -- sequência ordenada [{day, category, sub_template}]
  recommended_credits INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads content_packs" ON public.content_packs FOR SELECT TO authenticated
  USING (true);

-- ============ SEED CONTENT PACKS ============
INSERT INTO public.content_packs (key, name, description, category, duration_days, template_pattern) VALUES

('lifestyle_30d', 'Lifestyle 30 dias', 'Mês completo de lifestyle: cafés, brunch, leitura, viagens, autocuidado', 'Lifestyle', 30,
 '[
   {"day":1,"category":"Lifestyle","sub":"Morning Coffee Ritual"},
   {"day":2,"category":"Lifestyle","sub":"Café Lifestyle"},
   {"day":3,"category":"Fashion","sub":"Old Money Luxury"},
   {"day":4,"category":"Lifestyle","sub":"Bookstore Aesthetic"},
   {"day":5,"category":"Wellness","sub":"Yoga Studio Sunset"},
   {"day":6,"category":"Lifestyle","sub":"Sunday Brunch"},
   {"day":7,"category":"Travel","sub":"Mediterranean Travel"},
   {"day":8,"category":"Lifestyle","sub":"Plant Lady"},
   {"day":9,"category":"Lifestyle","sub":"Cooking at Home"},
   {"day":10,"category":"Lifestyle","sub":"Rooftop Sunset"},
   {"day":11,"category":"Wellness","sub":"Smoothie Bowl"},
   {"day":12,"category":"Lifestyle","sub":"Vinyl Record Listening"},
   {"day":13,"category":"Fashion","sub":"Quiet Luxury"},
   {"day":14,"category":"Lifestyle","sub":"Wine Tasting"},
   {"day":15,"category":"Lifestyle","sub":"Self-Care Bath"},
   {"day":16,"category":"Travel","sub":"Café Premium SP"},
   {"day":17,"category":"Lifestyle","sub":"Picnic Park"},
   {"day":18,"category":"Aesthetics","sub":"Clean Girl"},
   {"day":19,"category":"Lifestyle","sub":"Late Night Snack"},
   {"day":20,"category":"Lifestyle","sub":"Convertible Drive"},
   {"day":21,"category":"Wellness","sub":"Pilates Reformer"},
   {"day":22,"category":"Lifestyle","sub":"Restaurant Fine Dining"},
   {"day":23,"category":"Lifestyle","sub":"Pajama Day"},
   {"day":24,"category":"Aesthetics","sub":"Old Money Riviera"},
   {"day":25,"category":"Lifestyle","sub":"Movie Night Cozy"},
   {"day":26,"category":"Wellness","sub":"Meditation Beach"},
   {"day":27,"category":"Lifestyle","sub":"Boating Lake"},
   {"day":28,"category":"Lifestyle","sub":"Vintage Polaroid"},
   {"day":29,"category":"Lifestyle","sub":"Cottage Garden"},
   {"day":30,"category":"Lifestyle","sub":"Ice Cream Truck"}
 ]'::jsonb),

('travel_30d', 'Travel 30 dias', 'Volta ao mundo em 30 dias: Europa, Ásia, Américas, África', 'Travel', 30,
 '[
   {"day":1,"category":"Travel","sub":"Santorini Sunset"},
   {"day":2,"category":"Travel","sub":"Maldives Bungalow"},
   {"day":3,"category":"Countries","sub":"Itália — Veneza"},
   {"day":4,"category":"Travel","sub":"Paris Eiffel Sunset"},
   {"day":5,"category":"Countries","sub":"Espanha — Barcelona"},
   {"day":6,"category":"Travel","sub":"Amalfi Lemon"},
   {"day":7,"category":"Countries","sub":"Grécia — Mykonos"},
   {"day":8,"category":"Countries","sub":"Reino Unido — Londres"},
   {"day":9,"category":"Travel","sub":"Tokyo Shibuya Night"},
   {"day":10,"category":"Travel","sub":"Bali Rice Terraces"},
   {"day":11,"category":"Countries","sub":"Coreia do Sul — Seoul"},
   {"day":12,"category":"Travel","sub":"Marrakech Souk"},
   {"day":13,"category":"Countries","sub":"Egito — Pirâmides"},
   {"day":14,"category":"Travel","sub":"Iceland Aurora"},
   {"day":15,"category":"Travel","sub":"Dubai Marina"},
   {"day":16,"category":"Countries","sub":"USA — Nova York"},
   {"day":17,"category":"Countries","sub":"USA — Miami Beach"},
   {"day":18,"category":"Countries","sub":"Cuba — Havana"},
   {"day":19,"category":"Countries","sub":"México — Cidade do México"},
   {"day":20,"category":"Countries","sub":"Brasil — Salvador"},
   {"day":21,"category":"Travel","sub":"Trancoso Praia"},
   {"day":22,"category":"Beach","sub":"Fernando de Noronha"},
   {"day":23,"category":"Countries","sub":"Argentina — Buenos Aires"},
   {"day":24,"category":"Countries","sub":"Peru — Machu Picchu"},
   {"day":25,"category":"Countries","sub":"Chile — Atacama"},
   {"day":26,"category":"Countries","sub":"Austrália — Sydney"},
   {"day":27,"category":"Travel","sub":"Patagonia Mountain"},
   {"day":28,"category":"Travel","sub":"Petra Jordan"},
   {"day":29,"category":"Countries","sub":"África do Sul — Cape Town"},
   {"day":30,"category":"Travel","sub":"Norwegian Fjord"}
 ]'::jsonb),

('fashion_30d', 'Fashion 30 dias', 'Mês completo fashion: editorial, runway, looks variados', 'Fashion', 30,
 '[
   {"day":1,"category":"Fashion","sub":"Runway Editorial"},
   {"day":2,"category":"Fashion","sub":"Old Money Luxury"},
   {"day":3,"category":"Fashion","sub":"Streetwear Hypebeast"},
   {"day":4,"category":"Fashion","sub":"Y2K Aesthetic"},
   {"day":5,"category":"Fashion","sub":"Dark Academia"},
   {"day":6,"category":"Fashion","sub":"Cottagecore Dream"},
   {"day":7,"category":"Fashion","sub":"Boho Festival"},
   {"day":8,"category":"Fashion","sub":"Vintage 70s Disco"},
   {"day":9,"category":"Fashion","sub":"Power Suit Boss"},
   {"day":10,"category":"Eras","sub":"Bridgerton Regency"},
   {"day":11,"category":"Fashion","sub":"Minimalist Beige"},
   {"day":12,"category":"Aesthetics","sub":"Mob Wife"},
   {"day":13,"category":"Fashion","sub":"Cyberpunk Neon"},
   {"day":14,"category":"Eras","sub":"Old Hollywood Glamour"},
   {"day":15,"category":"Fashion","sub":"Lingerie Boudoir"},
   {"day":16,"category":"Aesthetics","sub":"Coquette Pink"},
   {"day":17,"category":"Fashion","sub":"Street Style Milan"},
   {"day":18,"category":"Eras","sub":"Gatsby 20s"},
   {"day":19,"category":"Fashion","sub":"Wedding Bridal"},
   {"day":20,"category":"Eras","sub":"50s Pin-up"},
   {"day":21,"category":"Aesthetics","sub":"Quiet Luxury"},
   {"day":22,"category":"Fashion","sub":"Gothic Romance"},
   {"day":23,"category":"Eras","sub":"60s Mod"},
   {"day":24,"category":"Aesthetics","sub":"Goth Dark"},
   {"day":25,"category":"Eras","sub":"80s Madonna"},
   {"day":26,"category":"Aesthetics","sub":"Balletcore"},
   {"day":27,"category":"Eras","sub":"90s Grunge"},
   {"day":28,"category":"Fashion","sub":"Awards Red Carpet"},
   {"day":29,"category":"Eras","sub":"Audrey Hepburn"},
   {"day":30,"category":"Aesthetics","sub":"Tomato Girl Italian"}
 ]'::jsonb),

('fitness_30d', 'Fitness & Wellness 30 dias', 'Rotina fitness completa: treinos, yoga, comida saudável, lifestyle ativo', 'Fitness', 30,
 '[
   {"day":1,"category":"Wellness","sub":"Yoga Studio Sunset"},
   {"day":2,"category":"Sports","sub":"Crossfit Box"},
   {"day":3,"category":"Wellness","sub":"Running Park"},
   {"day":4,"category":"Wellness","sub":"Smoothie Bowl"},
   {"day":5,"category":"Sports","sub":"Boxe Treino"},
   {"day":6,"category":"Wellness","sub":"Pilates Reformer"},
   {"day":7,"category":"Wellness","sub":"Meditation Beach"},
   {"day":8,"category":"Sports","sub":"Surf Big Wave"},
   {"day":9,"category":"Wellness","sub":"Spa Day Luxe"},
   {"day":10,"category":"Sports","sub":"Tênis Wimbledon"},
   {"day":11,"category":"Wellness","sub":"Yoga Beach Sunrise"},
   {"day":12,"category":"Sports","sub":"Calistenia Park"},
   {"day":13,"category":"Wellness","sub":"Dance Studio"},
   {"day":14,"category":"Sports","sub":"Maratona Cidade"},
   {"day":15,"category":"Wellness","sub":"Boxing Training"},
   {"day":16,"category":"Sports","sub":"Pilates Studio Mirror"},
   {"day":17,"category":"Sports","sub":"Ciclismo Estrada"},
   {"day":18,"category":"Wellness","sub":"Surfing Wave"},
   {"day":19,"category":"Sports","sub":"Jiu-Jitsu Tatami"},
   {"day":20,"category":"Sports","sub":"Natação Olímpica"},
   {"day":21,"category":"Wellness","sub":"Yoga Beach Sunrise"},
   {"day":22,"category":"Sports","sub":"Powerlifting Gym"},
   {"day":23,"category":"Sports","sub":"Mountain Bike"},
   {"day":24,"category":"Sports","sub":"Vôlei Praia"},
   {"day":25,"category":"Sports","sub":"Skate Vert"},
   {"day":26,"category":"Sports","sub":"Pole Dance Studio"},
   {"day":27,"category":"Sports","sub":"Aerial Silks"},
   {"day":28,"category":"Sports","sub":"Wakeboard Lake"},
   {"day":29,"category":"Wellness","sub":"Yoga Beach Sunrise"},
   {"day":30,"category":"Sports","sub":"Equitação Dressage"}
 ]'::jsonb),

('professional_30d', 'Carreira & Profissão 30 dias', 'Mês profissional: corporate, networking, success lifestyle', 'Professions', 30,
 '[
   {"day":1,"category":"Professions","sub":"CEO Executiva"},
   {"day":2,"category":"Professions","sub":"Empreendedora Tech"},
   {"day":3,"category":"Lifestyle","sub":"Home Office"},
   {"day":4,"category":"Professions","sub":"Investidora Wall Street"},
   {"day":5,"category":"Professions","sub":"Advogada Tribunal"},
   {"day":6,"category":"Lifestyle","sub":"Convertible Drive"},
   {"day":7,"category":"Professions","sub":"Coach Motivacional"},
   {"day":8,"category":"Professions","sub":"Apresentadora TV"},
   {"day":9,"category":"Lifestyle","sub":"Restaurant Fine Dining"},
   {"day":10,"category":"Professions","sub":"Real Estate Agent"},
   {"day":11,"category":"Professions","sub":"Designer Gráfica"},
   {"day":12,"category":"Lifestyle","sub":"Wine Tasting"},
   {"day":13,"category":"Professions","sub":"Arquiteta Studio"},
   {"day":14,"category":"Professions","sub":"Influencer Studio"},
   {"day":15,"category":"Professions","sub":"Médica Editorial"},
   {"day":16,"category":"Professions","sub":"Programadora Tech"},
   {"day":17,"category":"Professions","sub":"Estilista Atelier"},
   {"day":18,"category":"Professions","sub":"Make-up Artist Backstage"},
   {"day":19,"category":"Professions","sub":"Jornalista Reportagem"},
   {"day":20,"category":"Professions","sub":"Chef Cozinha"},
   {"day":21,"category":"Professions","sub":"Sommelier Vinícola"},
   {"day":22,"category":"Professions","sub":"Fotógrafa Profissional"},
   {"day":23,"category":"Professions","sub":"Personal Trainer"},
   {"day":24,"category":"Professions","sub":"Yoga Instructor"},
   {"day":25,"category":"Professions","sub":"Bartender Coquetelaria"},
   {"day":26,"category":"Professions","sub":"DJ Festa"},
   {"day":27,"category":"Professions","sub":"Cantora Stage"},
   {"day":28,"category":"Professions","sub":"Dentista Consultório"},
   {"day":29,"category":"Professions","sub":"Veterinária Clínica"},
   {"day":30,"category":"Professions","sub":"Streamer Setup"}
 ]'::jsonb),

('beach_summer_15d', 'Verão & Praia 15 dias', 'Quinzena de praia: bikini, beach club, surf, summer vibes', 'Beach', 15,
 '[
   {"day":1,"category":"Beach","sub":"Trancoso Praia"},
   {"day":2,"category":"Beach","sub":"Ibiza Sunset"},
   {"day":3,"category":"Beach","sub":"Tulum Playa"},
   {"day":4,"category":"Travel","sub":"Yacht Mediterranean"},
   {"day":5,"category":"Travel","sub":"Tropical Villa Pool"},
   {"day":6,"category":"Beach","sub":"Fernando de Noronha"},
   {"day":7,"category":"Travel","sub":"Maldives Bungalow"},
   {"day":8,"category":"Sports","sub":"Surf Big Wave"},
   {"day":9,"category":"Sports","sub":"Vôlei Praia"},
   {"day":10,"category":"Travel","sub":"Bali Rice Terraces"},
   {"day":11,"category":"Travel","sub":"Santorini Sunset"},
   {"day":12,"category":"Travel","sub":"Amalfi Lemon"},
   {"day":13,"category":"Travel","sub":"Iceland Aurora"},
   {"day":14,"category":"Aesthetics","sub":"Mermaidcore"},
   {"day":15,"category":"Aesthetics","sub":"Tomato Girl Italian"}
 ]'::jsonb),

('content_creator_7d', 'Creator Week (7 dias)', 'Semana padrão de creator: GRWM, OOTD, mukbang, vlog', 'Lifestyle', 7,
 '[
   {"day":1,"category":"Video","sub":"GRWM Get Ready"},
   {"day":2,"category":"Video","sub":"OOTD Video"},
   {"day":3,"category":"Video","sub":"Day in My Life"},
   {"day":4,"category":"Video","sub":"Skincare Routine"},
   {"day":5,"category":"Lifestyle","sub":"Café Lifestyle"},
   {"day":6,"category":"Video","sub":"Try-On Haul"},
   {"day":7,"category":"Lifestyle","sub":"Sunday Pajama Day"}
 ]'::jsonb);
