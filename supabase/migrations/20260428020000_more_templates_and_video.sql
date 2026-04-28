-- Adicionar suporte a vídeo + 16 templates novos

-- ============ MEDIA TYPE ============
CREATE TYPE public.media_type AS ENUM ('image', 'video');

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS media_type public.media_type NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC,    -- pra vídeo
  ADD COLUMN IF NOT EXISTS fps INTEGER,                  -- pra vídeo
  ADD COLUMN IF NOT EXISTS motion_style TEXT,            -- subtle, dynamic, cinematic, etc
  ADD COLUMN IF NOT EXISTS complexity TEXT NOT NULL DEFAULT 'medium', -- easy/medium/hard
  ADD COLUMN IF NOT EXISTS credits_cost INTEGER NOT NULL DEFAULT 8;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS media_type public.media_type NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC,
  ADD COLUMN IF NOT EXISTS fps INTEGER,
  ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ============ NOVOS TEMPLATES (16 mais) ============

INSERT INTO public.templates (name, category, description, prompt, uses_count, rating, preview_url, media_type, complexity, credits_cost) VALUES

-- LIFESTYLE expandido
('Mirror Selfie Elevator', 'Lifestyle', 'Mirror selfie em elevador de hotel premium', 'mirror selfie luxury hotel elevator, ribbed bodycon midi dress, warm overhead lighting', 89, 4.7, '/placeholder-mirror.jpg', 'image', 'easy', 8),
('In-Car Coffee Selfie', 'Lifestyle', 'Selfie no carro com Starbucks (formato signature Aitana)', 'in-car selfie luxury car passenger seat, tortoise sunglasses, holding venti starbucks cup', 145, 4.8, '/placeholder-incar.jpg', 'image', 'easy', 8),
('Bedroom Boudoir Slip', 'Editorial', 'Slip dress em quarto luxuoso', 'boudoir slip dress white linen sheets, soft natural morning light, refined sensual', 167, 4.7, '/placeholder-bedroom.jpg', 'image', 'medium', 10),
('Yacht Mediterranean', 'Travel', 'Iate Mediterrâneo, vibe Italia/Greece', 'yacht mediterranean coast, white bikini and gold accents, golden hour', 78, 4.6, '/placeholder-yacht.jpg', 'image', 'medium', 10),
('Restaurant Fine Dining', 'Lifestyle', 'Jantar fino em restaurante moody', 'elegant restaurant interior, candle light, glass of wine, intimate', 134, 4.7, '/placeholder-restaurant.jpg', 'image', 'easy', 8),

-- TRAVEL expandido
('Tropical Villa Pool', 'Travel', 'Villa tropical com piscina infinita', 'tropical villa infinity pool sunset, swimsuit minimal, palm trees', 112, 4.8, '/placeholder-villa.jpg', 'image', 'medium', 10),
('Paris Eiffel Wide', 'Travel', 'Paris com Torre Eiffel ao fundo', 'paris streets eiffel tower background, parisian style trench coat, blue hour', 198, 4.8, '/placeholder-paris.jpg', 'image', 'hard', 12),
('Tokyo Neon Street', 'Travel', 'Tóquio noite neon Shinjuku', 'tokyo shinjuku neon street night, oversized leather jacket, cinematic', 156, 4.9, '/placeholder-tokyo.jpg', 'image', 'hard', 12),
('Bali Rice Terraces', 'Travel', 'Terraços de arroz Bali', 'bali rice terraces ubud, white linen flowy dress, golden hour', 89, 4.6, '/placeholder-bali.jpg', 'image', 'medium', 10),

-- FITNESS / WELLNESS
('Yoga Beach Sunrise', 'Fitness', 'Yoga na praia ao amanhecer', 'beach yoga sunrise warrior pose, fitness wear, soft pastel sky', 78, 4.7, '/placeholder-yoga.jpg', 'image', 'medium', 10),
('Pilates Studio Mirror', 'Fitness', 'Pilates studio mirror selfie', 'pilates reformer studio mirror selfie, athletic wear, focused expression', 92, 4.6, '/placeholder-pilates.jpg', 'image', 'easy', 8),

-- EVENT / FESTIVAL
('Music Festival Crowd', 'Event', 'Festival de música, vibe coachella', 'music festival sunset crowd background, boho fringe outfit, carefree', 134, 4.7, '/placeholder-festival.jpg', 'image', 'hard', 12),
('Wedding Guest Look', 'Event', 'Look de convidada de casamento luxe', 'elegant wedding guest dress, satin gown, photographic moment', 67, 4.5, '/placeholder-wedding.jpg', 'image', 'medium', 10),

-- VIDEOS (formatos curtos)
('Talking-Head Reel', 'Video', 'Reel talking-head com microfone (tipo balaclava.ads)', 'close-up talking head with microphone, home studio neutral background, kinetic typography subtitle ready', 234, 4.9, '/placeholder-talking.jpg', 'video', 'hard', 25),
('Walking Street Reel', 'Video', 'Reel caminhando na rua, motion smooth', 'walking street motion video 9:16, urban setting, smooth camera follow', 187, 4.8, '/placeholder-walking.jpg', 'video', 'medium', 20),
('OOTD Cycle Video', 'Video', 'Lookbook ciclo de outfits com transições', '4 outfits cycle smoke transition lookbook, full-body each, music sync ready', 156, 4.9, '/placeholder-ootd-vid.jpg', 'video', 'hard', 30);

-- Atualizar duration/fps pros videos
UPDATE public.templates
SET duration_seconds = 8, fps = 30, motion_style = 'subtle'
WHERE media_type = 'video' AND name = 'Talking-Head Reel';

UPDATE public.templates
SET duration_seconds = 6, fps = 30, motion_style = 'dynamic'
WHERE media_type = 'video' AND name = 'Walking Street Reel';

UPDATE public.templates
SET duration_seconds = 12, fps = 30, motion_style = 'cinematic'
WHERE media_type = 'video' AND name = 'OOTD Cycle Video';
