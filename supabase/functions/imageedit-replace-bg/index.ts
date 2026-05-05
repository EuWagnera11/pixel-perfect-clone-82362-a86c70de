// POST /imageedit-replace-bg
// Body: { image_url: string, prompt: string, aspect_ratio?: string, model?: string }
// Substitui o fundo da imagem preservando o sujeito.
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
  if (!imageUrl) return json({ error: { code: "MISSING_INPUT", message: "image_url obrigatório." } }, 400);
  const v = await validateImageUrl(imageUrl);
  if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);

  const s = sanitizeUserText(body?.prompt || "");
  if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
  if (!s.text) return json({ error: { code: "MISSING_PROMPT", message: "Descreva o novo fundo." } }, 400);

  const finalPrompt =
    `Replace the background of the reference image with: ${s.text}. ` +
    `Keep the main subject perfectly intact — same pose, lighting on the subject, color, edges and proportions. ` +
    `Match the new background lighting to the subject realistically.`;

  const requested = (body?.model || "nano-banana-pro-flash").toString();
  const allowed = TOOL_MODEL_WHITELIST["replace-bg"];
  const modelId = allowed.includes(requested) ? requested : defaultModelForTool("replace-bg");
  const model = getModel(modelId)!;

  let refsB64;
  try { refsB64 = [await urlToRefObject(imageUrl)]; }
  catch (e) { return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502); }

  return await startImageEditJob({
    req,
    tool: "replace-bg",
    model: model.id,
    endpoint: model.endpoint,
    aspectStyle: "freepik",
    body: {
      prompt: finalPrompt,
      reference_images: refsB64,
      aspect_ratio: body?.aspect_ratio || "1:1",
    },
    inputUrls: [imageUrl],
    metadata: { user_prompt: s.text },
  });
});
