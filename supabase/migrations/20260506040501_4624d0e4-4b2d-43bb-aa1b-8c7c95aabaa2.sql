REVOKE ALL ON FUNCTION public.sync_profile_tier() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_user_billing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;