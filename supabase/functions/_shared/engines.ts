// Registry of every Magnific endpoint we support.
// Each entry knows: HTTP path + how to build the POST body + media kind.
//
// Aspect ratio mapping for endpoints that use Magnific's enum format
// (square_1_1, widescreen_16_9, etc.).

export type MediaKind = "image" | "video" | "audio";

export type EngineEntry = {
  id: string;
  kind: MediaKind;
  path: string;
  /** "magnific" => square_1_1 etc.  "freepik" => "1:1".  "none" => no aspect */
  aspectStyle: "magnific" | "freepik" | "none";
  /** Defaults applied to every request for this engine */
  defaults?: Record<string, unknown>;
  /** For image-to-X engines, name of the field that carries the input image */
  imageField?: string;
  /** For multi-image refs (nano-banana etc.) */
  refsField?: string;
  /** Pass single ref as base64 instead of URL? */
  refsAsBase64?: boolean;
  /** Build request body. Receives normalized input. */
  build?: (input: BuildInput) => Record<string, unknown>;
};

export type BuildInput = {
  prompt: string;
  aspect: string; // freepik-style "1:1"
  refs: string[]; // URLs
  num: number;
  duration?: string; // "5" | "6" | "10"
  resolution?: string; // "1k" | "2k" | "4k"
  extra?: Record<string, unknown>;
};

// ---- aspect ratio helpers ----
const FP_TO_MAGNIFIC: Record<string, string> = {
  "1:1": "square_1_1",
  "4:3": "classic_4_3",
  "3:4": "traditional_3_4",
  "16:9": "widescreen_16_9",
  "9:16": "social_story_9_16",
  "21:9": "smartphone_horizontal_20_9",
  "3:2": "standard_3_2",
  "2:3": "portrait_2_3",
  "2:1": "horizontal_2_1",
  "1:2": "vertical_1_2",
  "5:4": "social_5_4",
  "4:5": "social_post_4_5",
};

export function toMagnificAspect(fp: string): string {
  return FP_TO_MAGNIFIC[fp] ?? "square_1_1";
}

// =========== IMAGE engines ===========
const IMAGE: Record<string, EngineEntry> = {
  // Mystic
  "mystic": {
    id: "mystic", kind: "image", path: "/v1/ai/mystic", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: toMagnificAspect(i.aspect),
      resolution: i.resolution || "2k",
      ...(i.refs[0] ? { style_reference: i.refs[0] } : {}),
    }),
  },
  // Nano Banana family (Gemini)
  "nano-banana-2": {
    id: "nano-banana-2", kind: "image",
    path: "/v1/ai/gemini-2-5-flash-image-preview", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: i.aspect,
      num_images: i.num,
      ...(i.refs.length ? { reference_images: i.refs.slice(0, 4).map((url) => ({ image_url: url })) } : {}),
    }),
  },
  "nano-banana-pro": {
    id: "nano-banana-pro", kind: "image",
    path: "/v1/ai/text-to-image/nano-banana-pro", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: i.aspect,
      num_images: i.num,
      ...(i.refs.length ? { reference_images: i.refs.slice(0, 4).map((url) => ({ image_url: url })) } : {}),
    }),
  },
  "nano-banana-pro-flash": {
    id: "nano-banana-pro-flash", kind: "image",
    path: "/v1/ai/text-to-image/nano-banana-pro-flash", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: i.aspect,
      num_images: i.num,
      ...(i.refs.length ? { reference_images: i.refs.slice(0, 4).map((url) => ({ image_url: url })) } : {}),
    }),
  },
  // Imagen
  "imagen4-ultra": {
    id: "imagen4-ultra", kind: "image",
    path: "/v1/ai/text-to-image/imagen4-ultra", aspectStyle: "freepik",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: i.aspect, num_images: i.num }),
  },
  "imagen4-fast": {
    id: "imagen4-fast", kind: "image",
    path: "/v1/ai/text-to-image/imagen4-fast", aspectStyle: "freepik",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: i.aspect, num_images: i.num }),
  },
  // Flux
  "flux-pro-1-1": {
    id: "flux-pro-1-1", kind: "image",
    path: "/v1/ai/text-to-image/flux-pro-v1-1", aspectStyle: "freepik",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: i.aspect }),
  },
  "flux-kontext-pro": {
    id: "flux-kontext-pro", kind: "image",
    path: "/v1/ai/text-to-image/flux-kontext-pro", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt, aspect_ratio: i.aspect,
      ...(i.refs[0] ? { reference_image: i.refs[0] } : {}),
    }),
  },
  "flux-2-klein": {
    id: "flux-2-klein", kind: "image",
    path: "/v1/ai/text-to-image/flux-2-klein", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt, aspect_ratio: i.aspect,
      ...(i.refs.length ? { reference_images: i.refs.slice(0, 4) } : {}),
    }),
  },
  // Seedream
  "seedream-v4": {
    id: "seedream-v4", kind: "image",
    path: "/v1/ai/text-to-image/seedream-v4", aspectStyle: "freepik",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: i.aspect, num_images: i.num }),
  },
  "seedream-v4-edit": {
    id: "seedream-v4-edit", kind: "image",
    path: "/v1/ai/seedream-edit-v4", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt,
      ...(i.refs[0] ? { image: i.refs[0] } : {}),
    }),
  },
  "hyperflux": {
    id: "hyperflux", kind: "image",
    path: "/v1/ai/text-to-image/hyperflux", aspectStyle: "freepik",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: i.aspect, num_images: i.num }),
  },
};

