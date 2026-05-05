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
  const lastImageUrl: string | undefined =
    body.last_image_url || body.lastImageUrl || undefined;
  const extras = body.extras || {};

  // Lip-sync usa video_url no lugar de image_url
  if (engineId === "latent-sync") {
    const v = body.video_url || body.image_url || refs[0];
    const a = body.audio_url || extras.audio_url;
    if (!v) return json({ error: "video_url required for lip-sync" }, 400);
    if (!a) return json({ error: "audio_url required for lip-sync" }, 400);
    return await startGeneration({
      auth, engineId, tool: "video", op: "lip-sync", mediaType: "video",
      input: { prompt: "", aspect: "16:9", refs: [v], num: 1, extra: { audio_url: a } },
    });
  }

  // Video upscaler aceita video como ref
  if (engineId === "video-upscaler" || engineId === "video-upscaler-turbo") {
    const v = body.video_url || body.image_url || refs[0];
    if (!v) return json({ error: "video_url required for video upscaler" }, 400);
    return await startGeneration({
      auth, engineId, tool: "video", op: "upscale", mediaType: "video",
      input: { prompt: "", aspect: "16:9", refs: [v], num: 1, extra: extras },
    });

  // Most engines are i2v; LTX/Wan-t2v are pure t2v; Seedance 1.5 + Omnihuman live under /video/ and accept both
  const isT2V = engine.path.includes("/text-to-video/");
  const isFlexible = engine.path.startsWith("/v1/ai/video/"); // seedance-1-5-pro-* / omnihuman / video-upscaler / lip-sync
  const isTransition = engineId === "pixverse-v5-transition";

  if (isTransition) {
    if (!refs[0]) return json({ error: "first image (image_url) required for transition" }, 400);
    if (!lastImageUrl) return json({ error: "last_image_url required for transition" }, 400);
  } else if (!isT2V && !isFlexible && !refs[0]) {
    return json({ error: "image_url required for image-to-video engines" }, 400);
  }
  if (!prompt && isT2V) {
    return json({ error: "prompt required for text-to-video engines" }, 400);
  }

  return await startGeneration({
    auth,
    engineId,
    tool: "video",
    op: isTransition ? "frames" : (isT2V ? "t2v" : "i2v"),
    mediaType: "video",
    input: {
      prompt,
      aspect: body.aspect_ratio || "16:9",
      refs,
      num: 1,
      duration: body.duration || (engineId.startsWith("hailuo") ? "6" : "5"),
      lastImageUrl,
      extra: extras,
    },
  });
});
