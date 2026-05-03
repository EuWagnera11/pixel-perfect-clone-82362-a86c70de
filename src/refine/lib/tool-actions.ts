/**
 * Tool action dispatcher.
 * Cada aba da Sidebar chama uma função edge específica.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  startImage, startVideo, startEdit, startUpscale, startAudio,
  pollGeneration,
} from "../hooks/useGenerations";

export type ToolResult = {
  url: string;
  type: "image" | "video" | "audio";
  creditsUsed?: number;
};

export type ToolInput = {
  tab: string;
  prompt: string;
  ratio: string;
  sourceUrl?: string | null;
  modelId?: string | null;
};

export function tabRequiresUpload(tab: string): boolean {
  return ["upscale", "edit", "ecommerce", "product", "video"].includes(tab);
}

export function tabPromptOptional(tab: string): boolean {
  return ["upscale"].includes(tab);
}

const IMAGE_MODEL: Record<string, string> = {
  image: "nano-banana-pro",
  cinema: "nano-banana-pro",
  character: "nano-banana-pro",
  marketing: "nano-banana-pro",
  assets: "nano-banana-pro-flash",
  r3d: "seedream-v4",
  depth: "nano-banana-pro",
  product: "nano-banana-pro",
  ecommerce: "nano-banana-pro",
};

export async function executeToolAction(input: ToolInput): Promise<ToolResult> {
  const { tab, prompt, ratio, sourceUrl, modelId } = input;

  // ============ VIDEO ============
  if (tab === "video") {
    if (!sourceUrl) throw new Error("Anexe uma imagem inicial pra animar");
    const engine = modelId || "kling-v2-5-pro";
    const created = await startVideo({
      prompt, aspect_ratio: ratio, image_url: sourceUrl, model: engine,
    });
    const final = await pollGeneration(created.id, 600_000);
    if (final.status === "failed") throw new Error(final.error_message || "Vídeo falhou");
    const url = final.video_urls?.[0];
    if (!url) throw new Error("Vídeo sem URL");
    return { url, type: "video" };
  }

  // ============ AUDIO ============
  if (tab === "audio") {
    if (!prompt.trim()) throw new Error("Digite o prompt de áudio");
    const created = await startAudio({ prompt, kind: "music" });
    const final = await pollGeneration(created.id, 300_000);
    if (final.status === "failed") throw new Error(final.error_message || "Áudio falhou");
    const url = final.video_urls?.[0] || final.image_urls?.[0];
    if (!url) throw new Error("Áudio sem URL");
    return { url, type: "audio" };
  }

  // ============ UPSCALE ============
  if (tab === "upscale") {
    if (!sourceUrl) throw new Error("Anexe uma imagem para upscale");
    const created = await startUpscale({ image_url: sourceUrl, engine: "magnific-creative" });
    const final = await pollGeneration(created.id, 300_000);
    if (final.status === "failed") throw new Error(final.error_message || "Upscale falhou");
    const url = final.image_urls?.[0];
    if (!url) throw new Error("Upscale sem URL");
    return { url, type: "image" };
  }

  // ============ EDIT ============
  if (tab === "edit") {
    if (!sourceUrl) throw new Error("Anexe uma imagem para editar");
    if (!prompt.trim()) throw new Error("Descreva a edição");
    const created = await startEdit({ op: "replace-bg", image_url: sourceUrl, prompt });
    const final = await pollGeneration(created.id, 300_000);
    if (final.status === "failed") throw new Error(final.error_message || "Edit falhou");
    const url = final.image_urls?.[0];
    if (!url) throw new Error("Edit sem URL");
    return { url, type: "image" };
  }

  // ============ DEFAULT: IMAGE ============
  if (!prompt.trim()) throw new Error("Digite um prompt primeiro");
  const model = modelId || IMAGE_MODEL[tab] || "nano-banana-pro";
  const refs: string[] = sourceUrl ? [sourceUrl] : [];
  const created = await startImage({
    prompt, aspect_ratio: ratio, num_variations: 1, refs, model,
  });
  const final = await pollGeneration(created.id, 300_000);
  if (final.status === "failed") throw new Error(final.error_message || "Geração falhou");
  const url = final.image_urls?.[0];
  if (!url) throw new Error("Imagem sem URL");
  return { url, type: "image" };
}

/** Upload via edge function uploads-file (Supabase Storage bucket `uploads`, public). */
export async function uploadFileForTool(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const { data, error } = await supabase.functions.invoke<{ url: string }>("uploads-file", {
    method: "POST",
    body: fd,
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Upload sem URL");
  return data.url;
}
