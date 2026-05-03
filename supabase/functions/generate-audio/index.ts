// POST /generate-audio
// Body: { prompt, kind: "music"|"sfx", duration? }
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { startGeneration } from "../_shared/generation-flow.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const prompt = (body.prompt || "").trim();
  if (!prompt) return json({ error: "prompt required" }, 400);
  const engineId = body.kind === "sfx" ? "sfx" : "music";

  return await startGeneration({
    auth,
    engineId,
    tool: "audio",
    op: engineId,
    mediaType: "audio",
    input: { prompt, aspect: "1:1", refs: [], num: 1 },
  });
});
