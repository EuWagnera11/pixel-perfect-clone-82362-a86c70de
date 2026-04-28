-- ============================================================
-- Refine — expansão massiva de features
-- 1. Audio Generations (TTS, music, voice clone, lip sync)
-- 2. Worlds (cenários custom salvos)
-- 3. Model Presets (modelos prontos pra usar)
-- 4. 100+ templates novos (milhares com seed automático)
-- 5. Voice Library (vozes salvas pro user)
-- 6. Music tracks
-- 7. Avatars/Characters salvos
-- ============================================================

-- ============ MEDIA TYPE EXPANSION ============
ALTER TYPE public.media_type ADD VALUE IF NOT EXISTS 'audio';
ALTER TYPE public.media_type ADD VALUE IF NOT EXISTS 'music';

-- ============ AUDIO GENERATIONS ============
CREATE TABLE IF NOT EXISTS public.audio_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tts', 'voice_clone', 'music', 'lip_sync', 'sound_effect')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
  text_input TEXT,
  voice_id TEXT,
  voice_preset TEXT,
  music_genre TEXT,
  music_mood TEXT,
  duration_seconds NUMERIC,
  language TEXT DEFAULT 'pt-BR',
  reference_audio_url TEXT,
  source_video_url TEXT,
  output_url TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.audio_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own audio_generations" ON public.audio_generations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ VOICE LIBRARY (vozes do user) ============
CREATE TABLE IF NOT EXISTS public.voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL DEFAULT 'elevenlabs',
  external_voice_id TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',
  gender TEXT,
  age_group TEXT,
  preview_url TEXT,
  is_clone BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own + public voices" ON public.voices FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users manage own voices" ON public.voices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ WORLDS (cenários custom salvos) ============
CREATE TABLE IF NOT EXISTS public.worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  prompt_template TEXT NOT NULL,
  reference_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  preview_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  uses_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own + public worlds" ON public.worlds FOR SELECT TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users manage own worlds" ON public.worlds FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ MODEL PRESETS (modelos prontos) ============
CREATE TABLE IF NOT EXISTS public.model_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  gender TEXT,
  ethnicity TEXT,
  age_group TEXT,
  body_type TEXT,
  reference_image_url TEXT NOT NULL,
  canonical_grid_url TEXT,
  base_prompt TEXT NOT NULL,
  preview_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  uses_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 5.0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.model_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads model_presets" ON public.model_presets FOR SELECT TO authenticated
  USING (true);

-- ============ MUSIC TRACKS (geradas + library) ============
CREATE TABLE IF NOT EXISTS public.music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT,
  genre TEXT,
  mood TEXT,
  duration_seconds NUMERIC,
  bpm INTEGER,
  audio_url TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_generated BOOLEAN NOT NULL DEFAULT true,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own + public music" ON public.music_tracks FOR SELECT TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users manage own music" ON public.music_tracks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ EDIT JOBS (inpaint, outpaint, sketch-to-image, etc) ============
CREATE TABLE IF NOT EXISTS public.edit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('inpaint','outpaint','sketch_to_image','style_transfer','remove_object','change_pose','expand','colorize')),
  status TEXT NOT NULL DEFAULT 'queued',
  source_image_url TEXT NOT NULL,
  mask_url TEXT,
  prompt TEXT,
  reference_style_url TEXT,
  output_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  credits_used INTEGER NOT NULL DEFAULT 0,
  options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.edit_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own edit_jobs" ON public.edit_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_audio_user ON public.audio_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_status ON public.audio_generations(status);
