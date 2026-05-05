// POST /edit-image
// Body: { image_url, prompt?, op, style_url?, extras? }
// op pode ser qualquer engine de edição: remove-bg, replace-bg, relight, expand,
// style-transfer, ideogram-edit, change-camera, reimagine-flux, skin-enhancer-*
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { startGeneration } from "../_shared/generation-flow.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { defaultModelForTool, getModel, TOOL_MODEL_WHITELIST } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const op = body.op || "replace-bg";
  if (!body.image_url) return json({ error: "image_url required" }, 400);
  if (op === "replace-bg") {
    const v = await validateImageUrl(body.image_url);
    if (!v.ok) return json({ error: v.message }, 400);

    const s = sanitizeUserText(body.prompt || "");
    if (!s.ok) return json({ error: s.message }, 400);
    if (!s.text) return json({ error: "prompt required for replace-bg" }, 400);

    const requested = (body.model || defaultModelForTool("replace-bg")).toString();
    const allowed = TOOL_MODEL_WHITELIST["replace-bg"];
    const modelId = allowed.includes(requested) ? requested : defaultModelForTool("replace-bg");
    const model = getModel(modelId);
    if (!model) return json({ error: "Unknown replace-bg model", detail: modelId }, 400);

    let refsB64;
    try { refsB64 = [await urlToRefObject(body.image_url)]; }
    catch (e) { return json({ error: "Ref fetch failed", detail: (e as Error).message }, 502); }

    return await startImageEditJob({
      req,
      tool: "replace-bg",
      model: model.id,
      endpoint: model.endpoint,
      body: {
        prompt:
          `Replace the background of the reference image with: ${s.text}. ` +
          `Keep the main subject perfectly intact — same pose, lighting on the subject, color, edges and proportions. ` +
          `Match the new background lighting to the subject realistically.`,
        reference_images: refsB64,
        aspect_ratio: body.aspect_ratio || "1:1",
      },
      inputUrls: [body.image_url],
      metadata: { user_prompt: s.text },
    });
  }
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
