/**
 * Catálogo de motores de geração — agrupados por categoria (image / video).
 * Cada `id` corresponde a um endpoint REAL na API Magnific (verificado 2026-05).
 *
 * Sora não está disponível (backend só fala com Magnific/Freepik).
 */

export type ImageModel = {
  label: string;
  id: string;
  family: "nano-banana" | "imagen" | "flux" | "seedream" | "mystic" | "hyperflux" | "z-image" | "runway";
  costHint?: "Premium" | "Rápido" | "Padrão";
};

export type VideoMode = "text" | "image" | "frames" | "video";

export type VideoModel = {
  label: string;
  id: string;
  family: "kling" | "veo" | "hailuo" | "runway" | "seedance" | "pixverse" | "ltx" | "wan" | "omnihuman" | "lipsync" | "upscaler";
  defaultDuration: "5s" | "6s" | "10s";
  resolution?: string;
  costHint?: "Premium" | "Rápido" | "Padrão";
  /** Se for true, usa text-to-video (não precisa de imagem inicial). */
  textToVideo?: boolean;
  /** Modos suportados (default: ["image"] para i2v; ["text"] para t2v) */
  modes?: VideoMode[];
  /** Se true, exige upload de áudio (lip-sync). */
  requiresAudio?: boolean;
  /** Se true, exige upload de vídeo fonte ao invés de imagem (upscaler/lip-sync). */
  requiresVideoSource?: boolean;
};

export function getVideoModelModes(m: VideoModel): VideoMode[] {
  if (m.modes) return m.modes;
  // Backend atual suporta apenas t2v (texto puro) e i2v (imagem→vídeo).
  // "frames" e "video" ainda não estão implementados no backend.
  if (m.textToVideo) return ["text"];
  return ["image"];
}

export const IMAGE_MODELS: ImageModel[] = [
  // Nano Banana (Gemini 2.5)
  { label: "Nano Banana Pro",       id: "nano-banana-pro",       family: "nano-banana", costHint: "Premium" },
  { label: "Nano Banana Pro Flash", id: "nano-banana-pro-flash", family: "nano-banana", costHint: "Rápido" },
  // Google Imagen
  { label: "Imagen 4 Ultra",        id: "imagen4-ultra",         family: "imagen", costHint: "Premium" },
  { label: "Imagen 4 Fast",         id: "imagen4-fast",          family: "imagen", costHint: "Rápido" },
  // Flux (Black Forest Labs)
  { label: "Flux Pro 1.1",          id: "flux-pro-1-1",          family: "flux" },
  { label: "Flux Kontext Pro",      id: "flux-kontext-pro",      family: "flux" },
  { label: "Flux 2 Klein",          id: "flux-2-klein",          family: "flux" },
  { label: "Flux 2 Pro",            id: "flux-2-pro",            family: "flux", costHint: "Premium" },
  { label: "Flux 2 Turbo",          id: "flux-2-turbo",          family: "flux", costHint: "Rápido" },
  { label: "Flux Dev",              id: "flux-dev",              family: "flux" },
  // Seedream (ByteDance)
  { label: "Seedream v4",           id: "seedream-v4",           family: "seedream" },
  { label: "Seedream v4 Edit",      id: "seedream-v4-edit",      family: "seedream" },
  { label: "Seedream v4.5",         id: "seedream-v4-5",         family: "seedream" },
  { label: "Seedream v4.5 Edit",    id: "seedream-v4-5-edit",    family: "seedream" },
  { label: "Seedream v5 Lite",      id: "seedream-v5-lite",      family: "seedream", costHint: "Rápido" },
  { label: "Seedream v5 Lite Edit", id: "seedream-v5-lite-edit", family: "seedream", costHint: "Rápido" },
  // Outros
  { label: "Mystic",                id: "mystic",                family: "mystic", costHint: "Premium" },
  { label: "Hyperflux",             id: "hyperflux",             family: "hyperflux", costHint: "Premium" },
  { label: "Z-Image Turbo",         id: "z-image",               family: "z-image", costHint: "Rápido" },
  { label: "RunWay T2I",            id: "runway-t2i",            family: "runway" },
  { label: "Classic Fast",          id: "classic-fast",          family: "flux", costHint: "Rápido" },
  { label: "Reimagine Flux",        id: "reimagine-flux",        family: "flux" },
];

