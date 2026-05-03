/**
 * Client das 11 ferramentas novas (`imageedit_*` edge functions).
 * Cada `start*` dispara o job e retorna { generation_id, task_id }.
 * O polling unificado vive em `pollImageEdit` → chama `imageedit-status`.
 */
import { supabase } from "@/integrations/supabase/client";

export type ImageEditTool =
  | "remove-bg" | "realistic-3d" | "colorize"
  | "face-swap" | "cloth-swap" | "depth-map"
  | "product-gen" | "assets-gen" | "style-transfer"
  | "replace-bg" | "expand";

export type ImageEditStarted = {
  generation_id: string;
  task_id?: string;
  status: string;
  tool: string;
  model: string;
};

export type ImageEditStatus = {
  generation_id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  output_url?: string;
  error?: string;
  tool?: string;
  model?: string;
};

async function call<T>(fn: string, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { method, body } as any);
  if (error) throw error;
  return data as T;
}

// ───────── starters ─────────
export const startRemoveBg     = (b: { image_url: string }) => call<ImageEditStarted>("imageedit-remove-bg", b);
export const startColorize     = (b: { image_url: string; palette?: "natural"|"vintage"|"vibrant"|"cinematic" }) =>
  call<ImageEditStarted>("imageedit-colorize", b);
export const startRealistic3D  = (b: { image_url: string; style?: "figurine"|"toy"|"sculpture"|"clay"; prompt?: string; aspect_ratio?: string; model?: string }) =>
  call<ImageEditStarted>("imageedit-realistic-3d", b);
export const startFaceSwap     = (b: { source_face_url: string; target_image_url: string }) =>
  call<ImageEditStarted>("imageedit-face-swap", b);
export const startClothSwap    = (b: { person_url: string; garment_url: string; category?: "top"|"bottom"|"dress"|"outerwear" }) =>
  call<ImageEditStarted>("imageedit-cloth-swap", b);
export const startDepthMap     = (b: { image_url: string; mode?: "grayscale"|"colored" }) =>
  call<ImageEditStarted>("imageedit-depth-map", b);
export const startProductGen   = (b: { image_url: string; prompt: string; aspect_ratio?: string; model?: string }) =>
  call<ImageEditStarted>("imageedit-product-gen", b);
export const startAssetsGen    = (b: { prompt: string; refs?: string[]; kind?: "icon"|"sprite"|"prop"|"ui"; aspect_ratio?: string; model?: string }) =>
  call<ImageEditStarted>("imageedit-assets-gen", b);
export const startStyleTransfer = (b: { image_url: string; style_url?: string; prompt?: string; strength?: number; aspect_ratio?: string; model?: string }) =>
  call<ImageEditStarted>("imageedit-style-transfer", b);
export const startReplaceBg    = (b: { image_url: string; prompt: string; aspect_ratio?: string; model?: string }) =>
  call<ImageEditStarted>("imageedit-replace-bg", b);
export const startExpand       = (b: { image_url: string; prompt?: string; left?: number; right?: number; top?: number; bottom?: number }) =>
  call<ImageEditStarted>("imageedit-expand", b);

// ───────── ToS ─────────
export async function checkTos(feature: string) {
  return await call<{ accepted: boolean; version?: string }>(`check-tos?feature=${encodeURIComponent(feature)}`, undefined, "GET");
}
export async function acceptTos(feature: string, version = "1.0") {
  return await call<{ accepted: true }>("accept-tos", { feature, version });
}

// ───────── Status / poll ─────────
export async function fetchImageEditStatus(generationId: string): Promise<ImageEditStatus> {
  return await call<ImageEditStatus>(`imageedit-status?generation_id=${encodeURIComponent(generationId)}`, undefined, "GET");
}

export async function pollImageEdit(generationId: string, maxMs = 300_000): Promise<ImageEditStatus> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const s = await fetchImageEditStatus(generationId);
      if (s.status === "COMPLETED" || s.status === "FAILED") return s;
    } catch { /* segue tentando */ }
  }
  throw new Error("Polling timeout");
}
