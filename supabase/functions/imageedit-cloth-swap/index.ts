// POST /imageedit-cloth-swap
// Body: { person_url: string, garment_url: string, category?: "top"|"bottom"|"dress"|"outerwear", prompt?: string }
// REQUIRES ToS acceptance for "cloth-swap". Output is watermarked in imageedit-status.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";
import { adminClient, requireUserId } from "../_shared/gates.ts";
import { hashUrl } from "../_shared/hash.ts";

const CATEGORY_HINT: Record<string, string> = {
  top: "Replace ONLY the upper-body garment (shirt, t-shirt, blouse, jacket).",
  bottom: "Replace ONLY the lower-body garment (pants, skirt, shorts).",
  dress: "Replace the full dress / one-piece outfit.",
  outerwear: "Replace ONLY the outer layer (coat, jacket, blazer).",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  const userId = await requireUserId(req);
  if (userId instanceof Response) return userId;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const personUrl = body?.person_url;
  const garmentUrl = body?.garment_url;
  if (!personUrl || !garmentUrl) {
    return json({ error: { code: "MISSING_INPUT", message: "person_url e garment_url obrigatórios." } }, 400);
  }
  for (const u of [personUrl, garmentUrl]) {
    const v = await validateImageUrl(u);
    if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);
  }

  const category = (body?.category || "top").toString();
  const catHint = CATEGORY_HINT[category] || CATEGORY_HINT.top;

  let extra = "";
  if (body?.prompt) {
    const s = sanitizeUserText(body.prompt);
    if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
    extra = s.text ? ` Additional direction: ${s.text}.` : "";
  }
  const finalPrompt =
    `${catHint} The first image shows the person; the second image shows the garment to apply. ` +
    "Preserve the person's face, body proportions, pose, hair, skin, and background exactly. " +
    "Match the garment's pattern, color, fabric texture, and fit naturally to the body. " +
    "Photorealistic, e-commerce quality, no warping." + extra;

  const model = getModel(defaultModelForTool("cloth-swap"))!;

  let refsB64: Array<{ image: string; mime_type: string }>;
  try {
    refsB64 = [await urlToRefObject(personUrl), await urlToRefObject(garmentUrl)];
  } catch (e) {
    return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502);
  }

  const res = await startImageEditJob({
    req,
    tool: "cloth-swap",
    model: model.id,
    endpoint: model.endpoint,
    body: {
      prompt: finalPrompt,
      reference_images: refsB64,
      aspect_ratio: body?.aspect_ratio || "3:4",
    },
    inputUrls: [personUrl, garmentUrl],
    metadata: { category, watermark: true },
    requireTos: true,
  });

  try {
    const cloned = res.clone();
    const data = await cloned.json();
    if (data?.generation_id) {
      const [pHash, gHash] = await Promise.all([hashUrl(personUrl), hashUrl(garmentUrl)]);
      adminClient().from("cloth_swap_logs").insert({
        user_id: userId,
        generation_id: data.generation_id,
        person_image_hash: pHash,
        garment_image_hash: gHash,
        category,
      }).then(() => {}, () => {});
    }
  } catch { /* ignore */ }

  return res;
});
