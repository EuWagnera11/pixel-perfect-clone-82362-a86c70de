// POST /upscale-image
// Body: { image_url? | video_url?, engine? }
// engines: magnific-creative, magnific-precision, magnific-precision-v2,
//          video-upscaler, video-upscaler-turbo
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

  const engineId = body.engine || "magnific-creative";
  const isVideo = engineId.startsWith("video-upscaler");
  const src = isVideo ? body.video_url : body.image_url;
  if (!src) return json({ error: isVideo ? "video_url required" : "image_url required" }, 400);

  return await startGeneration({
    auth,
    engineId,
    tool: "upscale",
    op: "upscale",
    mediaType: isVideo ? "video" : "image",
    input: {
      prompt: "",
      aspect: "1:1",
      refs: [src],
      num: 1,
    },
  });
});
