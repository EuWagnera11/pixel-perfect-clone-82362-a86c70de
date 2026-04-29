import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, ensureSession, api } from "../lib/supabase";

export type Profile = {
  tier: string;
  credits: number;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await ensureSession();
        if (!mounted) return;
        setSession(s);
        // Carrega profile (cria automaticamente no first-touch via auth_dep)
        const me = await api<{ tier: string; credits: number }>("/billing/me");
        if (!mounted) return;
        setProfile({ tier: me.tier, credits: me.credits });
      } catch (e: any) {
        if (mounted) setError(e?.message || "Auth failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    try {
      const me = await api<{ tier: string; credits: number }>("/billing/me");
      setProfile({ tier: me.tier, credits: me.credits });
    } catch {}
  };

  return { session, profile, loading, error, refreshProfile };
}
