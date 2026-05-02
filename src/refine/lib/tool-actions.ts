/**
 * Tool action dispatcher.
 *
 * Mapeia cada aba da Sidebar pro endpoint correto + parâmetros sensatos.
 * Cada handler retorna `{ url, type }` pra o RefineApp renderizar no stage.
 *
 * Filosofia: parâmetros balanceados (custo x qualidade), não maxados.
 *  - Image generation: 1k é o sweet spot (suficiente pra preview, custa menos).
 *  - Video: kling-v3-std 5s silent (top robusto, sem áudio pra economizar).
 *  - Upscale: magnific scale=4 (Magnific 8K é addon premium, scale=4 é o usual).
 *  - Specialized e edit usam defaults documentados no .env.example.
 */
import { api } from "./supabase";
import { createGeneration, pollGeneration } from "../hooks/useGenerations";

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
  /** Motor escolhido pelo usuário (id do backend). Se omitido, usa default da aba. */
  modelId?: string | null;
};

/** Tabs que exigem upload de imagem (botão attach do Dock). */
export function tabRequiresUpload(tab: string): boolean {
  return ["upscale", "edit", "ecommerce", "product"].includes(tab);
}

/** Tabs onde prompt é opcional (ex.: upscale só com a imagem). */
export function tabPromptOptional(tab: string): boolean {
  return ["upscale"].includes(tab);
}

/** Modelo de imagem por aba. Mantém balanço custo/qualidade. */
const IMAGE_MODEL: Record<string, string> = {
  image: "nano-banana-pro",
  cinema: "nano-banana-pro",
  character: "nano-banana-pro",
  marketing: "nano-banana-pro",
  assets: "nano-banana-pro-flash",
  r3d: "seedream-v4",
  depth: "nano-banana-pro",
};

/** Polling helper para endpoints que retornam task_id (enhance, edit, specialized). */
async function pollTask(taskId: string, kind: string, maxMs = 300_000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 4000));
    const data = await api<any>(`/enhance/task/${encodeURIComponent(taskId)}?kind=${encodeURIComponent(kind)}`);
    const st = String(data?.status ?? data?.state ?? "").toUpperCase();
    if (st === "COMPLETED" || st === "SUCCESS" || st === "DONE") return data;
    if (st === "FAILED" || st === "ERROR" || st === "CANCELLED") {
      throw new Error(data?.error || data?.message || "Tarefa falhou");
    }
  }
  throw new Error("Polling timeout");
}

/** Extrai a primeira URL de payloads variados que os endpoints retornam. */
function extractUrl(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data.url === "string") return data.url;
  if (typeof data.output_url === "string") return data.output_url;
  if (typeof data.final === "string") return data.final;
  for (const key of ["urls", "image_urls", "video_urls", "output_urls"]) {
    const arr = (data as any)[key];
    if (Array.isArray(arr) && typeof arr[0] === "string") return arr[0];
  }
  if (data.result) return extractUrl(data.result);
  return null;
}

