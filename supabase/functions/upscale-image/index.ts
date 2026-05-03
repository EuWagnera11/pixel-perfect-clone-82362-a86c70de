// POST /upscale-image
// Body: { image_url, engine?: "magnific-creative"|"magnific-precision", scale_factor? }
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

  if (!body.image_url) return json({ error: "image_url required" }, 400);

  const engineId = body.engine || "magnific-creative";

  return await startGeneration({
    auth,
    engineId,
    tool: "upscale",
    op: "upscale",
    mediaType: "image",
    input: {
      prompt: "",
      aspect: "1:1",
      refs: [body.image_url],
      num: 1,
    },
  });
});
