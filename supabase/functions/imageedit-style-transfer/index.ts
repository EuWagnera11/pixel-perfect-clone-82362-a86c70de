// POST /imageedit-style-transfer
// Body: { image_url: string, style_url?: string, prompt?: string, strength?: number, aspect_ratio?: string, model?: string }
// Transfere o estilo de style_url (ou descrição em prompt) para image_url.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, TOOL_MODEL_WHITELIST, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const imageUrl = body?.image_url;
  const styleUrl = body?.style_url;
  if (!imageUrl) return json({ error: { code: "MISSING_INPUT", message: "image_url obrigatório." } }, 400);
  if (!styleUrl && !body?.prompt) {
    return json({ error: { code: "MISSING_INPUT", message: "Forneça style_url ou prompt." } }, 400);
  }

  for (const u of [imageUrl, styleUrl].filter(Boolean) as string[]) {
    const v = await validateImageUrl(u);
    if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);
  }

  let extra = "";
  if (body?.prompt) {
    const s = sanitizeUserText(body.prompt);
    if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
    extra = s.text || "";
  }

  const strength = Math.max(0.1, Math.min(1, Number(body?.strength) || 0.7));
  const finalPrompt =
    (styleUrl
      ? `Apply the artistic style from the second reference image to the first reference image. `
      : `Restyle the reference image. `) +
    (extra ? `Style direction: ${extra}. ` : "") +
    `Preserve the composition, subject identity and pose of the source. Style strength: ${strength.toFixed(2)}.`;

  const requested = (body?.model || defaultModelForTool("style-transfer")).toString();
  const allowed = TOOL_MODEL_WHITELIST["style-transfer"];
  const modelId = allowed.includes(requested) ? requested : defaultModelForTool("style-transfer");
  const model = getModel(modelId)!;

  const refUrls = [imageUrl, ...(styleUrl ? [styleUrl] : [])];
  let refsB64;
  try { refsB64 = await Promise.all(refUrls.map(urlToRefObject)); }
  catch (e) { return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502); }

  return await startImageEditJob({
    req,
    tool: "style-transfer",
    model: model.id,
    endpoint: model.endpoint,
    body: {
      prompt: finalPrompt,
      reference_images: refsB64,
      aspect_ratio: body?.aspect_ratio || "1:1",
    },
    inputUrls: refUrls,
    metadata: { strength, has_style_ref: !!styleUrl },
  });
});