// =========== VIDEO engines (image-to-video unless noted) ===========
const VIDEO: Record<string, EngineEntry> = {
  // Kling V3
  "kling-v3-pro":          { id: "kling-v3-pro",          kind: "video", path: "/v1/ai/image-to-video/kling-v3-pro",          aspectStyle: "none" },
  "kling-v3-std":          { id: "kling-v3-std",          kind: "video", path: "/v1/ai/image-to-video/kling-v3-std",          aspectStyle: "none" },
  "kling-v3-motion-pro":   { id: "kling-v3-motion-pro",   kind: "video", path: "/v1/ai/image-to-video/kling-v3-motion-pro",   aspectStyle: "none" },
  "kling-v3-motion-std":   { id: "kling-v3-motion-std",   kind: "video", path: "/v1/ai/image-to-video/kling-v3-motion-std",   aspectStyle: "none" },
  "kling-v3-omni-pro":     { id: "kling-v3-omni-pro",     kind: "video", path: "/v1/ai/image-to-video/kling-v3-omni-pro",     aspectStyle: "none" },
  "kling-v3-omni-std":     { id: "kling-v3-omni-std",     kind: "video", path: "/v1/ai/image-to-video/kling-v3-omni-std",     aspectStyle: "none" },
  // Kling O1 + 2.x
  "kling-o1-pro":          { id: "kling-o1-pro",          kind: "video", path: "/v1/ai/image-to-video/kling-o1-pro",          aspectStyle: "none" },
  "kling-o1-std":          { id: "kling-o1-std",          kind: "video", path: "/v1/ai/image-to-video/kling-o1-std",          aspectStyle: "none" },
  "kling-v2-5-pro":        { id: "kling-v2-5-pro",        kind: "video", path: "/v1/ai/image-to-video/kling-v2-5-pro",        aspectStyle: "none" },
  "kling-v2-1-master":     { id: "kling-v2-1-master",     kind: "video", path: "/v1/ai/image-to-video/kling-v2-1-master",     aspectStyle: "none" },
  "kling-v2-1-pro":        { id: "kling-v2-1-pro",        kind: "video", path: "/v1/ai/image-to-video/kling-v2-1-pro",        aspectStyle: "none" },
  "kling-v2-1-std":        { id: "kling-v2-1-std",        kind: "video", path: "/v1/ai/image-to-video/kling-v2-1-std",        aspectStyle: "none" },
  // Veo
  "veo-3-1":               { id: "veo-3-1",               kind: "video", path: "/v1/ai/image-to-video/veo-3-1",               aspectStyle: "none" },
  "veo-3-1-fast":          { id: "veo-3-1-fast",          kind: "video", path: "/v1/ai/image-to-video/veo-3-1-fast",          aspectStyle: "none" },
  // Hailuo
  "hailuo-02-1080p":       { id: "hailuo-02-1080p",       kind: "video", path: "/v1/ai/image-to-video/minimax-hailuo-02-1080p",   aspectStyle: "none" },
  "hailuo-2-3-1080p":      { id: "hailuo-2-3-1080p",      kind: "video", path: "/v1/ai/image-to-video/minimax-hailuo-2-3-1080p",  aspectStyle: "none" },
  // Runway
  "runway-4-5":            { id: "runway-4-5",            kind: "video", path: "/v1/ai/image-to-video/runway-gen4-turbo",      aspectStyle: "none" },
  // Seedance
  "seedance-pro-1080p":    { id: "seedance-pro-1080p",    kind: "video", path: "/v1/ai/image-to-video/seedance-pro-1080p",     aspectStyle: "none" },
  "seedance-pro-720p":     { id: "seedance-pro-720p",     kind: "video", path: "/v1/ai/image-to-video/seedance-pro-720p",      aspectStyle: "none" },
  // Pixverse
  "pixverse-v5":           { id: "pixverse-v5",           kind: "video", path: "/v1/ai/image-to-video/pixverse-v5",            aspectStyle: "none" },
  "pixverse-v5-transition":{ id: "pixverse-v5-transition",kind: "video", path: "/v1/ai/image-to-video/pixverse-v5-transition", aspectStyle: "none" },
  // LTX (text-to-video)
  "ltx-2-pro":             { id: "ltx-2-pro",             kind: "video", path: "/v1/ai/text-to-video/ltx-2-pro",               aspectStyle: "none" },
  // Wan
  "wan-2-7":               { id: "wan-2-7",               kind: "video", path: "/v1/ai/image-to-video/wan-2-7",                aspectStyle: "none" },
  "wan-v2-6-1080p":        { id: "wan-v2-6-1080p",        kind: "video", path: "/v1/ai/image-to-video/wan-v2-6-1080p",         aspectStyle: "none" },
  "wan-2-5-i2v-1080p":     { id: "wan-2-5-i2v-1080p",     kind: "video", path: "/v1/ai/image-to-video/wan-2-5-i2v-1080p",      aspectStyle: "none" },
  "wan-2-5-t2v-1080p":     { id: "wan-2-5-t2v-1080p",     kind: "video", path: "/v1/ai/text-to-video/wan-2-5-t2v-1080p",       aspectStyle: "none" },
  "wan-2-5-t2v-720p":      { id: "wan-2-5-t2v-720p",      kind: "video", path: "/v1/ai/text-to-video/wan-2-5-t2v-720p",        aspectStyle: "none" },
  // Omnihuman
  "omnihuman-1-5":         { id: "omnihuman-1-5",         kind: "video", path: "/v1/ai/video/omni-human-1-5",                  aspectStyle: "none" },
};

