import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    (async () => {
      // OAuth callback (full-page redirect): captura tokens vindos na URL.
      // Quando o SDK do Lovable não está em iframe, faz redirect top-level
      // e o broker volta com access_token/refresh_token em query OU hash.
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
          ["access_token", "refresh_token", "expires_in", "expires_at",
           "token_type", "provider_token", "provider_refresh_token", "state",
           "type"].forEach((k) => url.searchParams.delete(k));
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
        }
      } catch (e) {
        console.warn("[auth] oauth callback parse failed:", e);
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