export const VIDEO_MODELS: VideoModel[] = [
  // Kling V3 (top de linha)
  { label: "Kling V3 Pro",          id: "kling-v3-pro",          family: "kling", defaultDuration: "5s", costHint: "Premium" },
  { label: "Kling V3 Standard",     id: "kling-v3-std",          family: "kling", defaultDuration: "5s" },
  { label: "Kling V3 Motion Pro",   id: "kling-v3-motion-pro",   family: "kling", defaultDuration: "5s" },
  { label: "Kling V3 Motion Std",   id: "kling-v3-motion-std",   family: "kling", defaultDuration: "5s" },
  { label: "Kling V3 Omni Pro",     id: "kling-v3-omni-pro",     family: "kling", defaultDuration: "5s" },
  { label: "Kling V3 Omni Std",     id: "kling-v3-omni-std",     family: "kling", defaultDuration: "5s" },
  // Kling O1
  { label: "Kling O1 Pro",          id: "kling-o1-pro",          family: "kling", defaultDuration: "5s" },
  { label: "Kling O1 Standard",     id: "kling-o1-std",          family: "kling", defaultDuration: "5s" },
  // Kling V2
  { label: "Kling V2.5 Pro",        id: "kling-v2-5-pro",        family: "kling", defaultDuration: "5s" },
  { label: "Kling V2.1 Master",     id: "kling-v2-1-master",     family: "kling", defaultDuration: "5s" },
  { label: "Kling V2.1 Pro",        id: "kling-v2-1-pro",        family: "kling", defaultDuration: "5s" },
  { label: "Kling V2.1 Standard",   id: "kling-v2-1-std",        family: "kling", defaultDuration: "5s" },
  // Veo (Google)
  { label: "Veo 3.1",               id: "veo-3-1",               family: "veo", defaultDuration: "5s", resolution: "1080p", costHint: "Premium" },
  { label: "Veo 3.1 Fast",          id: "veo-3-1-fast",          family: "veo", defaultDuration: "5s", resolution: "1080p", costHint: "Rápido" },
  // Hailuo (MiniMax)
  { label: "Hailuo 02 1080p",       id: "hailuo-02-1080p",       family: "hailuo", defaultDuration: "6s", resolution: "1080p" },
  { label: "Hailuo 2.3 1080p",      id: "hailuo-2-3-1080p",      family: "hailuo", defaultDuration: "6s", resolution: "1080p" },
  // Runway
  { label: "Runway 4.5",            id: "runway-4-5",            family: "runway", defaultDuration: "5s" },
  // Seedance 1.0 Pro
  { label: "Seedance 1.0 Pro 1080p", id: "seedance-pro-1080p",   family: "seedance", defaultDuration: "5s", resolution: "1080p" },
  { label: "Seedance 1.0 Pro 720p",  id: "seedance-pro-720p",    family: "seedance", defaultDuration: "5s" },
  // Seedance 1.5 Pro (t2v + i2v + lip-sync/áudio)
  { label: "Seedance 1.5 Pro 1080p", id: "seedance-1-5-pro-1080p", family: "seedance", defaultDuration: "5s", resolution: "1080p", costHint: "Premium", modes: ["text","image"] },
  { label: "Seedance 1.5 Pro 720p",  id: "seedance-1-5-pro-720p",  family: "seedance", defaultDuration: "5s", resolution: "720p",  modes: ["text","image"] },
  { label: "Seedance 1.5 Pro 480p",  id: "seedance-1-5-pro-480p",  family: "seedance", defaultDuration: "5s", resolution: "480p",  costHint: "Rápido", modes: ["text","image"] },
  // Pixverse
  { label: "Pixverse v5",           id: "pixverse-v5",           family: "pixverse", defaultDuration: "5s" },
  { label: "Pixverse v5 Transition",id: "pixverse-v5-transition",family: "pixverse", defaultDuration: "5s" },
  // LTX (text-to-video)
  { label: "LTX 2 Pro (T2V)",       id: "ltx-2-pro",             family: "ltx", defaultDuration: "5s", textToVideo: true },
  // Wan
  { label: "Wan 2.7",               id: "wan-2-7",               family: "wan", defaultDuration: "5s" },
  { label: "Wan v2.6 1080p",        id: "wan-v2-6-1080p",        family: "wan", defaultDuration: "5s", resolution: "1080p" },
  { label: "Wan 2.5 i2v 1080p",     id: "wan-2-5-i2v-1080p",     family: "wan", defaultDuration: "5s", resolution: "1080p" },
  { label: "Wan 2.5 t2v 1080p",     id: "wan-2-5-t2v-1080p",     family: "wan", defaultDuration: "5s", resolution: "1080p", textToVideo: true },
  { label: "Wan 2.5 t2v 720p",      id: "wan-2-5-t2v-720p",      family: "wan", defaultDuration: "5s", textToVideo: true },
  // Omnihuman (audio→video)
  { label: "Omni Human 1.5",        id: "omnihuman-1-5",         family: "omnihuman", defaultDuration: "5s" },
];

export function modelListForTab(tab: string): { type: "image" | "video" | "audio" | "none"; models: (ImageModel | VideoModel)[] } {
  if (tab === "video") return { type: "video", models: VIDEO_MODELS };
  if (tab === "audio") return { type: "audio", models: [] };
  if (["image", "cinema", "character", "marketing", "assets", "r3d", "depth", "product", "ecommerce", "edit", "upscale"].includes(tab)) {
    return { type: "image", models: IMAGE_MODELS };
  }
  return { type: "none", models: [] };
}

export const DEFAULT_MODEL_BY_TAB: Record<string, string> = {
  image: "nano-banana-pro",
  cinema: "nano-banana-pro",
  character: "nano-banana-pro",
  marketing: "nano-banana-pro",
  assets: "nano-banana-pro-flash",
  r3d: "seedream-v4",
  depth: "nano-banana-pro",
  product: "nano-banana-pro",
  video: "kling-v2-5-pro",
};

export const MODEL_ID_TO_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const x of IMAGE_MODELS) m[x.id] = x.label;
  for (const x of VIDEO_MODELS) m[x.id] = x.label;
  return m;
})();

export const MODEL_LABEL_TO_ID: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const x of IMAGE_MODELS) m[x.label] = x.id;
  for (const x of VIDEO_MODELS) m[x.label] = x.id;
  m["Refine"] = "nano-banana-pro";
  return m;
})();

export const ASPECT_RATIOS = ["1:1", "9:16", "16:9", "4:5", "3:4", "4:3", "21:9", "2:3"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
