// POST /accept-tos { feature, version }
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, requireUserId } from "../_shared/gates.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." } }, 405);

  const userId = await requireUserId(req);
  if (userId instanceof Response) return userId;

  let body: any;
  try { body = await req.json(); } catch {
    return json({ error: { code: "INVALID_JSON", message: "JSON inválido." } }, 400);
  }
  const feature = String(body?.feature || "");
  const version = String(body?.version || "v1");
  if (!feature) return json({ error: { code: "MISSING_INPUT", message: "feature obrigatório." } }, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = req.headers.get("user-agent") || null;

  const sb = adminClient();
  const { error } = await sb.from("user_tos_accepts").insert({
    user_id: userId, feature, version, ip_address: ip, user_agent: ua,
  });
  if (error && !/duplicate key/i.test(error.message)) {
    return json({ error: { code: "DB_ERROR", message: error.message } }, 500);
  }
  return json({ ok: true, feature, version });
});
