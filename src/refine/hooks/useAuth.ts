import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, api } from "../lib/supabase";
import { lovable } from "@/integrations/lovable";

export type Profile = { tier: string; credits: number };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearInvalidSession = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      return;
    } finally {
      setSession(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // OAuth callback (full-page redirect): captura tokens vindos na URL.
        // O SDK @lovable.dev/cloud-auth-js, quando NÃO está em iframe, faz
        // window.location.href = /~oauth/initiate, e o broker redireciona de
        // volta com access_token/refresh_token em query OU hash. Precisamos
        // ler isso e setar a sessão manualmente.
        try {
          const url = new URL(window.location.href);
          const hashParams = new URLSearchParams(
            url.hash.startsWith("#") ? url.hash.slice(1) : url.hash
          );
          const access_token =
            url.searchParams.get("access_token") || hashParams.get("access_token");
          const refresh_token =
            url.searchParams.get("refresh_token") || hashParams.get("refresh_token");
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            // limpa os tokens da URL para não ficarem expostos / re-processados
            ["access_token", "refresh_token", "expires_in", "expires_at",
             "token_type", "provider_token", "provider_refresh_token", "state",
             "type"].forEach((k) => {
              url.searchParams.delete(k);
            });
            url.hash = "";
            window.history.replaceState({}, "", url.toString());
          }
        } catch (e) {
          console.warn("[refine] oauth callback parse failed:", e);
        }

        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData?.user) {
            if (mounted) {
              await clearInvalidSession();
            }
            return;
          }
          setSession(data.session);
          try {
            const { data: row } = await supabase
              .from("profiles")
              .select("tier, credits")
              .eq("id", data.session.user.id)
              .maybeSingle();
            if (!mounted) return;
            if (row) setProfile({ tier: row.tier, credits: row.credits });
            else setProfile(null);
          } catch {
            setProfile(null);
          }
        } else {
          setSession(null);
        }
      } catch (error: unknown) {
        if (mounted) setError(getErrorMessage(error, "Auth failed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const sub = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      if (!s) {
        setSession(null);
        setProfile(null);
        return;
      }
      // Confia na sessão emitida pelo SDK; não revalidar aqui
      // (revalidar com getUser causa logout ap\u00f3s o redirect do OAuth).
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setProfile(null); return; }
      const { data: row } = await supabase
        .from("profiles")
        .select("tier, credits")
        .eq("id", u.user.id)
        .maybeSingle();
      if (row) setProfile({ tier: row.tier, credits: row.credits });
      else setProfile(null);
    } catch {
      setProfile(null);
    }
  };

  const upgradeTo = async (tier: string = "starter_monthly") => {
    try {
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        "create-checkout",
        { body: { plan: tier } }
      );
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: unknown) {
      console.error("[refine] upgrade failed:", error);
      alert("Erro: " + getErrorMessage(error, "checkout falhou"));
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke<{ url: string }>("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: unknown) {
      alert("Erro: " + getErrorMessage(error, "portal falhou"));
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });
      if (result.error) {
        alert("Erro: " + (result.error.message || "OAuth falhou"));
      }
    } catch (error: unknown) {
      alert("Erro: " + getErrorMessage(error, "OAuth falhou"));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return { session, profile, loading, error, refreshProfile, upgradeTo, openCustomerPortal, signInWithGoogle, signOut };
}
