// POST /generate-video
// Body: { prompt, image_url?, model, duration?, aspect_ratio? }
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { startGeneration } from "../_shared/generation-flow.ts";
import { getEngine } from "../_shared/engines.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const engineId = body.model || "kling-v2-5-pro";
  const engine = getEngine(engineId);
  if (!engine || engine.kind !== "video") {
    return json({ error: "Unknown video engine", detail: engineId }, 400);
  }

  const prompt = (body.prompt || "").toString();
  const refs: string[] = body.image_url ? [body.image_url] : (
    Array.isArray(body.refs)
      ? body.refs.map((r: any) => typeof r === "string" ? r : r?.url).filter(Boolean)
      : []
  );

  // Most engines are i2v; only LTX/Wan-t2v are pure t2v
  const isT2V = engine.path.includes("/text-to-video/");
  if (!isT2V && !refs[0]) {
    return json({ error: "image_url required for image-to-video engines" }, 400);
  }
  if (!prompt && isT2V) {
    return json({ error: "prompt required for text-to-video engines" }, 400);
  }

  return await startGeneration({
    auth,
    engineId,
    tool: "video",
    op: isT2V ? "t2v" : "i2v",
    mediaType: "video",
    input: {
      prompt,
      aspect: body.aspect_ratio || "16:9",
      refs,
      num: 1,
      duration: body.duration || (engineId.startsWith("hailuo") ? "6" : "5"),
    },
  });
});
