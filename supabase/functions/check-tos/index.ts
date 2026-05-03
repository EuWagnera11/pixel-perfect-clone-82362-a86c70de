// GET /check-tos?feature=face-swap&version=v1
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, requireUserId } from "../_shared/gates.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use GET." } }, 405);

  const userId = await requireUserId(req);
  if (userId instanceof Response) return userId;

  const url = new URL(req.url);
  const feature = url.searchParams.get("feature");
  const version = url.searchParams.get("version") || "v1";
  if (!feature) return json({ error: { code: "MISSING_INPUT", message: "feature obrigatório." } }, 400);

  const sb = adminClient();
  const { data } = await sb
    .from("user_tos_accepts").select("accepted_at")
    .eq("user_id", userId).eq("feature", feature).eq("version", version)
    .maybeSingle();

  return json({ accepted: !!data, accepted_at: data?.accepted_at ?? null, feature, version });
});
