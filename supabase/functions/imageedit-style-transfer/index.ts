// POST /imageedit-style-transfer
// Body: { image_url: string, style_url?: string, style_preset?: string, prompt?: string, strength?: number, aspect_ratio?: string, model?: string }
// Transfere o estilo (preset, style_url ou descrição em prompt) para image_url.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, TOOL_MODEL_WHITELIST, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const STYLE_PRESETS: Record<string, string> = {
  "anime": "Anime / manga illustration, clean line art, cel shading, expressive eyes, vibrant colors.",
  "oil-painting": "Classical oil painting, visible brush strokes, rich color depth, canvas texture.",
  "watercolor": "Watercolor painting, soft washes, paper grain, organic edges, transparent layers.",
  "pencil-sketch": "Detailed pencil sketch, graphite shading, hatching, crisp paper texture, monochrome.",
  "comic-book": "Comic book illustration, bold ink outlines, halftone dots, dynamic flat colors.",
  "pop-art": "Pop art, Lichtenstein-inspired, bold flat colors, halftone dots, thick black outlines.",
  "cyberpunk": "Cyberpunk neon aesthetic, magenta-cyan rim lighting, high contrast, futuristic.",
  "vaporwave": "Vaporwave aesthetic, pastel pink/cyan palette, retro 80s/90s, dreamy glow.",
  "renaissance": "Renaissance oil painting, chiaroscuro lighting, rich warm tones, classical composition.",
  "ukiyo-e": "Ukiyo-e Japanese woodblock print, flat colors, bold outlines, traditional patterns.",
  "claymation": "Claymation/clay sculpt, fingerprint texture, soft studio lighting, stop-motion feel.",
  "low-poly": "Low-poly 3D render, faceted geometry, flat shading, clean colors.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const imageUrl = body?.image_url;
  const styleUrl = body?.style_url;
  const stylePreset = body?.style_preset ? String(body.style_preset) : undefined;
  if (!imageUrl) return json({ error: { code: "MISSING_INPUT", message: "image_url obrigatório." } }, 400);
  if (!styleUrl && !stylePreset && !body?.prompt) {
    return json({ error: { code: "MISSING_INPUT", message: "Forneça style_url, style_preset ou prompt." } }, 400);
  }
  if (stylePreset && !STYLE_PRESETS[stylePreset]) {
    return json({ error: { code: "INVALID_STYLE_PRESET", message: "preset desconhecido." } }, 400);
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
  const presetText = stylePreset ? STYLE_PRESETS[stylePreset] : "";
  const finalPrompt =
    (styleUrl
      ? `Apply the artistic style from the second reference image to the first reference image. `
      : `Restyle the reference image. `) +
    (presetText ? `Target style: ${presetText} ` : "") +
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
