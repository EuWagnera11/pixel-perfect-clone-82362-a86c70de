// POST /imageedit-face-swap
// Body: { source_face_url: string, target_image_url: string, prompt?: string }
// REQUIRES ToS acceptance for "face-swap". Output is watermarked in imageedit-status.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";
import { adminClient, requireUserId } from "../_shared/gates.ts";
import { hashUrl } from "../_shared/hash.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  // Auth aqui também (além do flow) pra capturar o userId p/ logging
  const userId = await requireUserId(req);
  if (userId instanceof Response) return userId;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const sourceUrl = body?.source_face_url;
  const targetUrl = body?.target_image_url;
  if (!sourceUrl || !targetUrl) {
    return json({ error: { code: "MISSING_INPUT", message: "source_face_url e target_image_url obrigatórios." } }, 400);
  }
  for (const u of [sourceUrl, targetUrl]) {
    const v = await validateImageUrl(u);
    if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);
  }

  let extra = "";
  if (body?.prompt) {
    const s = sanitizeUserText(body.prompt);
    if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
    extra = s.text ? ` Additional direction: ${s.text}.` : "";
  }
  const finalPrompt =
    "Replace ONLY the face in the second image with the face from the first image. " +
    "Preserve the second image's lighting, pose, hair, body, clothing, and background exactly. " +
    "Match skin tone seamlessly to the target. Photorealistic, no artifacts." + extra;

  const model = getModel(defaultModelForTool("face-swap"))!;

  let refsB64: Array<{ image: string; mime_type: string }>;
  try {
    refsB64 = [await urlToRefObject(sourceUrl), await urlToRefObject(targetUrl)];
  } catch (e) {
    return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502);
  }

  const res = await startImageEditJob({
    req,
    tool: "face-swap",
    model: model.id,
    endpoint: model.endpoint,
    body: {
      prompt: finalPrompt,
      reference_images: refsB64,
      aspect_ratio: body?.aspect_ratio || "1:1",
    },
    inputUrls: [sourceUrl, targetUrl],
    metadata: { watermark: true },
    requireTos: true,
  });

  // Audit log (fire-and-forget)
  try {
    const cloned = res.clone();
    const data = await cloned.json();
    if (data?.generation_id) {
      const [srcHash, tgtHash] = await Promise.all([hashUrl(sourceUrl), hashUrl(targetUrl)]);
      adminClient().from("face_swap_logs").insert({
        user_id: userId,
        generation_id: data.generation_id,
        source_face_hash: srcHash,
        target_image_hash: tgtHash,
      }).then(() => {}, () => {});
    }
  } catch { /* ignore */ }

  return res;
});
