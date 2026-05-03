/**
 * Per-tool handlers.
 * Cada ferramenta tem sua propria função `runX` que dispara o job e retorna
 * { generationId, mediaType, taskId } SEM bloquear (sem polling).
 * O polling vive na fila (jobs.tsx) — assim o usuário pode disparar várias
 * gerações em paralelo.
 */
import {
  startImage, startVideo, startEdit, startUpscale, startAudio,
} from "../hooks/useGenerations";

export type ToolMediaKind = "image" | "video" | "audio";

export type EnqueueResult = {
  generationId: string;
  mediaType: ToolMediaKind;
  taskId?: string;
};

// ───────── IMAGE ─────────
export async function runImage(opts: {
  prompt: string; aspect: string; refs?: string[]; model?: string; numVariations?: number;
}): Promise<EnqueueResult> {
  if (!opts.prompt.trim()) throw new Error("Digite um prompt");
  const r = await startImage({
    prompt: opts.prompt,
    aspect_ratio: opts.aspect,
    num_variations: opts.numVariations ?? 1,
    refs: opts.refs ?? [],
    model: opts.model,
  });
  return { generationId: r.id, mediaType: "image", taskId: r.task_id };
}

// ───────── CINEMA ─────────
export async function runCinema(opts: {
  prompt: string; aspect: string; refs?: string[]; model?: string;
}): Promise<EnqueueResult> {
  const cinematic = `Cinematic still, anamorphic, dramatic lighting, depth of field. ${opts.prompt}`;
  return runImage({ ...opts, prompt: cinematic, aspect: opts.aspect || "21:9" });
}

// ───────── VIDEO ─────────
export async function runVideo(opts: {
  prompt: string; sourceUrl: string; model: string; aspect?: string; duration?: string;
}): Promise<EnqueueResult> {
  if (!opts.sourceUrl) throw new Error("Anexe uma imagem inicial");
  const r = await startVideo({
    prompt: opts.prompt,
    image_url: opts.sourceUrl,
    model: opts.model || "kling-v2-5-pro",
    aspect_ratio: opts.aspect,
    duration: opts.duration,
  });
  return { generationId: r.id, mediaType: "video", taskId: r.task_id };
}

// ───────── AUDIO ─────────
export async function runAudio(opts: {
  prompt: string; kind?: "music" | "sfx";
}): Promise<EnqueueResult> {
  if (!opts.prompt.trim()) throw new Error("Descreva o áudio");
  const r = await startAudio({ prompt: opts.prompt, kind: opts.kind || "music" });
  return { generationId: r.id, mediaType: "audio", taskId: r.task_id };
}

// ───────── EDIT ─────────
export async function runEdit(opts: {
  prompt: string;
  sourceUrl: string;
  op?: "remove-bg" | "replace-bg" | "relight" | "expand" | "style-transfer";
  styleUrl?: string;
}): Promise<EnqueueResult> {
  if (!opts.sourceUrl) throw new Error("Anexe uma imagem para editar");
  const op = opts.op || "replace-bg";
  if (op !== "remove-bg" && !opts.prompt.trim()) throw new Error("Descreva a edição");
  const r = await startEdit({
    op, image_url: opts.sourceUrl, prompt: opts.prompt, style_url: opts.styleUrl,
  });
  return { generationId: r.id, mediaType: "image", taskId: r.task_id };
}

// ───────── UPSCALE ─────────
export async function runUpscale(opts: {
  sourceUrl: string; engine?: "magnific-creative" | "magnific-precision";
}): Promise<EnqueueResult> {
  if (!opts.sourceUrl) throw new Error("Anexe uma imagem para upscale");
  const r = await startUpscale({
    image_url: opts.sourceUrl, engine: opts.engine || "magnific-creative",
  });
  return { generationId: r.id, mediaType: "image", taskId: r.task_id };
}

