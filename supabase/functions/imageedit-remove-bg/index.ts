// POST /imageedit-remove-bg
// Body: { image_url: string }
// Endpoint dedicado da Freepik — sem prompt, sem ref extra.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel } from "../_shared/freepikModels.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const imageUrl = body?.image_url;
  if (!imageUrl || typeof imageUrl !== "string") {
    return json({ error: { code: "MISSING_INPUT", message: "image_url obrigatório." } }, 400);
  }
  const v = await validateImageUrl(imageUrl);
  if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);

  const model = getModel("freepik-remove-bg")!;

  return await startImageEditJob({
    req,
    tool: "remove-bg",
    model: model.id,
    endpoint: model.endpoint,
    body: { image_url: imageUrl },
    inputUrls: [imageUrl],
  });
});
