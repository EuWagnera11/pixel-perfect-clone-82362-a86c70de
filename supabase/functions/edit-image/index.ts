// POST /edit-image
// Body: { image_url, prompt?, op, style_url?, extras? }
// op pode ser qualquer engine de edição: remove-bg, replace-bg, relight, expand,
// style-transfer, ideogram-edit, change-camera, reimagine-flux, skin-enhancer-*
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
  if ((op === "replace-bg" || op === "style-transfer") && !body.style_url) {
    return json({ error: "style_url (reference image) required for " + op }, 400);
  }

  const refs: string[] = [body.image_url];
  if (body.style_url) refs.push(body.style_url);
  // Inpaint usa máscara como segundo ref
  const mask = body.extras?.mask_url || body.mask_url;
  if (op === "ideogram-edit" && mask) refs.push(mask);

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
      extra: body.extras || {},
    },
  });
});