// Default video body builder if none provided
function defaultVideoBuild(i: BuildInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    prompt: i.prompt,
    duration: i.duration || "5",
  };
  if (i.refs[0]) body.image = i.refs[0];
  return body;
}

// =========== EDIT engines ===========
const EDIT: Record<string, EngineEntry> = {
  "remove-bg": {
    id: "remove-bg", kind: "image", path: "/v1/ai/beta/remove-background", aspectStyle: "none",
    build: (i) => ({ image_url: i.refs[0] }),
  },
  "replace-bg": {
    id: "replace-bg", kind: "image", path: "/v1/ai/image-style-transfer", aspectStyle: "none",
    build: (i) => ({ image: i.refs[0], prompt: i.prompt }),
  },
  "relight": {
    id: "relight", kind: "image", path: "/v1/ai/image-relight", aspectStyle: "none",
    build: (i) => ({ image: i.refs[0], prompt: i.prompt }),
  },
  "expand": {
    id: "expand", kind: "image", path: "/v1/ai/image-expand/flux-pro", aspectStyle: "none",
    build: (i) => ({ image: i.refs[0], prompt: i.prompt }),
  },
  "style-transfer": {
    id: "style-transfer", kind: "image", path: "/v1/ai/image-style-transfer", aspectStyle: "none",
    build: (i) => ({ image: i.refs[0], style_reference: i.refs[1], prompt: i.prompt }),
  },
};

// =========== UPSCALE engines ===========
const UPSCALE: Record<string, EngineEntry> = {
  "magnific-creative": {
    id: "magnific-creative", kind: "image",
    path: "/v1/ai/image-upscaler", aspectStyle: "none",
    build: (i) => ({
      image: i.refs[0],
      scale_factor: 4,
      optimized_for: "standard",
      creativity: 4,
      hdr: 4,
      resemblance: 60,
    }),
  },
  "magnific-precision": {
    id: "magnific-precision", kind: "image",
    path: "/v1/ai/image-upscaler-precision", aspectStyle: "none",
    build: (i) => ({ image: i.refs[0], scale_factor: 4 }),
  },
};

// =========== AUDIO engines ===========
const AUDIO: Record<string, EngineEntry> = {
  "music": {
    id: "music", kind: "audio", path: "/v1/ai/music-generation", aspectStyle: "none",
    build: (i) => ({ prompt: i.prompt, duration: 30 }),
  },
  "sfx": {
    id: "sfx", kind: "audio", path: "/v1/ai/sound-effects", aspectStyle: "none",
    build: (i) => ({ prompt: i.prompt, duration: 5 }),
  },
};

const ALL: Record<string, EngineEntry> = { ...IMAGE, ...VIDEO, ...EDIT, ...UPSCALE, ...AUDIO };

export function getEngine(id: string): EngineEntry | null {
  return ALL[id] ?? null;
}

export function buildBody(engine: EngineEntry, input: BuildInput): Record<string, unknown> {
  if (engine.build) return { ...(engine.defaults ?? {}), ...engine.build(input) };
  if (engine.kind === "video") return { ...(engine.defaults ?? {}), ...defaultVideoBuild(input) };
  return { ...(engine.defaults ?? {}), prompt: input.prompt, aspect_ratio: input.aspect };
}

/** Auto-route image based on refs: 2+ refs -> nano-banana-2; 1 -> nano-banana-pro; 0 -> nano-banana-pro */
export function resolveImageEngine(refsCount: number, override?: string | null): string {
  if (override && getEngine(override)?.kind === "image") return override;
  if (refsCount >= 2) return "nano-banana-2";
  return "nano-banana-pro";
}