// ───────── PRODUCT / E-COMMERCE / CHARACTER / ASSETS / 3D / DEPTH / MARKETING ─────────
// Todos delegam pra runImage com defaults adequados ao caso.
export async function runProduct(o: { prompt: string; aspect: string; sourceUrl?: string | null; model?: string }) {
  if (!o.sourceUrl) throw new Error("Anexe a foto do produto");
  return runImage({ prompt: o.prompt, aspect: o.aspect, refs: [o.sourceUrl], model: o.model || "nano-banana-pro" });
}
export async function runEcommerce(o: { prompt: string; aspect: string; sourceUrl?: string | null; model?: string }) {
  if (!o.sourceUrl) throw new Error("Anexe a foto do produto");
  return runImage({
    prompt: `Studio e-commerce shot, clean background. ${o.prompt}`,
    aspect: o.aspect, refs: [o.sourceUrl], model: o.model || "nano-banana-pro",
  });
}
export async function runCharacter(o: { prompt: string; aspect: string; refs?: string[]; model?: string }) {
  return runImage({
    prompt: `Full character design, high detail. ${o.prompt}`,
    aspect: o.aspect || "4:5", refs: o.refs, model: o.model || "nano-banana-pro",
  });
}
export async function runR3D(o: { prompt: string; aspect: string; refs?: string[]; model?: string }) {
  return runImage({
    prompt: `Realistic 3D render, octane, raytracing. ${o.prompt}`,
    aspect: o.aspect, refs: o.refs, model: o.model || "seedream-v4",
  });
}
export async function runDepth(o: { prompt: string; aspect: string; sourceUrl?: string | null }) {
  if (!o.sourceUrl) throw new Error("Anexe a imagem para extrair depth");
  return runImage({
    prompt: `Depth map, grayscale, distance encoded. ${o.prompt}`,
    aspect: o.aspect, refs: [o.sourceUrl], model: "nano-banana-pro",
  });
}
export async function runAssets(o: { prompt: string; aspect: string; refs?: string[] }) {
  return runImage({
    prompt: `Game asset, isolated on transparent background, clean PBR. ${o.prompt}`,
    aspect: o.aspect, refs: o.refs, model: "nano-banana-pro-flash",
  });
}
export async function runMarketing(o: { prompt: string; aspect: string; refs?: string[]; model?: string }) {
  return runImage({
    prompt: `Marketing campaign hero shot. ${o.prompt}`,
    aspect: o.aspect, refs: o.refs, model: o.model || "nano-banana-pro", numVariations: 1,
  });
}

// ───────── Dispatcher por tab ─────────
export type DispatchInput = {
  tab: string;
  prompt: string;
  aspect: string;
  sourceUrl?: string | null;
  model?: string | null;
  editOp?: "remove-bg" | "replace-bg" | "relight" | "expand" | "style-transfer";
  upscaleEngine?: "magnific-creative" | "magnific-precision";
  audioKind?: "music" | "sfx";
  duration?: string;
  quality?: string;
  numVariations?: number;
  stylePack?: string | null;
};

const STYLE_PACK_SUFFIX: Record<string, string> = {
  "Editorial": "editorial fashion photography, magazine cover, dramatic lighting",
  "Cyberpunk": "cyberpunk neon city, blade runner aesthetic, rain, holograms",
  "Fantasy": "epic fantasy art, painterly, magical lighting, cinematic",
  "Cinematic": "cinematic film still, anamorphic lens, color graded, depth of field",
  "Portrait": "studio portrait, soft key light, 85mm, shallow depth of field",
  "Surreal": "surrealist scene, dreamlike, impossible geometry, vivid colors",
};
const applyStyle = (p: string, pack?: string | null) =>
  pack && STYLE_PACK_SUFFIX[pack] ? `${p}. ${STYLE_PACK_SUFFIX[pack]}` : p;

export async function dispatchTool(input: DispatchInput): Promise<EnqueueResult> {
  const refs = input.sourceUrl ? [input.sourceUrl] : [];
  const model = input.model || undefined;
  const p = applyStyle(input.prompt, input.stylePack);
  const num = input.numVariations ?? 1;
  switch (input.tab) {
    case "image":      return runImage({ prompt: p, aspect: input.aspect, refs, model, numVariations: num, quality: input.quality });
    case "cinema":     return runCinema({ prompt: p, aspect: input.aspect, refs, model });
    case "video":      return runVideo({ prompt: p, sourceUrl: input.sourceUrl!, model: model!, aspect: input.aspect, duration: input.duration });
    case "audio":      return runAudio({ prompt: p, kind: input.audioKind });
    case "edit":       return runEdit({ prompt: p, sourceUrl: input.sourceUrl!, op: input.editOp });
    case "upscale":    return runUpscale({ sourceUrl: input.sourceUrl!, engine: input.upscaleEngine });
    case "product":    return runProduct({ prompt: p, aspect: input.aspect, sourceUrl: input.sourceUrl, model });
    case "ecommerce":  return runEcommerce({ prompt: p, aspect: input.aspect, sourceUrl: input.sourceUrl, model });
    case "character":  return runCharacter({ prompt: p, aspect: input.aspect, refs, model });
    case "r3d":        return runR3D({ prompt: p, aspect: input.aspect, refs, model });
    case "depth":      return runDepth({ prompt: p, aspect: input.aspect, sourceUrl: input.sourceUrl });
    case "assets":     return runAssets({ prompt: p, aspect: input.aspect, refs });
    case "marketing":  return runMarketing({ prompt: p, aspect: input.aspect, refs, model });
    default:           return runImage({ prompt: p, aspect: input.aspect, refs, model, numVariations: num, quality: input.quality });
  }
}

export function tabRequiresUpload(tab: string): boolean {
  return ["upscale", "edit", "ecommerce", "product", "video", "depth"].includes(tab);
}
export function tabPromptOptional(tab: string): boolean {
  return ["upscale"].includes(tab);
}
