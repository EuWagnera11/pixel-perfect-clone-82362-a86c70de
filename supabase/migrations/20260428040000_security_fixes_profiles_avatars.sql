-- ============================================================
-- Security fixes (Lovable scanner findings)
-- 1. profiles: bloqueia UPDATE em tier/credits via trigger
--    (auth user só pode alterar full_name/avatar_url; billing só via service_role)
-- 2. avatars: remove OR true da policy SELECT (RLS list/select restrito ao owner;
--    CDN público continua servindo files quando URL é conhecida)
-- ============================================================

-- ============ FIX 1: profiles billing columns ============

-- Revoga privilégio de UPDATE genérico; concede só nas colunas seguras
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (full_name, avatar_url, updated_at) ON public.profiles TO authenticated;

-- Trigger defensivo: mesmo que GRANT seja burlado, o trigger rejeita
-- mudanças em tier/credits feitas por usuários autenticados.
-- service_role bypassa o trigger.
CREATE OR REPLACE FUNCTION public.prevent_billing_column_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role pode tudo (Stripe webhooks, admin ops)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    RAISE EXCEPTION 'Coluna "tier" só pode ser alterada pelo sistema (service_role)'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Coluna "credits" só pode ser alterada pelo sistema (service_role)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_billing_columns ON public.profiles;
CREATE TRIGGER profiles_protect_billing_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_billing_column_update();

-- Reforça policy de UPDATE com WITH CHECK explícito (defesa em profundidade)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============ FIX 2: avatars bucket SELECT policy ============
-- Antiga policy tinha "OR true" → qualquer um listava todos os files.
-- Nova: só owner consegue listar/SELECT via REST API.
-- Bucket continua público pra CDN servir <img src="public-url"/> direto.
DROP POLICY IF EXISTS "avatars_select_own_or_public_object" ON storage.objects;

CREATE POLICY "avatars_select_own_only"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
