ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles
SET tier = 'enterprise', credits = 320000, updated_at = now()
WHERE id = '51158935-2305-4a90-9720-f47c953c9698';

ALTER TABLE public.profiles ENABLE TRIGGER USER;