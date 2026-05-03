// Tool registry — maps tool/op to a model + Freepik endpoint + body builder.
// Auto-routing rules from §6 of the briefing.

export type ImageModelId =
  | "nano-banana-2"
  | "nano-banana-pro"
  | "nano-banana-pro-flash"
  | "imagen4-ultra"
  | "imagen4-fast"
  | "flux-pro-1-1"
  | "flux-kontext-pro"
  | "flux-2-klein"
  | "seedream-v4"
  | "seedream-v4-edit"
  | "mystic"
  | "hyperflux";

const IMAGE_ENDPOINTS: Record<ImageModelId, string> = {
  "nano-banana-2": "/v1/ai/gemini-2-5-flash-image-preview",
  "nano-banana-pro": "/v1/ai/text-to-image/nano-banana-pro",
  "nano-banana-pro-flash": "/v1/ai/text-to-image/nano-banana-pro-flash",
  "imagen4-ultra": "/v1/ai/text-to-image/imagen4-ultra",
  "imagen4-fast": "/v1/ai/text-to-image/imagen4-fast",
  "flux-pro-1-1": "/v1/ai/text-to-image/flux-pro-v1-1",
  "flux-kontext-pro": "/v1/ai/text-to-image/flux-kontext-pro",
  "flux-2-klein": "/v1/ai/text-to-image/flux-2-klein",
  "seedream-v4": "/v1/ai/text-to-image/seedream-v4",
  "seedream-v4-edit": "/v1/ai/seedream-edit-v4",
  mystic: "/v1/ai/mystic",
  hyperflux: "/v1/ai/text-to-image/hyperflux",
};

export function imageEndpoint(model: ImageModelId): string {
  return IMAGE_ENDPOINTS[model];
}

/** Auto-route image: nano-banana-2 if 2+ refs, nano-banana-pro if 1 ref,
 *  nano-banana-pro by default. Override via `model` param wins. */
export function resolveImageModel(refsCount: number, override?: string | null): ImageModelId {
  if (override && override in IMAGE_ENDPOINTS) return override as ImageModelId;
  if (refsCount >= 2) return "nano-banana-2";
  if (refsCount === 1) return "nano-banana-pro";
  return "nano-banana-pro";
}

/** Build the Freepik request body for an image generation.
 *  - nano-banana-2: refs as plain URL strings.
 *  - nano-banana-pro / -flash: refs as base64 objects (we pass URLs as image_url for now).
 *  - others: prompt-only or single style ref. */
export async function buildImageBody(
  model: ImageModelId,
  prompt: string,
  aspect: string,
  refs: string[],
  numImages: number,
): Promise<Record<string, unknown>> {
  switch (model) {
    case "nano-banana-2": {
      const body: Record<string, unknown> = {
        prompt,
        aspect_ratio: aspect,
        num_images: numImages,
      };
      if (refs.length) body.reference_images = refs.slice(0, 4);
      return body;
    }
    case "nano-banana-pro":
    case "nano-banana-pro-flash": {
      const body: Record<string, unknown> = {
        prompt,
        aspect_ratio: aspect,
        num_images: numImages,
      };
      if (refs.length) {
        // Convert reference URLs to base64 inline objects
        const inline = await Promise.all(refs.slice(0, 4).map(async (url) => {
          const r = await fetch(url);
          const ab = await r.arrayBuffer();
          const b64 = base64FromArrayBuffer(ab);
          const mime = r.headers.get("content-type") || "image/jpeg";
          return { image: b64, mime_type: mime };
        }));
        body.reference_images = inline;
      }
      return body;
    }
    case "flux-kontext-pro": {
      const body: Record<string, unknown> = { prompt, aspect_ratio: aspect };
      if (refs[0]) body.reference_image = refs[0];
      return body;
    }
    case "mystic": {
      const body: Record<string, unknown> = { prompt, aspect_ratio: aspect };
      if (refs[0]) body.style_reference = refs[0];
      return body;
    }
    default:
      return { prompt, aspect_ratio: aspect, num_images: numImages };
  }
}

function base64FromArrayBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  // deno-lint-ignore no-deprecated-deno-api
  return btoa(bin);
}

/** Extract a Freepik task id from a POST response. */
export function extractTaskId(body: any): string | null {
  return (
    body?.data?.task_id ?? body?.data?.id ?? body?.task_id ?? body?.id ?? null
  );
}

/** Extract URL(s) from a Freepik status response. */
export function extractUrls(body: any): string[] {
  const out: string[] = [];
  const d = body?.data ?? body ?? {};
  if (Array.isArray(d.generated)) out.push(...d.generated);
  if (Array.isArray(d.images)) out.push(...d.images.map((i: any) => i?.url ?? i).filter(Boolean));
  if (typeof d.url === "string") out.push(d.url);
  if (typeof d.image_url === "string") out.push(d.image_url);
  if (typeof d.video_url === "string") out.push(d.video_url);
  if (typeof d.result_url === "string") out.push(d.result_url);
  return Array.from(new Set(out));
}

/** Normalize Freepik task status to our internal state. */
export function normalizeStatus(body: any): "queued" | "processing" | "completed" | "failed" {
  const s = (body?.data?.status ?? body?.status ?? "").toString().toUpperCase();
  if (["COMPLETED", "SUCCESS", "DONE", "FINISHED"].includes(s)) return "completed";
  if (["FAILED", "ERROR", "CANCELED", "CANCELLED"].includes(s)) return "failed";
  if (["IN_PROGRESS", "PROCESSING", "RUNNING"].includes(s)) return "processing";
  return "queued";
}
