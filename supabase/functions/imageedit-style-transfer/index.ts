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
  // Legacy (mantidos pra compat)
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
  // Catálogo Refine v1.0 (20 estilos curados)
  "cinematic-anamorphic": "shot on anamorphic lens, horizontal lens flares, oval bokeh, cinematic teal and orange grading, 2.39:1 aspect mood, deep blacks, film grain, professional color timing, motion picture stock",
  "kodak-portra-400": "shot on Kodak Portra 400, analog film, soft warm tones, natural skin glow, fine grain, slight haze, magic hour warmth, mid-contrast, film scan aesthetic",
  "fuji-velvia-50": "shot on Fuji Velvia 50, hyper-saturated landscape film, vivid greens and blues, punchy reds, fine grain, high color density, professional landscape photography",
  "editorial-magazine": "editorial magazine style, Vogue aesthetic, clean color grading, controlled contrast, flawless skin retouching, sophisticated lighting, high-end fashion photography",
  "vintage-70s": "1970s vintage photography, faded warm tones, mustard yellow, burnt orange, brown shadows, light leaks, slight haze, sun-bleached look, period accurate color processing",
  "noir-cinematic": "film noir, high contrast black and white, deep shadows, dramatic lighting, classic Hollywood, silver gelatin print, mysterious mood",
  "polaroid-instant": "Polaroid SX-70 instant photo, soft faded colors, slight green tint in shadows, warm highlights, vignette, slightly blurry edges, analog imperfection, nostalgic feel",
  "moody-dark": "moody dark photography, low-key lighting, deep shadows, controlled highlights, atmospheric, dramatic, modern dark aesthetic, rich blacks",
  "anime-cel-shaded": "anime cel-shaded illustration, flat color regions, clean line art, vibrant colors, Japanese animation style, Studio Ghibli inspired, 2D look, anime art",
  "watercolor-painting": "watercolor painting, soft wet edges, paper texture, transparent washes, bleeding colors, artistic brush strokes, traditional media, hand-painted",
  "oil-painting-classic": "classical oil painting, visible brush strokes, rich impasto texture, Old Masters style, Rembrandt lighting, deep chiaroscuro, museum quality, traditional fine art",
  "pixel-art-retro": "16-bit pixel art, limited color palette, visible pixels, dithering pattern, retro video game aesthetic, SNES era graphics, blocky resolution",
  "3d-render-octane": "Octane render, photorealistic 3D, physically based materials, ray-traced lighting, ultra detailed, studio lighting, product visualization quality, 8K render",
  "claymation-stop-motion": "claymation stop-motion, plasticine clay texture, handmade aesthetic, Wallace and Gromit style, Aardman Animations, slight finger marks, charming imperfection",
  "lowpoly-geometric": "low poly 3D art, geometric faceted surfaces, triangular polygons, flat shading, limited color palette, minimalist 3D aesthetic, isometric clean",
  "neon-cyberpunk": "cyberpunk neon aesthetic, saturated magenta and cyan, wet streets reflections, night atmosphere, Blade Runner mood, neon glow, futuristic city vibes",
  "minimalist-bw": "minimalist black and white, clean composition, negative space, subtle elegance, modern editorial, refined aesthetic, gallery quality",
  "risograph-print": "risograph print aesthetic, two-color screen printing, slight registration offset, paper texture, limited spot color palette, indie zine style, halftone patterns",
  "vaporwave-aesthetic": "vaporwave aesthetic, pastel pink and cyan, retrofuturism, 90s nostalgia, dreamy haze, gradient sky, surreal atmosphere, lo-fi quality",
  "tilt-shift-miniature": "tilt-shift photography, miniature effect, selective focus center band, blurred top and bottom, saturated colors, toy-like appearance, model city look",
  "double-exposure": "double exposure photography, ethereal blend, silhouette overlay with landscape texture, artistic composition, melancholic mood, fine art photography",
  "sun-bleached-summer": "sun-bleached summer photography, faded warm tones, blown out highlights, hazy atmosphere, beach nostalgia, vintage holiday feel, sunlight overexposure",
  "ink-print-monochrome": "Japanese sumi-e ink painting, brush strokes, washi paper texture, minimalist composition, Zen aesthetic, traditional black ink, calligraphic quality",
  "glitch-vhs": "VHS aesthetic, chromatic aberration, scan lines, analog video distortion, RGB color shift, magnetic tape glitch, 80s home video feel, retro lo-fi",
  "studio-product-clean": "professional studio product photography, clean background, technical lighting, soft shadows, catalog quality, e-commerce ready, sharp details, color accurate",
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
    metadata: { strength, has_style_ref: !!styleUrl, style_preset: stylePreset || null },
  });
});
