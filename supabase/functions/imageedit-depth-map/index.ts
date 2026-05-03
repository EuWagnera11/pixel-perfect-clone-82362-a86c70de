// POST /imageedit-depth-map
// Body: { image_url: string, mode?: "grayscale"|"colored", prompt?: string }
// Gera depth map a partir de imagem usando Nano Banana 2.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const MODE_PROMPT: Record<string, string> = {
  grayscale:
    "Generate a precise grayscale depth map of this image. Pure white = closest to camera, pure black = farthest. Smooth gradients, no color, no texture, no shading from lighting — only depth.",
  colored:
    "Generate a turbo-colormap depth visualization of this image. Red/yellow = closest to camera, blue/purple = farthest. Smooth gradient transitions, no original texture, only depth encoded in color.",
};

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

  const mode = (body?.mode || "grayscale").toString();
  const modePrompt = MODE_PROMPT[mode] || MODE_PROMPT.grayscale;

  let extra = "";
  if (body?.prompt) {
    const s = sanitizeUserText(body.prompt);
    if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
    extra = s.text ? ` ${s.text}.` : "";
  }
  const finalPrompt = `${modePrompt}${extra} Match composition exactly.`;

  const model = getModel(defaultModelForTool("depth-map"))!;

  let refsB64: Array<{ image: string; mime_type: string }>;
  try {
    refsB64 = [await urlToRefObject(imageUrl)];
  } catch (e) {
    return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502);
  }

  return await startImageEditJob({
    req,
    tool: "depth-map",
    model: model.id,
    endpoint: model.endpoint,
    body: {
      prompt: finalPrompt,
      reference_images: refsB64,
      aspect_ratio: body?.aspect_ratio || "1:1",
    },
    inputUrls: [imageUrl],
    metadata: { mode },
  });
});
