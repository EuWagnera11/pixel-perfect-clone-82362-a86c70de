// POST /edit-image
// Body: { image_url, prompt?, op: "remove-bg"|"replace-bg"|"relight"|"expand"|"style-transfer", style_url? }
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

  const op = body.op || "replace-bg";
  if (!body.image_url) return json({ error: "image_url required" }, 400);

  const refs = [body.image_url];
  if (body.style_url) refs.push(body.style_url);

  return await startGeneration({
    auth,
    engineId: op,
    tool: "edit",
    op: "edit",
    mediaType: "image",
    input: {
      prompt: (body.prompt || "").toString(),
      aspect: body.aspect_ratio || "1:1",
      refs,
      num: 1,
    },
  });
});
