// POST /imageedit-assets-gen
// Body: { prompt: string, refs?: string[], aspect_ratio?: string, kind?: "icon"|"sprite"|"prop"|"ui", model?: string }
// Gera assets de jogo / UI isolados, fundo limpo.
import { corsHeaders, json } from "../_shared/cors.ts";
import { validateImageUrl } from "../_shared/validateImage.ts";
import { sanitizeUserText } from "../_shared/sanitize.ts";
import { startImageEditJob } from "../_shared/imageeditFlow.ts";
import { getModel, TOOL_MODEL_WHITELIST, defaultModelForTool } from "../_shared/freepikModels.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const KIND_PROMPTS: Record<string, string> = {
  icon: "Flat vector-style icon, centered, clean silhouette, transparent or solid white background, crisp edges, app icon quality.",
  sprite: "2D game sprite, centered, isolated on plain background, consistent style for use in a sprite sheet.",
  prop: "Game prop asset, isolated on neutral background, PBR-ready textures, three-quarter view.",
  ui: "UI element, flat design, crisp edges, isolated on transparent or neutral background.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { code: "INVALID_JSON" } }, 400); }

  const s = sanitizeUserText(body?.prompt || "");
  if (!s.ok) return json({ error: { code: s.code, message: s.message } }, 400);
  if (!s.text) return json({ error: { code: "MISSING_PROMPT", message: "prompt obrigatório." } }, 400);

  const kind = (body?.kind || "icon").toString();
  const kindPrompt = KIND_PROMPTS[kind] || KIND_PROMPTS.icon;
  const finalPrompt = `${kindPrompt} Subject: ${s.text}.`;

  const refs: string[] = Array.isArray(body?.refs) ? body.refs.slice(0, 4) : [];
  for (const r of refs) {
    const v = await validateImageUrl(r);
    if (!v.ok) return json({ error: { code: v.code, message: v.message } }, 400);
  }

  const requested = (body?.model || defaultModelForTool("assets-gen")).toString();
  const allowed = TOOL_MODEL_WHITELIST["assets-gen"];
  const modelId = allowed.includes(requested) ? requested : defaultModelForTool("assets-gen");
  const model = getModel(modelId)!;

  let refsB64: Array<{ image: string; mime_type: string }> = [];
  try {
    for (const r of refs) refsB64.push(await urlToRefObject(r));
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
    inputUrls: refs,
    metadata: { kind, user_prompt: s.text },
  });
});