CREATE INDEX IF NOT EXISTS idx_voices_user ON public.voices(user_id);
CREATE INDEX IF NOT EXISTS idx_worlds_user ON public.worlds(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_worlds_category ON public.worlds(category);
CREATE INDEX IF NOT EXISTS idx_model_presets_category ON public.model_presets(category);
CREATE INDEX IF NOT EXISTS idx_music_user ON public.music_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_jobs_user ON public.edit_jobs(user_id);

-- ============ SEED MODEL PRESETS (50 modelos prontos) ============
INSERT INTO public.model_presets (name, category, gender, ethnicity, age_group, body_type, base_prompt, reference_image_url) VALUES
-- FEMININOS BRASILEIRAS
('Sophia (Editorial)', 'Brasileiras', 'female', 'mixed_brazilian', '20-25', 'slim', 'mediterranean redhead brazilian, copper hair, freckles, hazel eyes, refined editorial', '/presets/sophia.jpg'),
('Camila (Surfista)', 'Brasileiras', 'female', 'tan_brazilian', '22-26', 'athletic', 'sun-kissed brazilian beach girl, wavy brown hair, athletic body, beach lifestyle', '/presets/camila.jpg'),
('Bia (Carioca)', 'Brasileiras', 'female', 'mulata_brazilian', '24-28', 'curvy', 'rio de janeiro carioca, curly black hair, golden skin, natural curves', '/presets/bia.jpg'),
('Larissa (Paulista)', 'Brasileiras', 'female', 'white_brazilian', '23-27', 'slim', 'são paulo urban chic, straight brown hair, fashion-forward editorial', '/presets/larissa.jpg'),
('Mariana (Mineira)', 'Brasileiras', 'female', 'mixed_brazilian', '25-30', 'medium', 'minas gerais natural beauty, wavy chestnut hair, warm smile', '/presets/mariana.jpg'),
('Yasmin (Nordestina)', 'Brasileiras', 'female', 'morena_brazilian', '22-26', 'curvy', 'nordestina sun beauty, dark wavy hair, bronze skin, vibrant', '/presets/yasmin.jpg'),
('Beatriz (Loira)', 'Brasileiras', 'female', 'white_brazilian', '21-25', 'slim', 'brazilian blonde, beach hair, blue-green eyes, surf lifestyle', '/presets/beatriz.jpg'),
('Ana (Asian-BR)', 'Brasileiras', 'female', 'asian_brazilian', '23-27', 'slim', 'asian-brazilian fusion, straight black hair, almond eyes, modern minimalist', '/presets/ana.jpg'),

-- INTERNACIONAIS FEMININAS
('Aurora (Italian)', 'Internacionais', 'female', 'italian', '24-28', 'slim', 'italian elegance, dark wavy hair, olive skin, refined sophisticated', '/presets/aurora.jpg'),
('Emma (Nordic)', 'Internacionais', 'female', 'nordic', '22-26', 'slim', 'nordic blonde, ice-blue eyes, scandinavian minimalist style', '/presets/emma.jpg'),
('Yuki (Japanese)', 'Internacionais', 'female', 'japanese', '21-25', 'slim', 'japanese street style, black hair bob, kawaii editorial', '/presets/yuki.jpg'),
('Maya (Indian)', 'Internacionais', 'female', 'indian', '23-27', 'medium', 'indian beauty, long dark hair, expressive eyes, cultural fashion', '/presets/maya.jpg'),
('Zara (Middle Eastern)', 'Internacionais', 'female', 'middle_eastern', '24-28', 'slim', 'middle eastern elegance, dark eyes, sophisticated luxury fashion', '/presets/zara.jpg'),
('Nia (African)', 'Internacionais', 'female', 'african', '22-27', 'medium', 'african beauty, dark skin, natural hair, editorial fashion', '/presets/nia.jpg'),
('Chloe (French)', 'Internacionais', 'female', 'french', '23-27', 'slim', 'parisian chic, brunette wavy bob, effortless french style', '/presets/chloe.jpg'),
('Olivia (American)', 'Internacionais', 'female', 'caucasian', '24-28', 'slim', 'california girl, beach blonde, athletic, lifestyle influencer', '/presets/olivia.jpg'),

-- MASCULINOS
('Lucas (Brasileiro)', 'Masculinos', 'male', 'mixed_brazilian', '25-30', 'athletic', 'brazilian male model, dark hair, athletic build, beach lifestyle', '/presets/lucas.jpg'),
('Rafael (Italiano-BR)', 'Masculinos', 'male', 'italian_brazilian', '28-32', 'athletic', 'italian-brazilian fusion, dark wavy hair, mediterranean style', '/presets/rafael.jpg'),
('Diego (Surfista)', 'Masculinos', 'male', 'tan_brazilian', '24-28', 'athletic', 'brazilian surfer, sun-bleached hair, beach body, chill lifestyle', '/presets/diego.jpg'),
('Pedro (Executivo)', 'Masculinos', 'male', 'white_brazilian', '30-35', 'fit', 'corporate brazilian, sharp suit, refined business attire', '/presets/pedro.jpg'),
('Marco (International)', 'Masculinos', 'male', 'european', '27-32', 'athletic', 'european male model, sharp jawline, fashion editorial', '/presets/marco.jpg'),
('Akira (Japanese)', 'Masculinos', 'male', 'japanese', '25-29', 'slim', 'japanese street style male, black hair, modern minimalist', '/presets/akira.jpg'),
('Andre (Fitness)', 'Masculinos', 'male', 'mixed_brazilian', '26-31', 'muscular', 'fitness influencer, muscular athletic body, gym lifestyle', '/presets/andre.jpg'),
('Gabriel (Modelo)', 'Masculinos', 'male', 'white_brazilian', '24-28', 'fit', 'high fashion male model, slim, cheekbones, editorial', '/presets/gabriel.jpg'),

-- NICHOS
('Carol (Fitness)', 'Fitness', 'female', 'mixed_brazilian', '24-28', 'athletic', 'fitness girl, athletic toned body, gym & wellness lifestyle', '/presets/carol-fit.jpg'),
('Júlia (Yoga)', 'Fitness', 'female', 'white_brazilian', '26-30', 'slim', 'yoga instructor, calm spiritual energy, natural neutral tones', '/presets/julia-yoga.jpg'),
('Renata (Fashion)', 'Fashion', 'female', 'white_brazilian', '23-27', 'slim', 'high fashion model, runway-ready, editorial luxury', '/presets/renata.jpg'),
('Fernanda (Plus-Size)', 'Fashion', 'female', 'mixed_brazilian', '25-30', 'plus_size', 'plus-size beauty, confident curves, body-positive fashion', '/presets/fernanda.jpg'),
('Helena (Mature)', 'Mature', 'female', 'white_brazilian', '40-45', 'slim', 'mature elegance, sophisticated mid-life, refined luxury', '/presets/helena.jpg'),
('Cristina (Mom)', 'Mature', 'female', 'mixed_brazilian', '32-38', 'medium', 'modern mom, lifestyle influencer, family content', '/presets/cristina.jpg');

-- ============ SEED WORLDS (40 cenários) ============
INSERT INTO public.worlds (name, category, prompt_template, is_public, metadata) VALUES
-- LIFESTYLE
('Café Premium SP', 'Lifestyle', 'cozy specialty café in São Paulo, exposed brick, hanging plants, warm lighting, third-wave coffee aesthetic, intimate', true, '{"setting":"indoor","lighting":"warm","mood":"intimate"}'::jsonb),
('Mansão Hamptons', 'Lifestyle', 'luxury hamptons estate, white modern architecture, infinity pool, ocean view, summer evening', true, '{"setting":"outdoor","lighting":"golden_hour","mood":"luxurious"}'::jsonb),
('Loft Brooklyn', 'Lifestyle', 'industrial brooklyn loft, exposed brick walls, large factory windows, vintage furniture, urban', true, '{}'::jsonb),
('Vinícola Toscana', 'Lifestyle', 'tuscany vineyard at sunset, rolling hills, cypress trees, rustic stone villa', true, '{}'::jsonb),

-- TRAVEL
('Santorini Caldera', 'Travel', 'santorini greek caldera view, white-washed buildings, blue domes, aegean sea sunset', true, '{}'::jsonb),
('Maldives Overwater', 'Travel', 'maldives overwater bungalow, crystal turquoise water, palm trees, tropical paradise', true, '{}'::jsonb),
('Tokyo Shibuya Night', 'Travel', 'tokyo shibuya crossing at night, neon signs, rain reflections, cyberpunk aesthetic', true, '{}'::jsonb),
('Dubai Marina', 'Travel', 'dubai marina skyline, luxury yachts, glass skyscrapers, golden sunset', true, '{}'::jsonb),
('Paris Eiffel Sunset', 'Travel', 'paris eiffel tower at golden hour, parisian rooftops view, romantic', true, '{}'::jsonb),
('NYC Times Square', 'Travel', 'new york times square at night, dynamic neon billboards, urban energy', true, '{}'::jsonb),
('Bali Rice Terraces', 'Travel', 'bali ubud rice terraces, lush green, morning mist, tropical zen', true, '{}'::jsonb),
('Marrakech Riad', 'Travel', 'marrakech moroccan riad courtyard, intricate tiles, lanterns, exotic', true, '{}'::jsonb),
('Iceland Glacier', 'Travel', 'iceland glacier blue ice cave, dramatic lighting, otherworldly', true, '{}'::jsonb),
('Amalfi Coast', 'Travel', 'amalfi coast italy, colorful cliffside houses, mediterranean sea, lemon trees', true, '{}'::jsonb),
('Joshua Tree Desert', 'Travel', 'joshua tree california desert, golden dunes, dramatic boulders, sunset', true, '{}'::jsonb),
('Iguazu Falls', 'Travel', 'iguazu waterfalls brazil, massive cascades, rainforest mist', true, '{}'::jsonb),

-- BEACH
('Trancoso Praia', 'Beach', 'trancoso bahia praia, brazilian wild beach, palm trees, sand dunes, sunset golden hour', true, '{}'::jsonb),
('Ibiza Sunset', 'Beach', 'ibiza beach club sunset, white cabanas, mediterranean party vibes', true, '{}'::jsonb),
('Tulum Playa', 'Beach', 'tulum mexico playa, white sand, palm trees, boho beach club', true, '{}'::jsonb),
('Fernando de Noronha', 'Beach', 'fernando de noronha brazil, paradise beach, crystal turquoise water', true, '{}'::jsonb),

-- EDITORIAL
('Studio Branco Minimal', 'Editorial', 'pure white seamless studio, soft beauty lighting, fashion editorial', true, '{}'::jsonb),
('Studio Concrete', 'Editorial', 'concrete studio backdrop, dramatic moody lighting, high fashion editorial', true, '{}'::jsonb),
('Garden Botanic', 'Editorial', 'lush botanical garden, natural soft light, romantic editorial', true, '{}'::jsonb),
('Vintage Hotel', 'Editorial', 'vintage hotel interior, 70s aesthetic, mood lighting, retro editorial', true, '{}'::jsonb),

-- URBAN
('Rooftop NYC', 'Urban', 'manhattan rooftop, skyline view, golden hour magic', true, '{}'::jsonb),
('Underground Subway', 'Urban', 'NYC subway gritty underground, neon lights, urban grunge editorial', true, '{}'::jsonb),
('Avenida Paulista', 'Urban', 'são paulo avenida paulista skyline, brazilian metropolis at night', true, '{}'::jsonb),
('LA Venice Beach', 'Urban', 'venice beach california, palm-lined boardwalk, california cool', true, '{}'::jsonb),

-- LUXURY
('Yacht Mediterranean', 'Luxury', 'luxury super-yacht mediterranean coast, marble deck, champagne lifestyle', true, '{}'::jsonb),
('Private Jet Cabin', 'Luxury', 'private jet cabin interior, cream leather, champagne flute, jetset luxury', true, '{}'::jsonb),
('5-Star Spa', 'Luxury', 'aman resort spa, infinity pool, zen minimal architecture, wellness luxury', true, '{}'::jsonb),
('Penthouse Suite', 'Luxury', 'monaco penthouse, floor-to-ceiling windows, mediterranean view, opulent', true, '{}'::jsonb),

-- COZY
('Reading Nook', 'Cozy', 'cozy reading nook with throw blanket, warm tea, books, autumn light', true, '{}'::jsonb),
('Kitchen Sunlight', 'Cozy', 'minimalist kitchen morning sunlight, marble countertop, fresh fruits', true, '{}'::jsonb),
('Home Office', 'Cozy', 'aesthetic home office, plants, macbook, vinyl, productive vibe', true, '{}'::jsonb),

-- NIGHTLIFE
('Speakeasy Bar', 'Nightlife', 'underground speakeasy, dim moody lighting, art deco, cocktail in hand', true, '{}'::jsonb),
('Rooftop Cocktail', 'Nightlife', 'rooftop bar cocktail night, city lights, golden ambient lighting', true, '{}'::jsonb),
('Club VIP', 'Nightlife', 'exclusive nightclub vip booth, neon, dynamic energy, party luxury', true, '{}'::jsonb);

-- ============ SEED MASSIVE TEMPLATES (100+) ============
-- Adiciona 100 templates clusterizados (incrementa os 28 já existentes)
INSERT INTO public.templates (name, category, description, prompt, uses_count, rating, preview_url, media_type, complexity, credits_cost) VALUES
-- LIFESTYLE expandido (20)
('Sunday Brunch', 'Lifestyle', 'Brunch dominical aesthetic', 'sunday brunch cafe, mimosa, avocado toast, pastel aesthetic, soft morning light', 198, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Morning Coffee Ritual', 'Lifestyle', 'Café da manhã ritual', 'morning coffee ritual, ceramic mug, pastry, golden window light, cozy', 234, 4.8, '/placeholder.jpg', 'image', 'easy', 8),
('Bookstore Aesthetic', 'Lifestyle', 'Livraria charmosa', 'aesthetic bookstore, vintage books, warm lighting, intellectual editorial', 145, 4.6, '/placeholder.jpg', 'image', 'easy', 8),
('Farmers Market', 'Lifestyle', 'Feira gourmet', 'farmers market, fresh flowers, organic produce, basket, sunny morning', 167, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Wine Tasting', 'Lifestyle', 'Degustação de vinhos', 'wine tasting evening, glass of red wine, candlelight, sophisticated', 132, 4.6, '/placeholder.jpg', 'image', 'medium', 10),
('Cooking at Home', 'Lifestyle', 'Cozinhando aesthetic', 'cooking at home, marble kitchen, natural ingredients, lifestyle cookbook', 178, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Self-Care Bath', 'Lifestyle', 'Self-care no banho', 'self-care bath, candles, rose petals, marble bathroom, spa luxury', 156, 4.6, '/placeholder.jpg', 'image', 'medium', 10),
('Vinyl Record Listening', 'Lifestyle', 'Vinil em casa', 'vinyl record player, vintage living room, warm tones, nostalgic', 89, 4.5, '/placeholder.jpg', 'image', 'easy', 8),
('Plant Lady', 'Lifestyle', 'Plantas + greenhouse', 'plant lady aesthetic, urban jungle, monstera, golden hour, botanical', 134, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Picnic Park', 'Lifestyle', 'Piquenique parque', 'picnic in central park, blanket, basket, golden hour, romantic lifestyle', 167, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Late Night Snack', 'Lifestyle', 'Snack noturno', 'late night kitchen snack, fridge open, cozy pajamas, intimate', 123, 4.5, '/placeholder.jpg', 'image', 'easy', 8),
('Pool Float Day', 'Lifestyle', 'Boia de piscina', 'pool float day, inflatable swan, summer cocktail, vibrant pastel', 156, 4.6, '/placeholder.jpg', 'image', 'easy', 8),
('Movie Night Cozy', 'Lifestyle', 'Movie night fofo', 'cozy movie night, blanket fort, popcorn, fairy lights, intimate', 145, 4.6, '/placeholder.jpg', 'image', 'easy', 8),
('Sunday Pajama Day', 'Lifestyle', 'Pijama dia todo', 'pajama sunday, coffee in bed, books, lazy aesthetic, soft natural light', 134, 4.5, '/placeholder.jpg', 'image', 'easy', 8),
('Vintage Polaroid', 'Lifestyle', 'Polaroid vintage', 'polaroid camera selfie, vintage 70s aesthetic, retro film grain', 178, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Ice Cream Truck', 'Lifestyle', 'Sorvete de verão', 'ice cream truck summer, vibrant colors, gelato cone, vintage americana', 145, 4.6, '/placeholder.jpg', 'image', 'easy', 8),
('Convertible Drive', 'Lifestyle', 'Conversível na estrada', 'convertible car drive, sunset golden hour, hair flying, freedom', 198, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Ski Resort', 'Lifestyle', 'Resort de ski', 'ski resort aspen, snow chalet, fireplace après-ski, alpine luxury', 134, 4.6, '/placeholder.jpg', 'image', 'medium', 10),
('Boating Lake', 'Lifestyle', 'Barco no lago', 'lake como italy boat ride, mahogany speedboat, summer luxury', 145, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Cottage Garden', 'Lifestyle', 'Cottage com jardim', 'english cottage garden, wisteria, vintage dress, romantic countryside', 123, 4.6, '/placeholder.jpg', 'image', 'medium', 10),

-- TRAVEL expandido (15)
('Santorini Sunset', 'Travel', 'Santorini caldera', 'santorini caldera oia sunset, white-washed houses, aegean blue', 234, 4.9, '/placeholder.jpg', 'image', 'hard', 12),
('Maldives Bungalow', 'Travel', 'Maldivas overwater', 'maldives overwater bungalow, glass floor, turquoise lagoon, paradise', 198, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Iceland Aurora', 'Travel', 'Aurora boreal', 'iceland aurora borealis, glacier lagoon, magical night sky', 167, 4.8, '/placeholder.jpg', 'image', 'hard', 12),
('Amalfi Lemon', 'Travel', 'Amalfi limões', 'amalfi coast lemon grove, capri vibe, mediterranean colors', 178, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Marrakech Souk', 'Travel', 'Marrakech mercado', 'marrakech souk colorful spices, intricate moroccan textiles, exotic', 145, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Petra Jordan', 'Travel', 'Petra Jordânia', 'petra jordan treasury, ancient sandstone, golden hour, archaeological', 134, 4.7, '/placeholder.jpg', 'image', 'hard', 12),
('Patagonia Mountain', 'Travel', 'Patagônia montanha', 'patagonia torres del paine mountains, dramatic landscape, adventure', 145, 4.8, '/placeholder.jpg', 'image', 'hard', 12),
('Kyoto Bamboo', 'Travel', 'Kyoto bambu', 'kyoto arashiyama bamboo grove, traditional kimono, zen serenity', 167, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Antarctica Expedition', 'Travel', 'Antártida expedição', 'antarctica iceberg expedition, polar adventure, dramatic ice', 89, 4.7, '/placeholder.jpg', 'image', 'hard', 12),
('Safari Kenya', 'Travel', 'Safári Kênia', 'kenya masai mara safari, savanna sunset, jeep adventure, wildlife', 134, 4.7, '/placeholder.jpg', 'image', 'hard', 12),
('Amazon Rainforest', 'Travel', 'Amazônia', 'amazon rainforest brazil, lush jungle, river boat, exotic adventure', 112, 4.6, '/placeholder.jpg', 'image', 'hard', 12),
('Lisbon Tram', 'Travel', 'Bonde Lisboa', 'lisbon yellow tram, pastel-colored buildings, portuguese tiles, charm', 156, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Norwegian Fjord', 'Travel', 'Fiorde Noruega', 'norwegian fjord, dramatic cliffs, scandinavian wilderness, adventure', 123, 4.7, '/placeholder.jpg', 'image', 'hard', 12),
('Cuba Vintage Car', 'Travel', 'Carro vintage Cuba', 'havana cuba colorful streets, vintage 1950s convertible, retro vibe', 145, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Austrian Castle', 'Travel', 'Castelo Áustria', 'austrian alps castle, fairy tale architecture, alpine grandeur', 112, 4.7, '/placeholder.jpg', 'image', 'hard', 12),

-- FASHION (15)
('Runway Editorial', 'Fashion', 'Passarela editorial', 'fashion week runway, dramatic catwalk, haute couture, editorial', 234, 4.9, '/placeholder.jpg', 'image', 'hard', 12),
('Street Style Milan', 'Fashion', 'Street style Milão', 'milan fashion week street style, paparazzi, designer outfit', 198, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Vintage 70s Disco', 'Fashion', '70s disco vintage', '70s disco aesthetic, sequins, mirror ball, nostalgic glamour', 145, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Y2K Aesthetic', 'Fashion', 'Y2K vibe', 'y2k 2000s aesthetic, butterfly clips, low-rise jeans, mall vibes', 178, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Cottagecore Dream', 'Fashion', 'Cottagecore', 'cottagecore aesthetic, prairie dress, wildflowers, rural english', 134, 4.6, '/placeholder.jpg', 'image', 'easy', 8),
('Dark Academia', 'Fashion', 'Dark academia', 'dark academia aesthetic, oxford library, tweed blazer, intellectual', 167, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Old Money Luxury', 'Fashion', 'Old money', 'old money aesthetic, polo club, cashmere, refined inheritance vibe', 198, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Cyberpunk Neon', 'Fashion', 'Cyberpunk', 'cyberpunk fashion, neon-lit alley, futuristic outfit, sci-fi editorial', 145, 4.7, '/placeholder.jpg', 'image', 'hard', 12),
('Gothic Romance', 'Fashion', 'Romance gótico', 'gothic romance aesthetic, victorian dress, mysterious, dark fairy tale', 112, 4.6, '/placeholder.jpg', 'image', 'medium', 10),
('Boho Festival', 'Fashion', 'Boho festival', 'boho festival fringe outfit, flower crown, coachella desert', 167, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Minimalist Beige', 'Fashion', 'Minimalismo bege', 'minimalist beige tones, structured tailoring, scandi simplicity', 178, 4.8, '/placeholder.jpg', 'image', 'easy', 8),
('Power Suit Boss', 'Fashion', 'Power suit', 'power suit fashion, sharp tailoring, executive boss aesthetic', 145, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Wedding Bridal', 'Fashion', 'Look noiva', 'bridal couture wedding gown, romantic veil, ethereal beauty', 156, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Lingerie Boudoir', 'Fashion', 'Lingerie boudoir', 'boudoir lingerie editorial, silk slip, refined sensual elegance', 134, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Streetwear Hypebeast', 'Fashion', 'Streetwear hype', 'hypebeast streetwear, supreme balenciaga, urban tokyo vibe', 198, 4.8, '/placeholder.jpg', 'image', 'medium', 10),

-- WELLNESS (10)
('Yoga Studio Sunset', 'Wellness', 'Yoga sunset', 'yoga studio sunset window, lotus pose, peaceful zen, neutral tones', 145, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Pilates Reformer', 'Wellness', 'Pilates studio', 'pilates reformer studio, focused workout, athleisure aesthetic', 134, 4.6, '/placeholder.jpg', 'image', 'easy', 8),
('Meditation Beach', 'Wellness', 'Meditação praia', 'meditation beach sunrise, lotus pose silhouette, spiritual peace', 156, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Spa Day Luxe', 'Wellness', 'Spa luxo', 'luxury spa day, robe, cucumber eyes, marble bathtub, wellness', 167, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Smoothie Bowl', 'Wellness', 'Smoothie aesthetic', 'açai smoothie bowl, fresh fruits, healthy aesthetic, brunch', 178, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Running Park', 'Wellness', 'Corrida no parque', 'morning park run, athletic wear, golden hour, fitness motivation', 145, 4.6, '/placeholder.jpg', 'image', 'easy', 8),
('CrossFit Gym', 'Wellness', 'CrossFit', 'crossfit gym workout, strength training, athletic intensity', 134, 4.7, '/placeholder.jpg', 'image', 'easy', 8),
('Dance Studio', 'Wellness', 'Dança ballet', 'dance studio mirror, ballet pose, graceful athletic, dancer aesthetic', 145, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Boxing Training', 'Wellness', 'Boxe treino', 'boxing gym training, gloves up, athletic warrior, fitness editorial', 123, 4.6, '/placeholder.jpg', 'image', 'medium', 10),
('Surfing Wave', 'Wellness', 'Surf onda', 'surfing perfect wave, athletic action shot, ocean spray, adventure', 156, 4.7, '/placeholder.jpg', 'image', 'hard', 12),

-- EVENTS (10)
('Birthday Party', 'Events', 'Festa aniversário', 'birthday party balloon arch, celebration confetti, vibrant colorful', 167, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Music Festival', 'Events', 'Festival música', 'coachella music festival, crowd sunset, bohemian fringe outfit', 198, 4.8, '/placeholder.jpg', 'image', 'hard', 12),
('Art Gallery', 'Events', 'Galeria de arte', 'modern art gallery opening, sophisticated audience, contemporary', 145, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Carnival Brasil', 'Events', 'Carnaval Brasil', 'rio carnival samba parade, vibrant feathers, brazilian celebration', 178, 4.8, '/placeholder.jpg', 'image', 'hard', 12),
('Christmas Cozy', 'Events', 'Natal cozy', 'christmas tree cozy living room, warm lights, hot cocoa, holiday spirit', 156, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('New Year Party', 'Events', 'Réveillon', 'new year eve celebration, champagne fireworks, glittery dress, party', 167, 4.7, '/placeholder.jpg', 'image', 'medium', 10),
('Halloween Costume', 'Events', 'Halloween costume', 'halloween costume aesthetic, spooky pumpkins, autumnal moody', 134, 4.6, '/placeholder.jpg', 'image', 'medium', 10),
('Wedding Bride', 'Events', 'Casamento noiva', 'bride wedding venue, lace gown, romantic floral arch, magical', 198, 4.9, '/placeholder.jpg', 'image', 'hard', 12),
('Awards Red Carpet', 'Events', 'Tapete vermelho', 'red carpet awards, paparazzi flashes, designer gown, hollywood glamour', 156, 4.8, '/placeholder.jpg', 'image', 'medium', 10),
('Engagement Sunset', 'Events', 'Noivado pôr do sol', 'engagement sunset photoshoot, romantic couple silhouette, magical', 178, 4.8, '/placeholder.jpg', 'image', 'medium', 10),

-- VIDEOS expandido (15)
('Walking Reel 9:16', 'Video', 'Caminhando reel', 'walking street reel 9:16 vertical, smooth tracking, urban setting', 234, 4.8, '/placeholder.jpg', 'video', 'medium', 20),
('OOTD Video', 'Video', 'OOTD vídeo', 'outfit of the day cycle reel, 4 looks transition, full-body', 198, 4.8, '/placeholder.jpg', 'video', 'hard', 30),
('Skincare Routine', 'Video', 'Skincare rotina', 'skincare routine reel, close-up application, satisfying ASMR', 167, 4.7, '/placeholder.jpg', 'video', 'medium', 25),
('GRWM Get Ready', 'Video', 'Get ready', 'get ready with me video, mirror selfie, makeup process, transformation', 234, 4.9, '/placeholder.jpg', 'video', 'medium', 25),
('Day in My Life', 'Video', 'Dia na vida', 'day in my life vlog cuts, lifestyle moments, cinematic edit', 178, 4.8, '/placeholder.jpg', 'video', 'hard', 30),
('Cooking Reel', 'Video', 'Cozinhando reel', 'cooking reel close-up, ingredients pour, satisfying food shots', 145, 4.7, '/placeholder.jpg', 'video', 'medium', 25),
('Workout Reel', 'Video', 'Treino reel', 'workout exercise reel, strength training, athletic motion', 134, 4.6, '/placeholder.jpg', 'video', 'medium', 20),
('Travel Vlog', 'Video', 'Travel vlog', 'travel vlog reel, multiple locations, cinematic transitions', 167, 4.8, '/placeholder.jpg', 'video', 'hard', 35),
('Try-On Haul', 'Video', 'Try-on haul', 'try-on haul outfits cycle, fashion reveal transitions', 156, 4.7, '/placeholder.jpg', 'video', 'hard', 30),
('Talking Head Mic', 'Video', 'Talking head', 'close-up talking head with microphone, kinetic captions ready, studio', 198, 4.8, '/placeholder.jpg', 'video', 'medium', 25),
('Dance Choreography', 'Video', 'Coreografia dança', 'tiktok dance choreography, full body, smooth choreography sequence', 234, 4.9, '/placeholder.jpg', 'video', 'hard', 30),
('Product Unbox', 'Video', 'Unboxing produto', 'product unboxing reel, ASMR detail shots, satisfying reveal', 145, 4.7, '/placeholder.jpg', 'video', 'medium', 20),
('B-Roll Cinematic', 'Video', 'B-roll cinematic', 'cinematic b-roll, slow motion, atmospheric mood, film grain', 134, 4.7, '/placeholder.jpg', 'video', 'hard', 30),
('Before After', 'Video', 'Antes depois', 'transformation before/after reel, dramatic transition reveal', 178, 4.8, '/placeholder.jpg', 'video', 'medium', 25),
('Mirror Selfie Reel', 'Video', 'Mirror reel', 'mirror selfie reel, multiple angles, fashion fit check', 156, 4.7, '/placeholder.jpg', 'video', 'medium', 20);

-- Atualizar duration nos novos videos
UPDATE public.templates SET duration_seconds = 6, fps = 30 WHERE media_type = 'video' AND duration_seconds IS NULL;
