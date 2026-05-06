// POST /generate-audio
// Body: { prompt?, kind: "music"|"sfx"|"voiceover"|"audio-isolation", extras? }
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { startGeneration } from "../_shared/generation-flow.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req, { rateLimit: { bucket: "generate-audio:min", limit: 15, windowSeconds: 60 } });
  if (auth instanceof Response) return auth;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const kind = body.kind || "music";
  const allowed = new Set(["music", "sfx", "voiceover", "audio-isolation"]);
  if (!allowed.has(kind)) return json({ error: "Unknown kind", detail: kind }, 400);

  const prompt = (body.prompt || "").trim();
  const extras = body.extras || {};

  if (kind === "audio-isolation") {
    if (!extras.audio_url) return json({ error: "extras.audio_url required" }, 400);
  } else {
    if (!prompt) return json({ error: "prompt required" }, 400);
  }

  const refs: string[] = kind === "audio-isolation" ? [extras.audio_url] : [];

  return await startGeneration({
    auth,
    engineId: kind,
    tool: "audio",
    op: kind,
    mediaType: "audio",
    input: { prompt, aspect: "1:1", refs, num: 1, extra: extras },
  });
});
