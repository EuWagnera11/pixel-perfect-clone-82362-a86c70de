-- ============================================================
-- Security hardening v2 (Lovable scanner findings round 2)
-- 1. user_roles: bloqueia user de virar admin auto-inserindo role
-- 2. generations: adiciona UPDATE policy (service_role only — backend)
-- 3. avatars: bucket privado (CDN não serve sem RLS check)
-- 4. SECURITY DEFINER functions: REVOKE EXECUTE pra anon/authenticated
-- ============================================================

-- ============ FIX 1: user_roles privilege escalation ============
-- Policy antiga "Admins manage roles" usava has_role() que retorna FALSE
-- pra non-admin, então em tese bloqueia. Mas pra defesa em profundidade:
-- separar policies INSERT/UPDATE/DELETE + trigger que bloqueia 'admin' role.

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger defensivo: bloqueia INSERT/UPDATE de role 'admin' exceto service_role.
-- Mesmo se RLS for burlada de alguma forma, o trigger barra.
CREATE OR REPLACE FUNCTION public.prevent_admin_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Role "admin" só pode ser concedida pelo sistema (service_role)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_prevent_admin_escalation ON public.user_roles;
CREATE TRIGGER user_roles_prevent_admin_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_role_escalation();

-- ============ FIX 2: generations UPDATE policy ============
-- Generations status muda durante o pipeline (queued → processing → completed).
-- Esse update é feito pelo backend (FastAPI usa service_role).
-- User comum NÃO deve mudar status/credits (impediria fraude).

CREATE POLICY "Service role updates generations" ON public.generations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- (authenticated não tem UPDATE — bloqueado por ausência de policy)

-- ============ FIX 3: avatars bucket totalmente privado ============
-- Antes: bucket público, RLS só governava list/select REST.
-- Agora: bucket privado. Acesso via signed URLs.
-- Frontend precisa usar supabase.storage.from('avatars').createSignedUrl(path, ttl).

UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';

-- Recria policy SELECT mais permissiva pra signed URLs funcionarem
-- (signed URLs já validam por token; RLS é segunda camada).
DROP POLICY IF EXISTS "avatars_select_own_only" ON storage.objects;

CREATE POLICY "avatars_select_own_only_v2"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============ FIX 4: REVOKE EXECUTE em SECURITY DEFINER functions ============
-- Essas funções não devem ser chamadas via /rest/v1/rpc por usuários.
-- Continuam funcionando dentro de policies (SECURITY DEFINER bypassa).

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- Garantir que functions de billing também são protegidas
REVOKE EXECUTE ON FUNCTION public.prevent_billing_column_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_role_escalation() FROM anon, authenticated, public;
