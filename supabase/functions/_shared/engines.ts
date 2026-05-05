// Registry of every Magnific endpoint we support.
// Each entry knows: HTTP path + how to build the POST body + media kind.
//
// Aspect ratio mapping for endpoints that use Magnific's enum format
// (square_1_1, widescreen_16_9, etc.).

export type MediaKind = "image" | "video" | "audio";

/** Fetch a URL and return { image: base64, mime_type } for Freepik refs. */
export async function urlToRefObject(url: string): Promise<{ image: string; mime_type: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ref fetch failed ${r.status}`);
  const mime = r.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk) as unknown as number[]);
  }
  return { image: btoa(bin), mime_type: mime };
}

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
  refsB64?: Array<{ image: string; mime_type: string }>;
  num: number;
  duration?: string; // "5" | "6" | "10"
  resolution?: string; // "1k" | "2k" | "4k"
  /** Optional second-frame URL for transition engines (e.g. pixverse-v5-transition). */
  lastImageUrl?: string;
  extra?: Record<string, unknown>;
};

// ---- aspect ratio helpers ----
// Master map of every Magnific aspect token we know about.
const FP_TO_MAGNIFIC_ALL: Record<string, string> = {
  "1:1": "square_1_1",
  "4:3": "classic_4_3",
  "3:4": "traditional_3_4",
  "16:9": "widescreen_16_9",
  "9:16": "social_story_9_16",
  "21:9": "cinematic_21_9",
  "20:9": "smartphone_horizontal_20_9",
  "3:2": "standard_3_2",
  "2:3": "portrait_2_3",
  "2:1": "horizontal_2_1",
  "1:2": "vertical_1_2",
  "5:4": "social_5_4",
  "4:5": "social_post_4_5",
};

// Runway uses explicit pixel ratios.
const FP_TO_RUNWAY: Record<string, string> = {
  "1:1": "1024:1024",
  "16:9": "1920:1080",
  "9:16": "1080:1920",
  "4:3": "1440:1080",
  "3:4": "1080:1440",
  "21:9": "2112:912",
};

// Z-Image uses its own image_size enum.
const FP_TO_ZIMAGE: Record<string, string> = {
  "1:1": "square_hd",
  "16:9": "landscape_16_9",
  "9:16": "portrait_9_16",
  "4:3": "landscape_4_3",
  "3:4": "portrait_3_4",
};

// freepik-style ("16:9") -> { width, height } for engines that take dimensions.
function fpToWH(fp: string, base = 1024): { width: number; height: number } {
  const [w, h] = (fp || "1:1").split(":").map(Number);
  if (!w || !h) return { width: base, height: base };
  if (w >= h) return { width: base, height: Math.round((base * h) / w / 16) * 16 };
  return { width: Math.round((base * w) / h / 16) * 16, height: base };
}

// Per-engine allowed aspect_ratio whitelist (Magnific tokens).
// If the requested aspect is not allowed for that engine, we snap to the
// closest supported one (by numeric ratio) to keep generation working.
const ENGINE_ALLOWED_ASPECT: Record<string, string[]> = {
  // Flux Pro 1.1 / Imagen4 / Seedream V4 / Mystic / Nano Banana Pro family
  // all support the same compact set:
  "flux-pro-1-1":          ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  "flux-kontext-pro":      ["square_1_1", "classic_4_3", "traditional_3_4", "widescreen_16_9", "social_story_9_16", "standard_3_2", "portrait_2_3", "horizontal_2_1", "vertical_1_2", "social_post_4_5"],
  "flux-2-klein":          ["square_1_1", "classic_4_3", "traditional_3_4", "widescreen_16_9", "social_story_9_16", "standard_3_2", "portrait_2_3", "horizontal_2_1", "vertical_1_2", "social_post_4_5"],
  "hyperflux":             ["square_1_1", "classic_4_3", "traditional_3_4", "widescreen_16_9", "social_story_9_16", "standard_3_2", "portrait_2_3", "horizontal_2_1", "vertical_1_2", "social_post_4_5"],
  "imagen4-ultra":         ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  "imagen4-fast":          ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  "seedream-v4":           ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  "seedream-v4-edit":      ["square_1_1", "widescreen_16_9", "social_story_9_16", "portrait_2_3", "traditional_3_4", "standard_3_2", "classic_4_3"],
  "mystic":                ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  "nano-banana-pro":       ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  "nano-banana-pro-flash": ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  "nano-banana-2":         ["square_1_1", "social_story_9_16", "widescreen_16_9", "traditional_3_4", "classic_4_3"],
  // Flux 2 family + Flux Dev
  "flux-dev":              ["square_1_1", "classic_4_3", "traditional_3_4", "widescreen_16_9", "social_story_9_16", "standard_3_2", "portrait_2_3", "horizontal_2_1", "vertical_1_2", "social_post_4_5"],
  // Seedream 4.5 / 5 Lite share the same set
  "seedream-v4-5":         ["square_1_1", "widescreen_16_9", "social_story_9_16", "portrait_2_3", "traditional_3_4", "standard_3_2", "classic_4_3", "cinematic_21_9"],
  "seedream-v4-5-edit":    ["square_1_1", "widescreen_16_9", "social_story_9_16", "portrait_2_3", "traditional_3_4", "standard_3_2", "classic_4_3", "cinematic_21_9"],
  "seedream-v5-lite":      ["square_1_1", "widescreen_16_9", "social_story_9_16", "portrait_2_3", "traditional_3_4", "standard_3_2", "classic_4_3", "cinematic_21_9"],
  "seedream-v5-lite-edit": ["square_1_1", "widescreen_16_9", "social_story_9_16", "portrait_2_3", "traditional_3_4", "standard_3_2", "classic_4_3", "cinematic_21_9"],
};

function aspectToNumber(token: string): number {
  // "widescreen_16_9" -> 16/9
  const m = token.match(/_(\d+)_(\d+)$/);
  if (!m) return 1;
  return Number(m[1]) / Number(m[2]);
}

function snapToAllowed(target: string, allowed: string[]): string {
  if (allowed.includes(target)) return target;
  const t = aspectToNumber(target);
  let best = allowed[0];
  let bestDiff = Infinity;
  for (const a of allowed) {
    const d = Math.abs(aspectToNumber(a) - t);
    if (d < bestDiff) { bestDiff = d; best = a; }
  }
  return best;
}

/** Convert a freepik-style aspect ("16:9") to a Magnific token, scoped by engine. */
export function toMagnificAspect(fp: string, engineId?: string): string {
  const token = FP_TO_MAGNIFIC_ALL[fp] ?? "square_1_1";
  if (!engineId) return token;
  const allowed = ENGINE_ALLOWED_ASPECT[engineId];
  if (!allowed) return token;
  return snapToAllowed(token, allowed);
}

// =========== IMAGE engines ===========
const IMAGE: Record<string, EngineEntry> = {
  // Mystic
  "mystic": {
    id: "mystic", kind: "image", path: "/v1/ai/mystic", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: toMagnificAspect(i.aspect, "mystic"),
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
      ...(i.refs.length ? { reference_images: (i.refsB64 ?? []).slice(0, 4) } : {}),
    }),
  },
  "nano-banana-pro": {
    id: "nano-banana-pro", kind: "image",
    path: "/v1/ai/text-to-image/nano-banana-pro", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: i.aspect,
      num_images: i.num,
      ...(i.refs.length ? { reference_images: (i.refsB64 ?? []).slice(0, 4) } : {}),
    }),
  },
  "nano-banana-pro-flash": {
    id: "nano-banana-pro-flash", kind: "image",
    path: "/v1/ai/text-to-image/nano-banana-pro-flash", aspectStyle: "freepik",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: i.aspect,
      num_images: i.num,
      ...(i.refs.length ? { reference_images: (i.refsB64 ?? []).slice(0, 4) } : {}),
    }),
  },
  // Imagen
  "imagen4-ultra": {
    id: "imagen4-ultra", kind: "image",
    path: "/v1/ai/text-to-image/imagen4-ultra", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "imagen4-ultra"), num_images: i.num }),
  },
  "imagen4-fast": {
    id: "imagen4-fast", kind: "image",
    path: "/v1/ai/text-to-image/imagen4-fast", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "imagen4-fast"), num_images: i.num }),
  },
  // Flux
  "flux-pro-1-1": {
    id: "flux-pro-1-1", kind: "image",
    path: "/v1/ai/text-to-image/flux-pro-v1-1", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "flux-pro-1-1") }),
  },
  "flux-kontext-pro": {
    id: "flux-kontext-pro", kind: "image",
    path: "/v1/ai/text-to-image/flux-kontext-pro", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: toMagnificAspect(i.aspect, "flux-kontext-pro"),
      ...(i.refs[0] ? { input_image: i.refs[0] } : {}),
    }),
  },
  "flux-2-klein": {
    id: "flux-2-klein", kind: "image",
    path: "/v1/ai/text-to-image/flux-2-klein", aspectStyle: "magnific",
    build: (i) => {
      const refs = (i.refsB64 ?? []).slice(0, 4);
      const refFields: Record<string, string> = {};
      if (refs[0]) refFields.input_image = refs[0];
      if (refs[1]) refFields.input_image_2 = refs[1];
      if (refs[2]) refFields.input_image_3 = refs[2];
      if (refs[3]) refFields.input_image_4 = refs[3];
      return {
        prompt: i.prompt,
        aspect_ratio: toMagnificAspect(i.aspect, "flux-2-klein"),
        resolution: i.resolution || "1k",
        ...refFields,
      };
    },
  },
  // Seedream
  "seedream-v4": {
    id: "seedream-v4", kind: "image",
    path: "/v1/ai/text-to-image/seedream-v4", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "seedream-v4"), num_images: i.num }),
  },
  "seedream-v4-edit": {
    id: "seedream-v4-edit", kind: "image",
    path: "/v1/ai/text-to-image/seedream-v4-edit", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: toMagnificAspect(i.aspect, "seedream-v4-edit"),
      ...(i.refs.length ? { reference_images: (i.refsB64 ?? i.refs).slice(0, 5) } : {}),
    }),
  },
  "hyperflux": {
    id: "hyperflux", kind: "image",
    path: "/v1/ai/text-to-image/hyperflux", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "hyperflux") }),
  },
  // Flux 2 Pro / Turbo (use width/height instead of aspect_ratio)
  "flux-2-pro": {
    id: "flux-2-pro", kind: "image",
    path: "/v1/ai/text-to-image/flux-2-pro", aspectStyle: "none",
    build: (i) => {
      const { width, height } = fpToWH(i.aspect, 1024);
      const refs = (i.refsB64 ?? []).slice(0, 4);
      const refFields: Record<string, string> = {};
      if (refs[0]) refFields.input_image = refs[0];
      if (refs[1]) refFields.input_image_2 = refs[1];
      if (refs[2]) refFields.input_image_3 = refs[2];
      if (refs[3]) refFields.input_image_4 = refs[3];
      return { prompt: i.prompt, width, height, ...refFields };
    },
  },
  "flux-2-turbo": {
    id: "flux-2-turbo", kind: "image",
    path: "/v1/ai/text-to-image/flux-2-turbo", aspectStyle: "none",
    build: (i) => {
      const { width, height } = fpToWH(i.aspect, 1024);
      return { prompt: i.prompt, image_size: { width, height } };
    },
  },
  "flux-dev": {
    id: "flux-dev", kind: "image",
    path: "/v1/ai/text-to-image/flux-dev", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "flux-dev") }),
  },
  // Seedream 4.5
  "seedream-v4-5": {
    id: "seedream-v4-5", kind: "image",
    path: "/v1/ai/text-to-image/seedream-v4-5", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "seedream-v4-5") }),
  },
  "seedream-v4-5-edit": {
    id: "seedream-v4-5-edit", kind: "image",
    path: "/v1/ai/text-to-image/seedream-v4-5-edit", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: toMagnificAspect(i.aspect, "seedream-v4-5-edit"),
      reference_images: (i.refsB64 ?? i.refs).slice(0, 5),
    }),
  },
  // Seedream V5 Lite
  "seedream-v5-lite": {
    id: "seedream-v5-lite", kind: "image",
    path: "/v1/ai/text-to-image/seedream-v5-lite", aspectStyle: "magnific",
    build: (i) => ({ prompt: i.prompt, aspect_ratio: toMagnificAspect(i.aspect, "seedream-v5-lite") }),
  },
  "seedream-v5-lite-edit": {
    id: "seedream-v5-lite-edit", kind: "image",
    path: "/v1/ai/text-to-image/seedream-v5-lite-edit", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      aspect_ratio: toMagnificAspect(i.aspect, "seedream-v5-lite-edit"),
      reference_images: (i.refsB64 ?? i.refs).slice(0, 5),
    }),
  },
  // Z-Image Turbo
  "z-image": {
    id: "z-image", kind: "image",
    path: "/v1/ai/text-to-image/z-image", aspectStyle: "none",
    build: (i) => ({
      prompt: i.prompt,
      image_size: FP_TO_ZIMAGE[i.aspect] ?? "square_hd",
    }),
  },
  // RunWay Text-to-Image
  "runway-t2i": {
    id: "runway-t2i", kind: "image",
    path: "/v1/ai/text-to-image/runway", aspectStyle: "none",
    build: (i) => ({
      prompt: i.prompt,
      ratio: FP_TO_RUNWAY[i.aspect] ?? "1024:1024",
    }),
  },
  // Classic Fast (legacy Freepik t2i)
  "classic-fast": {
    id: "classic-fast", kind: "image",
    path: "/v1/ai/text-to-image", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      image: { size: toMagnificAspect(i.aspect) },
      num_images: i.num,
    }),
  },
  // Reimagine Flux (variation from a single ref image)
  "reimagine-flux": {
    id: "reimagine-flux", kind: "image",
    path: "/v1/ai/text-to-image/reimagine-flux", aspectStyle: "magnific",
    build: (i) => ({
      prompt: i.prompt,
      image: i.refs[0],
      imagination: 50,
      aspect_ratio: toMagnificAspect(i.aspect),
    }),
  },
};

// =========== VIDEO engines (image-to-video unless noted) ===========
const VIDEO: Record<string, EngineEntry> = {
  // Kling V3
  "kling-v3-pro":          { id: "kling-v3-pro",          kind: "video", path: "/v1/ai/video/kling-v3-pro",                aspectStyle: "none" },
  "kling-v3-std":          { id: "kling-v3-std",          kind: "video", path: "/v1/ai/video/kling-v3-std",                aspectStyle: "none" },
  "kling-v3-motion-pro":   { id: "kling-v3-motion-pro",   kind: "video", path: "/v1/ai/video/kling-v3-motion-control-pro",  aspectStyle: "none" },
  "kling-v3-motion-std":   { id: "kling-v3-motion-std",   kind: "video", path: "/v1/ai/video/kling-v3-motion-control-std",  aspectStyle: "none" },
  "kling-v3-omni-pro":     { id: "kling-v3-omni-pro",     kind: "video", path: "/v1/ai/video/kling-v3-omni-pro",            aspectStyle: "none" },
  "kling-v3-omni-std":     { id: "kling-v3-omni-std",     kind: "video", path: "/v1/ai/video/kling-v3-omni-std",            aspectStyle: "none" },
  // Kling O1 + 2.x
  "kling-o1-pro":          { id: "kling-o1-pro",          kind: "video", path: "/v1/ai/image-to-video/kling-o1-pro",          aspectStyle: "none" },
  "kling-o1-std":          { id: "kling-o1-std",          kind: "video", path: "/v1/ai/image-to-video/kling-o1-std",          aspectStyle: "none" },
  "kling-v2-5-pro":        { id: "kling-v2-5-pro",        kind: "video", path: "/v1/ai/image-to-video/kling-v2-5-pro",        aspectStyle: "none" },
  "kling-v2-1-master":     { id: "kling-v2-1-master",     kind: "video", path: "/v1/ai/image-to-video/kling-v2-1-master",     aspectStyle: "none" },
  "kling-v2-1-pro":        { id: "kling-v2-1-pro",        kind: "video", path: "/v1/ai/image-to-video/kling-v2-1-pro",        aspectStyle: "none" },
  "kling-v2-1-std":        { id: "kling-v2-1-std",        kind: "video", path: "/v1/ai/image-to-video/kling-v2-1-std",        aspectStyle: "none" },
  // Veo — duration must be 4, 6 or 8
  "veo-3-1": {
    id: "veo-3-1", kind: "video", path: "/v1/ai/image-to-video/veo-3-1", aspectStyle: "none",
    build: (i) => {
      const d = Number(i.duration || "6");
      const dur = [4, 6, 8].includes(d) ? d : 6;
      const body: Record<string, unknown> = { prompt: i.prompt, duration: dur };
      if (i.refs[0]) body.image = i.refs[0];
      if (i.aspect) body.aspect_ratio = i.aspect;
      return body;
    },
  },
  "veo-3-1-fast": {
    id: "veo-3-1-fast", kind: "video", path: "/v1/ai/image-to-video/veo-3-1-fast", aspectStyle: "none",
    build: (i) => {
      const d = Number(i.duration || "6");
      const dur = [4, 6, 8].includes(d) ? d : 6;
      const body: Record<string, unknown> = { prompt: i.prompt, duration: dur };
      if (i.refs[0]) body.image = i.refs[0];
      if (i.aspect) body.aspect_ratio = i.aspect;
      return body;
    },
  },
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
  "pixverse-v5-transition":{
    id: "pixverse-v5-transition", kind: "video",
    path: "/v1/ai/image-to-video/pixverse-v5-transition", aspectStyle: "none",
    build: (i) => {
      const body: Record<string, unknown> = {
        prompt: i.prompt,
        first_image_url: i.refs[0],
        last_image_url: i.lastImageUrl || i.refs[1],
        duration: Number(i.duration || "5"),
      };
      if (i.resolution) body.resolution = i.resolution;
      return body;
    },
  },
  // LTX (text-to-video)
  "ltx-2-pro":             { id: "ltx-2-pro",             kind: "video", path: "/v1/ai/text-to-video/ltx-2-pro",               aspectStyle: "none" },
  // Wan
  "wan-2-7":               { id: "wan-2-7",               kind: "video", path: "/v1/ai/image-to-video/wan-2-7",                aspectStyle: "none" },
  "wan-v2-6-1080p":        { id: "wan-v2-6-1080p",        kind: "video", path: "/v1/ai/image-to-video/wan-v2-6-1080p",         aspectStyle: "none" },
  "wan-2-5-i2v-1080p":     { id: "wan-2-5-i2v-1080p",     kind: "video", path: "/v1/ai/image-to-video/wan-2-5-i2v-1080p",      aspectStyle: "none" },
  "wan-2-5-t2v-1080p":     { id: "wan-2-5-t2v-1080p",     kind: "video", path: "/v1/ai/text-to-video/wan-2-5-t2v-1080p",       aspectStyle: "none" },
  "wan-2-5-t2v-720p":      { id: "wan-2-5-t2v-720p",      kind: "video", path: "/v1/ai/text-to-video/wan-2-5-t2v-720p",        aspectStyle: "none" },
  // Omnihuman
  "omnihuman-1-5":         {
    id: "omnihuman-1-5", kind: "video",
    path: "/v1/ai/video/omni-human-1-5", aspectStyle: "none",
    build: (i) => {
      const body: Record<string, unknown> = {
        image_url: i.refs[0],
        audio_url: (i.extra?.audio_url as string) || i.refs[1],
      };
      if (i.prompt) body.prompt = i.prompt;
      if (i.resolution) body.resolution = i.resolution;
      return body;
    },
  },
  // Seedance 1.5 Pro (text-to-video + image-to-video, with audio/lip-sync)
  "seedance-1-5-pro-480p": {
    id: "seedance-1-5-pro-480p", kind: "video",
    path: "/v1/ai/video/seedance-1-5-pro-480p", aspectStyle: "none",
    build: (i) => {
      const body: Record<string, unknown> = { prompt: i.prompt, duration: Number(i.duration || "5") };
      if (i.refs[0]) body.image = i.refs[0];
      return body;
    },
  },
  "seedance-1-5-pro-720p": {
    id: "seedance-1-5-pro-720p", kind: "video",
    path: "/v1/ai/video/seedance-1-5-pro-720p", aspectStyle: "none",
    build: (i) => {
      const body: Record<string, unknown> = { prompt: i.prompt, duration: Number(i.duration || "5") };
      if (i.refs[0]) body.image = i.refs[0];
      return body;
    },
  },
  "seedance-1-5-pro-1080p": {
    id: "seedance-1-5-pro-1080p", kind: "video",
    path: "/v1/ai/video/seedance-1-5-pro-1080p", aspectStyle: "none",
    build: (i) => {
      const body: Record<string, unknown> = { prompt: i.prompt, duration: Number(i.duration || "5") };
      if (i.refs[0]) body.image = i.refs[0];
      return body;
    },
  },
  // Video Upscaler (Magnific)
  "video-upscaler": {
    id: "video-upscaler", kind: "video",
    path: "/v1/ai/video-upscaler", aspectStyle: "none",
    build: (i) => ({ video: i.refs[0], resolution: i.resolution || "2k" }),
  },
  "video-upscaler-turbo": {
    id: "video-upscaler-turbo", kind: "video",
    path: "/v1/ai/video-upscaler/turbo", aspectStyle: "none",
    build: (i) => ({ video: i.refs[0], resolution: i.resolution || "2k" }),
  },
  // Lip Sync (Latent Sync) — needs video_url + audio_url
  "latent-sync": {
    id: "latent-sync", kind: "video",
    path: "/v1/ai/lip-sync/latent-sync", aspectStyle: "none",
    build: (i) => ({
      video_url: i.refs[0],
      audio_url: (i.extra?.audio_url as string) || i.refs[1],
    }),
  },
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
  // Skin Enhancer (3 modes)
  "skin-enhancer-creative": {
    id: "skin-enhancer-creative", kind: "image", path: "/v1/ai/skin-enhancer/creative", aspectStyle: "none",
    build: (i) => ({ image: i.refs[0], sharpen: 30, smart_grain: 5 }),
  },
  "skin-enhancer-faithful": {
    id: "skin-enhancer-faithful", kind: "image", path: "/v1/ai/skin-enhancer/faithful", aspectStyle: "none",
    build: (i) => ({ image: i.refs[0], sharpen: 20, smart_grain: 2, skin_detail_preservation: 50 }),
  },
  "skin-enhancer-flexible": {
    id: "skin-enhancer-flexible", kind: "image", path: "/v1/ai/skin-enhancer/flexible", aspectStyle: "none",
    build: (i) => ({
      image: i.refs[0],
      optimization_target: (i.extra?.target as string) || "enhance_everything",
      sharpen: 25,
    }),
  },
  // Inpainting (Ideogram Image Edit) — needs mask
  "ideogram-edit": {
    id: "ideogram-edit", kind: "image", path: "/v1/ai/ideogram-image-edit", aspectStyle: "none",
    build: (i) => ({
      image: i.refs[0],
      mask: i.refs[1] || (i.extra?.mask_url as string),
      prompt: i.prompt,
      rendering_speed: (i.extra?.speed as string) || "DEFAULT",
    }),
  },
  // Change Camera
  "change-camera": {
    id: "change-camera", kind: "image", path: "/v1/ai/image-change-camera", aspectStyle: "none",
    build: (i) => ({
      image: i.refs[0],
      horizontal_rotation: Number(i.extra?.horizontal_rotation ?? 30),
      vertical_tilt: Number(i.extra?.vertical_tilt ?? 0),
      zoom: Number(i.extra?.zoom ?? 0),
    }),
  },
  // Image Expand variants
  "expand-seedream-v4-5": {
    id: "expand-seedream-v4-5", kind: "image", path: "/v1/ai/image-expand/seedream-v4-5", aspectStyle: "none",
    build: (i) => ({
      image: i.refs[0], prompt: i.prompt,
      left: Number(i.extra?.left ?? 0), right: Number(i.extra?.right ?? 0),
      top: Number(i.extra?.top ?? 0), bottom: Number(i.extra?.bottom ?? 0),
    }),
  },
  "expand-ideogram": {
    id: "expand-ideogram", kind: "image", path: "/v1/ai/image-expand/ideogram", aspectStyle: "none",
    build: (i) => ({
      image: i.refs[0], prompt: i.prompt,
      left: Number(i.extra?.left ?? 0), right: Number(i.extra?.right ?? 0),
      top: Number(i.extra?.top ?? 0), bottom: Number(i.extra?.bottom ?? 0),
    }),
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
  "magnific-precision-v2": {
    id: "magnific-precision-v2", kind: "image",
    path: "/v1/ai/image-upscaler-precision-v2", aspectStyle: "none",
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
  "audio-isolation": {
    id: "audio-isolation", kind: "audio", path: "/v1/ai/audio-isolation", aspectStyle: "none",
    build: (i) => ({ audio: (i.extra?.audio_url as string) || i.refs[0] }),
  },
  "voiceover": {
    id: "voiceover", kind: "audio", path: "/v1/ai/text-to-speech", aspectStyle: "none",
    build: (i) => ({
      text: i.prompt,
      voice: (i.extra?.voice as string) || "default",
    }),
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
export function requiresReferenceImage(engineId: string): boolean {
  return new Set([
    "seedream-v4-edit",
    "seedream-v4-5-edit",
    "seedream-v5-lite-edit",
  ]).has(engineId);
}

export function resolveImageEngine(refsCount: number, override?: string | null): string {
  if (override === "flux-kontext-pro" && refsCount === 0) return "nano-banana-pro";
  if (override && getEngine(override)?.kind === "image") return override;
  if (refsCount >= 2) return "nano-banana-2";
  return "nano-banana-pro";
}
