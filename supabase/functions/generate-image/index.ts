// POST /generate-image
// Body: { prompt, aspect_ratio?, num_variations?, refs?: [{url}|string], model? }
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { startGeneration } from "../_shared/generation-flow.ts";
import { resolveImageEngine } from "../_shared/engines.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const prompt: string = (body.prompt || "").trim();
  if (!prompt) return json({ error: "prompt required" }, 400);

  const aspect = body.aspect_ratio || "1:1";
  const num = Math.max(1, Math.min(4, body.num_variations ?? 1));
  const refs: string[] = Array.isArray(body.refs)
    ? body.refs.map((r: any) => (typeof r === "string" ? r : r?.url)).filter(Boolean)
    : [];

  const engineId = resolveImageEngine(refs.length, body.model);

  return await startGeneration({
    auth,
    engineId,
    tool: "image",
    op: refs.length ? "i2i" : "t2i",
    mediaType: "image",
    input: { prompt, aspect, refs, num, resolution: body.resolution },
  });
});