export async function executeToolAction(input: ToolInput): Promise<ToolResult> {
  const { tab, prompt, ratio, sourceUrl, modelId } = input;

  // ============ VIDEO ============
  if (tab === "video") {
    const engine = modelId || "kling-v3-std";
    // Hailuo aceita 6s; resto 5s. Default conservador 5s.
    const duration = engine.startsWith("hailuo") ? "6s" : "5s";
    const created = await createGeneration({
      prompt,
      aspect_ratio: ratio,
      resolution: "1k",
      num_variations: 1,
      media_type: "video",
      video_engine: engine,
      duration,
    });
    const final = await pollGeneration(created.id, 600_000);
    if (final.status === "failed") throw new Error(final.error_message || "Vídeo falhou");
    const url = final.video_urls?.[0];
    if (!url) throw new Error("Vídeo sem URL no retorno");
    return { url, type: "video", creditsUsed: created.credits_used };
  }

  // ============ AUDIO (TTS) ============
  if (tab === "audio") {
    if (!prompt.trim()) throw new Error("Digite um texto para narrar");
    const r = await api<{ id: string; url: string; credits_used: number }>("/audio/tts", {
      method: "POST",
      body: {
        text: prompt,
        voice: "rachel",
        language: "pt",
        stability: 0.5,
        similarity_boost: 0.85,
        style: 0.4,
      },
    });
    if (!r?.url) throw new Error("Áudio sem URL no retorno");
    return { url: r.url, type: "audio", creditsUsed: r.credits_used };
  }

  // ============ UPSCALE ============
  if (tab === "upscale") {
    if (!sourceUrl) throw new Error("Anexe uma imagem para upscale");
    const r = await api<{ task_id: string; credits_used: number }>("/enhance/upscale", {
      method: "POST",
      body: {
        image_url: sourceUrl,
        scale: 4,
        engine: "magnific",
        creativity: 4,
        hdr: 4,
        resemblance: 60,
      },
    });
    const data = await pollTask(r.task_id, "enhance");
    const url = extractUrl(data);
    if (!url) throw new Error("Upscale sem URL no retorno");
    return { url, type: "image", creditsUsed: r.credits_used };
  }

  // ============ EDIT (replace background — sem máscara) ============
  if (tab === "edit") {
    if (!sourceUrl) throw new Error("Anexe uma imagem para editar");
    if (!prompt.trim()) throw new Error("Descreva o novo cenário");
    const r = await api<{ id: string; task_id: string; credits_used: number }>("/edit/replace-background", {
      method: "POST",
      body: { image_url: sourceUrl, prompt },
    });
    const data = await pollTask(r.task_id, "edit");
    const url = extractUrl(data);
    if (!url) throw new Error("Edit sem URL no retorno");
    return { url, type: "image", creditsUsed: r.credits_used };
  }

  // ============ ECOMMERCE — modo lifestyle ============
  if (tab === "ecommerce") {
    if (!sourceUrl) throw new Error("Anexe uma imagem do produto");
    const r = await api<{ task_id: string; credits_used: number }>("/specialized/ecommerce", {
      method: "POST",
      body: {
        product_image_url: sourceUrl,
        mode: "lifestyle",
        scene_prompt: prompt || undefined,
      },
    });
    const data = await pollTask(r.task_id, "specialized");
    const url = extractUrl(data);
    if (!url) throw new Error("E-commerce sem URL no retorno");
    return { url, type: "image", creditsUsed: r.credits_used };
  }

  // ============ PRODUCT — modo white_bg (catálogo) ============
  if (tab === "product") {
    if (!sourceUrl) throw new Error("Anexe uma imagem do produto");
    const r = await api<{ task_id: string; credits_used: number }>("/specialized/ecommerce", {
      method: "POST",
      body: {
        product_image_url: sourceUrl,
        mode: "white_bg",
        scene_prompt: prompt || undefined,
      },
    });
    const data = await pollTask(r.task_id, "specialized");
    const url = extractUrl(data);
    if (!url) throw new Error("Product sem URL no retorno");
    return { url, type: "image", creditsUsed: r.credits_used };
  }

  // ============ DEFAULT: IMAGE ============
  // image, cinema, character, marketing, assets, r3d, depth, e qualquer outra
  if (!prompt.trim()) throw new Error("Digite um prompt primeiro");
  const model = modelId || IMAGE_MODEL[tab] || "nano-banana-pro";
  const created = await createGeneration({
    prompt,
    aspect_ratio: ratio,
    resolution: "1k",
    num_variations: 1,
    media_type: "image",
    model,
  });
  const final = await pollGeneration(created.id, 180_000);
  if (final.status === "failed") throw new Error(final.error_message || "Geração falhou");
  const url = final.image_urls?.[0];
  if (!url) throw new Error("Imagem sem URL no retorno");
  return { url, type: "image", creditsUsed: created.credits_used };
}

/** Upload de arquivo via signed URL → retorna URL pública. */
export async function uploadFileForTool(file: File, bucket = "generation-refs"): Promise<string> {
  const signed = await api<{ upload_url: string; path: string; bucket: string }>("/uploads/signed-url", {
    method: "POST",
    body: { bucket, filename: file.name, content_type: file.type || "application/octet-stream" },
  });
  const put = await fetch(signed.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload PUT falhou: ${put.status}`);
  const dl = await api<{ url: string }>(
    `/uploads/signed-download?bucket=${encodeURIComponent(signed.bucket)}&path=${encodeURIComponent(signed.path)}&ttl=86400`,
    { method: "POST" }
  );
  return dl.url;
}
