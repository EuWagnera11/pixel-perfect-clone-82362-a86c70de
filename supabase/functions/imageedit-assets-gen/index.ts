// POST /imageedit-assets-gen
// Body: {
//   prompt: string,                              (obrigatório, 3-200 chars)
//   refs?: string[],                             (até 4)
//   style_mode?: "preset"|"reference",           (default "preset")
//   style_preset?: string,                       (ex: "ultra-realista")
//   style_image?: string,                        (URL — obrigatório se mode=reference)
//   background?: "transparente"|"branco"|"preto", (default "transparente")
//   aspect_ratio?: string,
//   model?: string,
//   kind?: "icon"|"sprite"|"prop"|"ui",          (legado — opcional)
// }
// Pipeline:
//   - background "branco"/"preto" → 1 chamada (gera direto)
//   - background "transparente"   → gera com fundo branco e dispara remove-bg na fase 2
//                                   (etapa 2 acontece em imageedit-status quando metadata.pipeline_step === "generation")
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, TOOL_MODEL_WHITELIST, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const KIND_PROMPTS: Record<string, string> = {
  icon: "Flat vector-style icon, centered, clean silhouette, crisp edges, app icon quality.",
  sprite: "2D game sprite, centered, isolated, consistent style for use in a sprite sheet.",
  prop: "Game prop asset, isolated, PBR-ready textures, three-quarter view.",
  ui: "UI element, flat design, crisp edges, isolated.",
};

const STYLE_PRESETS: Record<string, string> = {
  "ultra-realista": "Ultra-realistic photographic rendering, physically based lighting, fine micro-detail.",
  "cyberpunk": "Cyberpunk neon aesthetic, magenta-cyan rim lighting, high contrast, futuristic.",
  "pixel-art": "Pixel art, 16-bit retro game style, limited palette, crisp pixels, no anti-aliasing.",
  "lowpoly": "Low-poly 3D render, faceted geometry, flat shading, clean colors.",
  "watercolor": "Watercolor painting, soft washes, paper grain, organic edges.",
  "ink": "Black ink line illustration, hatching, high contrast, no color.",
  "isometric": "Isometric view, 30° angles, clean vector style, flat colors with subtle shading.",
  "claymation": "Claymation/clay sculpt, fingerprint texture, soft studio lighting.",
};

const BG_INSTRUCTION: Record<string, string> = {
  transparente: "Place subject on a pure solid white background — the background will be programmatically removed.",
  branco: "Place subject on a pure solid white background, even lighting, no shadows.",
  preto: "Place subject on a pure solid black background, even lighting, no shadows.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const s = sanitizeUserText(body?.prompt || "");
  if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
  if (!s.text) return json({ error: { code: "MISSING_PROMPT", message: "prompt obrigatório." } }, 400);
  if (s.text.length < 3) return json({ error: { code: "TEXT_TOO_SHORT", message: "Texto muito curto." } }, 400);

  const background = (body?.background || "transparente").toString();
  if (!BG_INSTRUCTION[background]) {
    return json({ error: { code: "INVALID_BACKGROUND", message: "background inválido." } }, 400);
  }

  const styleMode = (body?.style_mode || "preset").toString();
  let styleInstruction = "";
  let styleImageUrl: string | undefined;
  if (styleMode === "preset") {
    const preset = (body?.style_preset || "ultra-realista").toString();
    const presetText = STYLE_PRESETS[preset];
    if (!presetText) return json({ error: { code: "INVALID_STYLE_PRESET", message: "preset inválido." } }, 400);
    styleInstruction = `Style: ${presetText}`;
  } else if (styleMode === "reference") {
    styleImageUrl = body?.style_image;
    if (!styleImageUrl) return json({ error: { code: "MISSING_INPUT", message: "style_image obrigatório no modo reference." } }, 400);
    const v = await validateImageUrl(styleImageUrl);
    if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);
    styleInstruction = "Style: match the artistic style of the LAST reference image.";
  } else {
    return json({ error: { code: "INVALID_INPUT", message: "style_mode inválido." } }, 400);
  }

  const refs: string[] = Array.isArray(body?.refs) ? body.refs.slice(0, 4) : [];
  for (const r of refs) {
    const v = await validateImageUrl(r);
    if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);
  }

  const requested = (body?.model || defaultModelForTool("assets-gen")).toString();
  const allowed = TOOL_MODEL_WHITELIST["assets-gen"];
  const modelId = allowed.includes(requested) ? requested : defaultModelForTool("assets-gen");
  const model = getModel(modelId)!;

  // Trunca refs para o limite do modelo, sempre preservando style image (último slot)
  const maxRefs = model.maxRefs ?? 14;
  const styleSlots = styleImageUrl ? 1 : 0;
  const assetRefBudget = Math.max(0, maxRefs - styleSlots);
  const truncatedRefs = refs.slice(0, assetRefBudget);
  const allRefUrls = [...truncatedRefs, ...(styleImageUrl ? [styleImageUrl] : [])];

  const kind = (body?.kind || "").toString();
  const kindHint = KIND_PROMPTS[kind] || "";

  const finalPrompt = [
    "Generate an isolated asset.",
    kindHint,
    `Subject: ${s.text}.`,
    styleInstruction,
    BG_INSTRUCTION[background],
    "Single subject, centered, no text, no logos, no extra elements.",
  ].filter(Boolean).join(" ");

  let refsB64: Array<{ image: string; mime_type: string }> = [];
  try {
    for (const r of allRefUrls) refsB64.push(await urlToRefObject(r));
  } catch (e) { return json({ error: { code: "REF_FETCH_FAILED", message: (e as Error).message } }, 502); }

  const reqBody: Record<string, unknown> = {
    prompt: finalPrompt,
    aspect_ratio: body?.aspect_ratio || "1:1",
  };
  if (refsB64.length) reqBody.reference_images = refsB64;

  return await startImageEditJob({
    req,
    tool: "assets-gen",
    model: model.id,
    endpoint: model.endpoint,
    body: reqBody,
    inputUrls: allRefUrls,
    metadata: {
      kind: kind || null,
      user_prompt: s.text,
      style_mode: styleMode,
      style_preset: styleMode === "preset" ? (body?.style_preset || "ultra-realista") : null,
      background,
      refs_count: truncatedRefs.length,
      // Pipeline marker — apenas quando precisamos da etapa 2
      pipeline_step: background === "transparente" ? "generation" : "done",
      remove_bg_task_id: null,
    },
  });
});
