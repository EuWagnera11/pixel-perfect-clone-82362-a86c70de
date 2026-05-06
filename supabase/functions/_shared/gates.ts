/**
 * Gates compartilhadas: auth, rate-limit, ToS.
 * Retornam Response (já com CORS) em caso de falha pra a edge function só dar `return`.
 */
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, json } from "./cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

export async function requireUserId(req: Request): Promise<string | Response> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: { code: "UNAUTHORIZED", message: "Login obrigatório." } }, 401);
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) {
    return json({ error: { code: "UNAUTHORIZED", message: "Sessão inválida." } }, 401);
  }
  return data.user.id;
}

const RATE_DAILY = 200;       // teto/dia (gerações persistidas)
const RATE_BURST_PER_MIN = 30; // burst/minuto via tumbling window
const RATE_HOURLY = 200;      // teto/hora

export async function checkRateLimit(userId: string): Promise<true | Response> {
  const sb = adminClient();

  // 1) Burst por minuto (anti-loop / anti-bot) via consume_rate_limit
  const { data: minRl } = await sb.rpc("consume_rate_limit", {
    p_user_id: userId,
    p_bucket: "imageedit:minute",
    p_limit: RATE_BURST_PER_MIN,
    p_window_seconds: 60,
  });
  if (minRl && (minRl as any).allowed === false) {
    const retry = (minRl as any).retry_after_seconds ?? 60;
    return new Response(JSON.stringify({
      error: { code: "RATE_LIMIT_EXCEEDED", message: `Muitas requisições. Tente em ${retry}s.` },
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retry) },
    });
  }

  // 2) Teto por hora (consome do bucket "imageedit:hour")
  const { data: hourRl } = await sb.rpc("consume_rate_limit", {
    p_user_id: userId,
    p_bucket: "imageedit:hour",
    p_limit: RATE_HOURLY,
    p_window_seconds: 3600,
  });
  if (hourRl && (hourRl as any).allowed === false) {
    return json({
      error: { code: "RATE_LIMIT_EXCEEDED", message: `Limite horário de ${RATE_HOURLY} gerações atingido.` },
    }, 429);
  }

  // 3) Teto diário olhando histórico real (tabela)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error } = await sb
    .from("imageedit_generations")
    .select("generation_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) return true; // fail-open em caso de erro de DB
  if ((count ?? 0) >= RATE_DAILY) {
    return json({
      error: { code: "RATE_LIMIT_EXCEEDED", message: `Limite diário de ${RATE_DAILY} gerações atingido.` },
    }, 429);
  }
  return true;
}

export async function checkTosAccepted(
  userId: string, feature: string, version = "v1",
): Promise<true | Response> {
  const sb = adminClient();
  const { data } = await sb
    .from("user_tos_accepts")
    .select("id")
    .eq("user_id", userId).eq("feature", feature).eq("version", version)
    .maybeSingle();
  if (!data) {
    return json({
      error: { code: "TOS_NOT_ACCEPTED", message: "Você precisa aceitar os Termos de Uso desta ferramenta.", feature, version },
    }, 403);
  }
  return true;
}
