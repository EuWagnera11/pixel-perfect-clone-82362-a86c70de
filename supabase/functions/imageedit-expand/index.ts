// POST /imageedit-expand
// Body: { image_url: string, prompt?: string, left?: number, right?: number, top?: number, bottom?: number }
// Outpainting via Flux Pro Expand. Pixels de margem em cada lado.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const clampPx = (n: any) => Math.max(0, Math.min(2048, Math.round(Number(n) || 0)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const imageUrl = body?.image_url;
  if (!imageUrl) return json({ error: { code: "MISSING_INPUT", message: "image_url obrigatório." } }, 400);
  const v = await validateImageUrl(imageUrl);
  if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);

  const left = clampPx(body?.left);
  const right = clampPx(body?.right);
  const top = clampPx(body?.top);
  const bottom = clampPx(body?.bottom);
  if (left + right + top + bottom === 0) {
    return json({ error: { code: "MISSING_INPUT", message: "Defina pelo menos um lado de expansão." } }, 400);
  }

  let prompt = "Continue the scene naturally, matching lighting, perspective and style.";
  if (body?.prompt) {
    const s = sanitizeUserText(body.prompt);
    if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
    if (s.text) prompt = s.text;
  }

  const model = getModel("flux-pro-expand")!;

  let refB64;
  try { refB64 = await urlToRefObject(imageUrl); }
  catch (e) { return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502); }

  return await startImageEditJob({
    req,
    tool: "expand",
    model: model.id,
    endpoint: model.endpoint,
    body: {
      image: refB64.image,
      prompt,
      left, right, top, bottom,
    },
    inputUrls: [imageUrl],
    metadata: { left, right, top, bottom },
  });
});
