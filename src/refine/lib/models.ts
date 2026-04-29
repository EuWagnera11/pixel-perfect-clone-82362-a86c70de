/**
 * Mapeamento label visível <-> id no backend (api/pricing.py).
 */
export const MODEL_LABEL_TO_ID: Record<string, string> = {
  "Nano-Banana Pro": "nano-banana-pro",
  "Nano-Banana Pro Flash": "nano-banana-pro-flash",
  "Nano-Banana 2": "nano-banana-2",
  "Flux Dev": "flux-dev",
  "Flux Pro": "flux-pro-1-1",
  "Flux 2 Pro": "flux-2-pro",
  "Flux 2 Turbo": "flux-2-turbo",
  "Flux 2 Klein": "flux-2-klein",
  Mystic: "mystic",
  "Imagen 3": "imagen-3",
  "Imagen 4 Fast": "imagen-4-fast",
  "Imagen 4 Ultra": "imagen-4-ultra",
  "Seedream v4": "seedream-v4",
  Hyperflux: "hyperflux",
  "Refine": "nano-banana-pro",
};

export const ASPECT_RATIOS = ["1:1", "9:16", "16:9", "4:3", "3:4", "21:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
