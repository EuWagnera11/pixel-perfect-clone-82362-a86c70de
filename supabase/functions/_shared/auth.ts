// Auth helper: validates Supabase JWT and returns the user_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { json } from "./cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type AuthCtx = {
  userId: string;
  jwt: string;
  /** Service-role client (bypasses RLS — use carefully). */
  admin: ReturnType<typeof createClient>;
};

export async function requireAuth(req: Request): Promise<AuthCtx | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const jwt = authHeader.slice("Bearer ".length);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser(jwt);
  if (error || !data?.user?.id) {
    return json({ error: "Unauthorized", detail: error?.message }, 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { userId: data.user.id, jwt, admin };
}
