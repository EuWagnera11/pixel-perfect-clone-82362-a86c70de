import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, api } from "../lib/supabase";
import { lovable } from "@/integrations/lovable";

export type Profile = { tier: string; credits: number };

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

  const upgradeTo = async (tier: string = "starter_monthly") => {
    try {
      const r = await api<{ url: string; session_id: string }>("/billing/checkout", {
        method: "POST",
        body: { tier },
      });
      if (r.url) window.location.href = r.url;
    } catch (e: any) {
      console.error("[refine] upgrade failed:", e);
      alert("Erro: " + (e?.message || "checkout falhou"));
    }
  };

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch (e: any) {
      alert("Erro: " + (e?.message || "OAuth falhou"));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return { session, profile, loading, error, refreshProfile, upgradeTo, signInWithGoogle, signOut };
}
