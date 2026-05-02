/**
 * Catálogo de motores de geração — agrupados por categoria (image / video).
 * Cada item tem `id` que bate com o backend (api/pricing.py + freepik.py).
 *
 * Sora não está disponível: o backend só fala com Freepik API.
 */

export type ImageModel = {
  label: string;
  id: string;
  family: "nano-banana" | "imagen" | "flux" | "seedream" | "mystic" | "runway" | "hyperflux" | "z-image";
  costHint?: "Premium" | "Rápido" | "Padrão";
};

export type VideoModel = {
  label: string;
  id: string;
  family: "kling" | "veo" | "hailuo" | "runway" | "seedance" | "pixverse" | "ltx" | "wan" | "omnihuman";
  defaultDuration: "5s" | "6s" | "10s";
  resolution?: string;
  costHint?: "Premium" | "Rápido" | "Padrão";
};

export const IMAGE_MODELS: ImageModel[] = [
  // Nano Banana
  { label: "Nano Banana Pro",       id: "nano-banana-pro",       family: "nano-banana", costHint: "Premium" },
  { label: "Nano Banana Pro Flash", id: "nano-banana-pro-flash", family: "nano-banana", costHint: "Rápido" },
  { label: "Nano Banana 2",         id: "nano-banana-2",         family: "nano-banana" },
  // Imagen (Google)
  { label: "Imagen 4 Ultra",        id: "imagen-4-ultra",        family: "imagen", costHint: "Premium" },
  { label: "Imagen 4 Fast",         id: "imagen-4-fast",         family: "imagen", costHint: "Rápido" },
  { label: "Imagen 3",              id: "imagen-3",              family: "imagen" },
  // Flux (Black Forest Labs)
  { label: "Flux 2 Pro",            id: "flux-2-pro",            family: "flux", costHint: "Premium" },
  { label: "Flux Pro 1.1",          id: "flux-pro-1-1",          family: "flux" },
  { label: "Flux Kontext Pro",      id: "flux-kontext-pro",      family: "flux" },
  { label: "Flux 2 Klein",          id: "flux-2-klein",          family: "flux" },
  { label: "Flux 2 Turbo",          id: "flux-2-turbo",          family: "flux", costHint: "Rápido" },
  { label: "Flux Dev",              id: "flux-dev",              family: "flux" },
  // Seedream (ByteDance)
  { label: "Seedream v5 Lite",      id: "seedream-v5-lite",      family: "seedream" },
  { label: "Seedream v4.5",         id: "seedream-v4-5",         family: "seedream" },
  { label: "Seedream v4",           id: "seedream-v4",           family: "seedream" },
  // Outros
  { label: "Mystic",                id: "mystic",                family: "mystic", costHint: "Premium" },
  { label: "Hyperflux",             id: "hyperflux",             family: "hyperflux", costHint: "Premium" },
  { label: "Runway T2I",            id: "runway-t2i",            family: "runway" },
  { label: "Z-Image Turbo",         id: "z-image-turbo",         family: "z-image", costHint: "Rápido" },
];

