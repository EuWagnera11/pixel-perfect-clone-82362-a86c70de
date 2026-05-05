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
import {
  startRemoveBg, startColorize, startRealistic3D, startFaceSwap, startClothSwap,
  startDepthMap, startProductGen, startAssetsGen, startStyleTransfer, startReplaceBg,
  startExpand,
} from "../lib/imageedit";

export type ToolMediaKind = "image" | "video" | "audio";
export type JobFlow = "legacy" | "imageedit";

export type EnqueueResult = {
  generationId: string;
  mediaType: ToolMediaKind;
  taskId?: string;
  flow?: JobFlow; // default "legacy"
};

// ───────── IMAGE ─────────
export async function runImage(opts: {
  prompt: string; aspect: string; refs?: string[]; model?: string; numVariations?: number; quality?: string;
}): Promise<EnqueueResult> {
  if (!opts.prompt.trim()) throw new Error("Digite um prompt");
  const r = await startImage({
    prompt: opts.prompt,
    aspect_ratio: opts.aspect,
    num_variations: opts.numVariations ?? 1,
    refs: opts.refs ?? [],
    model: opts.model,
    resolution: opts.quality ? opts.quality.toLowerCase() : undefined,
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
  prompt: string; sourceUrl: string; model: string; aspect?: string; duration?: string; lastImageUrl?: string;
}): Promise<EnqueueResult> {
  if (!opts.sourceUrl) throw new Error("Anexe uma imagem inicial");
  if (opts.model === "pixverse-v5-transition" && !opts.lastImageUrl) {
    throw new Error("Pixverse Transition exige imagem final (último frame)");
  }
  const r = await startVideo({
    prompt: opts.prompt,
    image_url: opts.sourceUrl,
    model: opts.model || "kling-v2-5-pro",
    aspect_ratio: opts.aspect,
    duration: opts.duration,
    last_image_url: opts.lastImageUrl,
  });
  return { generationId: r.id, mediaType: "video", taskId: r.task_id };
}

// ───────── AUDIO ─────────
export async function runAudio(opts: {
  prompt: string; kind?: "music" | "sfx" | "voiceover" | "audio-isolation";
  extras?: Record<string, unknown>;
}): Promise<EnqueueResult> {
  const kind = opts.kind || "music";
  if (kind !== "audio-isolation" && !opts.prompt.trim()) throw new Error("Descreva o áudio / texto");
  if (kind === "audio-isolation" && !(opts.extras as any)?.audio_url) {
    throw new Error("Audio isolation exige URL do áudio");
  }
  const r = await startAudio({ prompt: opts.prompt, kind, extras: opts.extras });
  return { generationId: r.id, mediaType: "audio", taskId: r.task_id };
}

// ───────── EDIT ─────────
export async function runEdit(opts: {
  prompt: string;
  sourceUrl: string;
  op?: string;
  styleUrl?: string;
  extras?: Record<string, unknown>;
}): Promise<EnqueueResult> {
  if (!opts.sourceUrl) throw new Error("Anexe uma imagem para editar");
  const op = opts.op || "replace-bg";
  const needsPrompt = ["replace-bg", "relight", "expand", "style-transfer", "ideogram-edit", "reimagine-flux"];
  if (needsPrompt.includes(op) && !opts.prompt.trim()) throw new Error("Descreva a edição");
  if (op === "ideogram-edit" && !(opts.extras as any)?.mask_url) {
    throw new Error("Inpaint exige uma máscara (URL)");
  }
  const r = await startEdit({
    op, image_url: opts.sourceUrl, prompt: opts.prompt, style_url: opts.styleUrl,
    extras: opts.extras,
  });
  return { generationId: r.id, mediaType: "image", taskId: r.task_id };
}

// ───────── UPSCALE ─────────
export async function runUpscale(opts: {
  sourceUrl: string; engine?: string;
}): Promise<EnqueueResult> {
  if (!opts.sourceUrl) throw new Error("Anexe um arquivo para upscale");
  const engine = opts.engine || "magnific-creative";
  const isVideo = engine.startsWith("video-upscaler");
  const r = await startUpscale(
    isVideo ? { video_url: opts.sourceUrl, engine } : { image_url: opts.sourceUrl, engine }
  );
  return { generationId: r.id, mediaType: isVideo ? "video" : "image", taskId: r.task_id };
}

// ───────── NOVAS TOOLS (imageedit_*) ─────────
const ie = (id: string, mediaType: ToolMediaKind = "image"): EnqueueResult => ({
  generationId: id, mediaType, flow: "imageedit",
});

export async function runProduct(o: { prompt: string; aspect: string; sourceUrl?: string | null; model?: string }) {
  if (!o.sourceUrl) throw new Error("Anexe a foto do produto");
  if (!o.prompt.trim()) throw new Error("Descreva a cena de produto");
  const r = await startProductGen({ image_url: o.sourceUrl, prompt: o.prompt, aspect_ratio: o.aspect, model: o.model });
  return ie(r.generation_id);
}
export async function runEcommerce(o: { prompt: string; aspect: string; sourceUrl?: string | null; model?: string }) {
  if (!o.sourceUrl) throw new Error("Anexe a foto do produto");
  const prompt = `Studio e-commerce shot, clean white background. ${o.prompt}`;
  const r = await startProductGen({ image_url: o.sourceUrl, prompt, aspect_ratio: o.aspect, model: o.model });
  return ie(r.generation_id);
}
export async function runCharacter(o: { prompt: string; aspect: string; refs?: string[]; model?: string }) {
  return runImage({
    prompt: `Full character design, high detail. ${o.prompt}`,
    aspect: o.aspect || "4:5", refs: o.refs, model: o.model || "nano-banana-pro",
  });
}
export async function runR3D(o: { prompt: string; aspect: string; sourceUrl?: string | null; style?: "figurine"|"toy"|"sculpture"|"clay"; model?: string }) {
  if (!o.sourceUrl) throw new Error("Anexe a imagem de referência");
  const r = await startRealistic3D({
    image_url: o.sourceUrl, style: o.style || "figurine",
    prompt: o.prompt, aspect_ratio: o.aspect, model: o.model,
  });
  return ie(r.generation_id);
}
export async function runDepth(o: { sourceUrl?: string | null; mode?: "grayscale"|"colored" }) {
  if (!o.sourceUrl) throw new Error("Anexe a imagem para extrair depth");
  const r = await startDepthMap({ image_url: o.sourceUrl, mode: o.mode || "grayscale" });
  return ie(r.generation_id);
}
export async function runAssets(o: { prompt: string; aspect: string; refs?: string[]; kind?: "icon"|"sprite"|"prop"|"ui" }) {
  if (!o.prompt.trim()) throw new Error("Descreva o asset");
  const r = await startAssetsGen({ prompt: o.prompt, refs: o.refs, kind: o.kind || "icon", aspect_ratio: o.aspect });
  return ie(r.generation_id);
}
export async function runMarketing(o: { prompt: string; aspect: string; refs?: string[]; model?: string }) {
  return runImage({
    prompt: `Marketing campaign hero shot. ${o.prompt}`,
    aspect: o.aspect, refs: o.refs, model: o.model || "nano-banana-pro", numVariations: 1,
  });
}
// Edição via novas tools
export async function runRemoveBg(o: { sourceUrl: string }) {
  const r = await startRemoveBg({ image_url: o.sourceUrl });
  return ie(r.generation_id);
}
export async function runReplaceBg(o: { sourceUrl: string; prompt: string; aspect?: string }) {
  if (!o.prompt.trim()) throw new Error("Descreva o novo fundo");
  const r = await startReplaceBg({ image_url: o.sourceUrl, prompt: o.prompt, aspect_ratio: o.aspect });
  return ie(r.generation_id);
}
export async function runStyleTransferTool(o: { sourceUrl: string; styleUrl?: string; prompt?: string; aspect?: string }) {
  const r = await startStyleTransfer({ image_url: o.sourceUrl, style_url: o.styleUrl, prompt: o.prompt, aspect_ratio: o.aspect });
  return ie(r.generation_id);
}
export async function runExpand(o: { sourceUrl: string; prompt?: string; left?: number; right?: number; top?: number; bottom?: number }) {
  const r = await startExpand({ image_url: o.sourceUrl, prompt: o.prompt, left: o.left, right: o.right, top: o.top, bottom: o.bottom });
  return ie(r.generation_id);
}
export async function runColorize(o: { sourceUrl: string; palette?: "natural"|"vintage"|"vibrant"|"cinematic" }) {
  const r = await startColorize({ image_url: o.sourceUrl, palette: o.palette });
  return ie(r.generation_id);
}
export async function runFaceSwap(o: { sourceFaceUrl: string; targetUrl: string }) {
  const r = await startFaceSwap({ source_face_url: o.sourceFaceUrl, target_image_url: o.targetUrl });
  return ie(r.generation_id);
}
export async function runClothSwap(o: { personUrl: string; garmentUrl: string; category?: "top"|"bottom"|"dress"|"outerwear" }) {
  const r = await startClothSwap({ person_url: o.personUrl, garment_url: o.garmentUrl, category: o.category });
  return ie(r.generation_id);
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
  /** Segundo frame (último) para motores de transição (pixverse-v5-transition). */
  lastImageUrl?: string | null;
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
    case "video":      return runVideo({ prompt: p, sourceUrl: input.sourceUrl!, model: model!, aspect: input.aspect, duration: input.duration, lastImageUrl: input.lastImageUrl || undefined });
    case "audio":      return runAudio({ prompt: p, kind: input.audioKind });
    case "edit":       return runEdit({ prompt: p, sourceUrl: input.sourceUrl!, op: input.editOp });
    case "upscale":    return runUpscale({ sourceUrl: input.sourceUrl!, engine: input.upscaleEngine });
    case "product":    return runProduct({ prompt: p, aspect: input.aspect, sourceUrl: input.sourceUrl, model });
    case "ecommerce":  return runEcommerce({ prompt: p, aspect: input.aspect, sourceUrl: input.sourceUrl, model });
    case "character":  return runCharacter({ prompt: p, aspect: input.aspect, refs, model });
    case "r3d":        return runR3D({ prompt: p, aspect: input.aspect, sourceUrl: input.sourceUrl, model });
    case "depth":      return runDepth({ sourceUrl: input.sourceUrl });
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
