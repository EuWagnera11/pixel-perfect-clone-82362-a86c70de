// POST /imageedit-realistic-3d
// Body: { image_url: string, style?: "figurine"|"toy"|"sculpture"|"clay", prompt?: string, model?: string }
// Usa Nano Banana 2 com prompt cinemático pra render 3D fotorrealista.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, TOOL_MODEL_WHITELIST, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const STYLE_PROMPTS: Record<string, string> = {
  figurine:
    "Convert into a hyper-realistic 3D collectible figurine: glossy PVC finish, studio softbox lighting, displayed on a clean acrylic base, shallow depth of field, product photography of a designer toy.",
  toy:
    "Convert into a stylized 3D vinyl toy: smooth matte plastic, chibi proportions, soft three-point lighting, neutral seamless studio background, photographed like a Pop Mart blind-box collectible.",
  sculpture:
    "Convert into a museum-grade marble sculpture: chiseled stone texture, dramatic side-lighting, photographed on a black pedestal in a gallery, ultra realistic.",
  clay:
    "Convert into a stop-motion clay figurine: visible fingerprints in the clay, warm tungsten lighting, miniature studio set, photographed with a macro lens.",
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

  const style = (body?.style || "figurine").toString();
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.figurine;

  let extraPrompt = "";
  if (body?.prompt) {
    const s = sanitizeUserText(body.prompt);
    if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
    extraPrompt = s.text ? ` Additional direction: ${s.text}` : "";
  }
  const finalPrompt = `${stylePrompt}${extraPrompt} Preserve the subject's identity, pose, and key features from the reference image.`;

  // Modelo: whitelist da tool
  const requested = (body?.model || defaultModelForTool("realistic-3d")).toString();
  const allowed = TOOL_MODEL_WHITELIST["realistic-3d"];
  const modelId = allowed.includes(requested) ? requested : defaultModelForTool("realistic-3d");
  const model = getModel(modelId)!;

  // Nano-banana / flux-kontext esperam refs em base64
  let refsB64: Array<{ image: string; mime_type: string }>;
  try {
    refsB64 = [await urlToRefObject(imageUrl)];
  } catch (e) {
    return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502);
  }

  return await startImageEditJob({
    req,
    tool: "realistic-3d",
    model: model.id,
    endpoint: model.endpoint,
    body: {
      prompt: finalPrompt,
      reference_images: refsB64,
      aspect_ratio: body?.aspect_ratio || "1:1",
    },
    inputUrls: [imageUrl],
    metadata: { style },
  });
});
