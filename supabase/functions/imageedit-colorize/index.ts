// POST /imageedit-colorize
// Body: { image_url: string, palette?: "natural"|"vintage"|"vibrant"|"cinematic", prompt?: string, model?: string }
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, TOOL_MODEL_WHITELIST, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const PALETTE_PROMPTS: Record<string, string> = {
  natural:
    "Colorize this black and white photograph with natural, historically accurate colors. Preserve all original details, grain, and lighting. Realistic skin tones, true-to-era clothing colors.",
  vintage:
    "Colorize this black and white photograph with a warm vintage Kodachrome palette: soft creams, muted teals, golden highlights. Slight film grain, period-accurate colors.",
  vibrant:
    "Colorize this black and white photograph with rich, saturated, magazine-editorial colors. Vivid but balanced, modern color grading.",
  cinematic:
    "Colorize this black and white photograph with a cinematic teal-and-orange grade. Deep shadows, warm midtones, cool highlights, filmic contrast.",
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

  const palette = (body?.palette || "natural").toString();
  const palettePrompt = PALETTE_PROMPTS[palette] || PALETTE_PROMPTS.natural;

  let extra = "";
  if (body?.prompt) {
    const s = sanitizeUserText(body.prompt);
    if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
    extra = s.text ? ` Additional direction: ${s.text}` : "";
  }
  const finalPrompt = `${palettePrompt}${extra} Do not alter composition, faces, or details — only add color.`;

  const requested = (body?.model || defaultModelForTool("colorize")).toString();
  const allowed = TOOL_MODEL_WHITELIST["colorize"];
  const modelId = allowed.includes(requested) ? requested : defaultModelForTool("colorize");
  const model = getModel(modelId)!;

  let refsB64: Array<{ image: string; mime_type: string }>;
  try {
    refsB64 = [await urlToRefObject(imageUrl)];
  } catch (e) {
    return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502);
  }

  return await startImageEditJob({
    req,
    tool: "colorize",
    model: model.id,
    endpoint: model.endpoint,
    body: {
      prompt: finalPrompt,
      reference_images: refsB64,
      aspect_ratio: body?.aspect_ratio || "1:1",
    },
    inputUrls: [imageUrl],
    metadata: { palette },
  });
});