export const VIDEO_MODELS: VideoModel[] = [
  // Kling V3
  { label: "Kling V3 Pro",         id: "kling-v3-pro",         family: "kling", defaultDuration: "5s", resolution: "1080p", costHint: "Premium" },
  { label: "Kling V3 Standard",    id: "kling-v3-std",         family: "kling", defaultDuration: "5s", resolution: "1080p" },
  { label: "Kling V3 Motion Pro",  id: "kling-v3-motion-pro",  family: "kling", defaultDuration: "5s" },
  { label: "Kling V3 Motion Std",  id: "kling-v3-motion-std",  family: "kling", defaultDuration: "5s" },
  { label: "Kling V3 Omni Pro",    id: "kling-v3-omni-pro",    family: "kling", defaultDuration: "5s" },
  { label: "Kling V3 Omni Std",    id: "kling-v3-omni-std",    family: "kling", defaultDuration: "5s" },
  // Kling O1
  { label: "Kling O1 Pro",         id: "kling-o1-pro",         family: "kling", defaultDuration: "5s" },
  { label: "Kling O1 Standard",    id: "kling-o1-std",         family: "kling", defaultDuration: "5s" },
  // Kling V2
  { label: "Kling V2.6 Pro",       id: "kling-v2-6-pro",       family: "kling", defaultDuration: "5s" },
  { label: "Kling Pro 2.5 Turbo",  id: "kling-pro-2-5-turbo",  family: "kling", defaultDuration: "5s", costHint: "Rápido" },
  { label: "Kling Pro 2.1",        id: "kling-pro-2-1",        family: "kling", defaultDuration: "5s" },
  { label: "Kling 2.1 Standard",   id: "kling-std-2-1",        family: "kling", defaultDuration: "5s" },
  // Veo (Google) — 4K removido (não disponível pela Freepik atualmente)
  { label: "Veo 3.1 1080p",        id: "veo-3-1-1080p",        family: "veo", defaultDuration: "5s", resolution: "1080p", costHint: "Premium" },
  { label: "Veo 3.1 Fast 1080p",   id: "veo-3-1-fast-1080p",   family: "veo", defaultDuration: "5s", resolution: "1080p", costHint: "Rápido" },
  // Hailuo (MiniMax)
  { label: "Hailuo 02 1080p",      id: "hailuo-02-1080p",      family: "hailuo", defaultDuration: "6s", resolution: "1080p" },
  { label: "Hailuo 02 768p",       id: "hailuo-02-768p",       family: "hailuo", defaultDuration: "6s" },
  { label: "Hailuo 2.3 Fast 1080p",id: "hailuo-2-3-fast-1080p",family: "hailuo", defaultDuration: "6s", costHint: "Rápido" },
  { label: "Hailuo 2.3 Fast 768p", id: "hailuo-2-3-fast-768p", family: "hailuo", defaultDuration: "6s", costHint: "Rápido" },
  { label: "Hailuo 2.3 1080p",     id: "hailuo-2-3-1080p",     family: "hailuo", defaultDuration: "6s" },
  { label: "Hailuo 2.3 768p",      id: "hailuo-2-3-768p",      family: "hailuo", defaultDuration: "6s" },
  // Runway
  { label: "Runway Gen 4 Turbo",   id: "runway-gen-4-turbo",   family: "runway", defaultDuration: "5s", costHint: "Rápido" },
  { label: "Runway Gen 4.5",       id: "runway-gen-4-5",       family: "runway", defaultDuration: "5s" },
  // Seedance
  { label: "Seedance Pro 1080p",   id: "seedance-pro-1080p",   family: "seedance", defaultDuration: "5s", resolution: "1080p" },
  { label: "Seedance Pro 720p",    id: "seedance-pro-720p",    family: "seedance", defaultDuration: "5s" },
  { label: "Seedance 1.5 Pro",     id: "seedance-1-5-pro-1080p",family: "seedance", defaultDuration: "5s", resolution: "1080p" },
  // Pixverse
  { label: "Pixverse v5 1080p",    id: "pixverse-v5-1080p",    family: "pixverse", defaultDuration: "5s", resolution: "1080p" },
  { label: "Pixverse v5 720p",     id: "pixverse-v5-720p",     family: "pixverse", defaultDuration: "5s" },
  // LTX (4K removido — endpoint instável)
  { label: "LTX 2 Pro 1080p",      id: "ltx-2-pro-1080p",      family: "ltx", defaultDuration: "5s", resolution: "1080p" },
  { label: "LTX 2 Fast 1080p",     id: "ltx-2-fast-1080p",     family: "ltx", defaultDuration: "5s", resolution: "1080p", costHint: "Rápido" },
  // Wan (2.7 removido — endpoint não existe na Freepik atualmente)
  { label: "Wan 2.6 1080p",        id: "wan-2-6-1080p",        family: "wan", defaultDuration: "5s", resolution: "1080p" },
  { label: "Wan 2.6 720p",         id: "wan-2-6-720p",         family: "wan", defaultDuration: "5s" },
  // Omnihuman
  { label: "Omnihuman 1.5",        id: "omnihuman-1-5",        family: "omnihuman", defaultDuration: "5s" },
];

/** Decide qual lista mostrar baseado na aba atual. */
export function modelListForTab(tab: string): { type: "image" | "video" | "audio" | "none"; models: (ImageModel | VideoModel)[] } {
  if (tab === "video") return { type: "video", models: VIDEO_MODELS };
  if (tab === "audio") return { type: "audio", models: [] };
  if (["image", "cinema", "character", "marketing", "assets", "r3d", "depth", "product", "ecommerce", "edit", "upscale"].includes(tab)) {
    return { type: "image", models: IMAGE_MODELS };
  }
  return { type: "none", models: [] };
}

/** Default (id) por aba quando o user ainda não escolheu. */
export const DEFAULT_MODEL_BY_TAB: Record<string, string> = {
  image: "nano-banana-pro",
  cinema: "nano-banana-pro",
  character: "nano-banana-pro",
  marketing: "nano-banana-pro",
  assets: "nano-banana-pro-flash",
  r3d: "seedream-v4",
  depth: "nano-banana-pro",
  product: "nano-banana-pro",
  video: "kling-v3-std",
};

/** Reverse lookup id -> label (pra mostrar no chip do Dock). */
export const MODEL_ID_TO_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const x of IMAGE_MODELS) m[x.id] = x.label;
  for (const x of VIDEO_MODELS) m[x.id] = x.label;
  return m;
})();

/** Compatibilidade legado — flat map label -> id. */
export const MODEL_LABEL_TO_ID: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const x of IMAGE_MODELS) m[x.label] = x.id;
  for (const x of VIDEO_MODELS) m[x.label] = x.id;
  m["Refine"] = "nano-banana-pro";
  return m;
})();

export const ASPECT_RATIOS = ["1:1", "9:16", "16:9", "4:3", "3:4", "21:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
