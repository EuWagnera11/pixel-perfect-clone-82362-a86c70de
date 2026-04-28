import { supabase } from "@/integrations/supabase/client";

/**
 * Refine API client.
 * Cobre 50+ endpoints da plataforma:
 *   - Image: generations, swaps, edit, specialized
 *   - Video: generations (kling/hailuo), batch, lip sync
 *   - Audio: TTS, voice clone, music, sound effects
 *   - AI text: captions, hashtags, story, carousel, brand voice
 *   - Workflow: drive imports, style learning, recreate, batch
 *   - Catalog: templates, worlds, model presets, music library
 *   - Billing: checkout, portal, history
 */
export const API_URL = import.meta.env.VITE_API_URL ?? "https://refinecubo.com.br/api";

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

type ReqOpts = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
  anonymous?: boolean;
  raw?: boolean;
};

async function request<T = unknown>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { body, headers = {}, anonymous, raw, ...rest } = opts;
  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };

  if (!anonymous) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
      payload = body as BodyInit;
    } else {
      payload = JSON.stringify(body);
      finalHeaders["Content-Type"] ??= "application/json";
    }
  }

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders, body: payload });
  if (raw) return res as unknown as T;

  const text = await res.text();
  const json = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (json && typeof json === "object" && "detail" in json && String((json as any).detail))
      || (json && typeof json === "object" && "message" in json && String((json as any).message))
      || `Request failed: ${res.status}`;
    throw new ApiError(res.status, json ?? text, msg);
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

const http = {
  get:    <T = unknown>(p: string, o?: ReqOpts) => request<T>(p, { ...o, method: "GET" }),
  post:   <T = unknown>(p: string, body?: unknown, o?: ReqOpts) => request<T>(p, { ...o, method: "POST", body }),
  patch:  <T = unknown>(p: string, body?: unknown, o?: ReqOpts) => request<T>(p, { ...o, method: "PATCH", body }),
  put:    <T = unknown>(p: string, body?: unknown, o?: ReqOpts) => request<T>(p, { ...o, method: "PUT", body }),
  delete: <T = unknown>(p: string, o?: ReqOpts) => request<T>(p, { ...o, method: "DELETE" }),
};

// ============== TYPES ==============

export type Persona = {
  id: string;
  name: string;
  description?: string;
  reference_image_url?: string;
  canonical_grid_url?: string;
  attributes?: Record<string, unknown>;
  created_at: string;
};

export type Template = {
  id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  prompt?: string;
  rating?: number;
  uses_count?: number;
  media_type?: "image" | "video" | "audio" | "music";
  complexity?: "easy" | "medium" | "hard";
  credits_cost?: number;
};

export type GenerationStatus = "queued" | "processing" | "enhancing" | "upscaling" | "completed" | "failed";

export type Generation = {
  id: string;
  status: GenerationStatus;
  prompt?: string;
  persona_id?: string;
  template_id?: string;
  learned_style_id?: string;
  num_variations?: number;
  resolution?: string;
  aspect_ratio?: string;
  image_urls?: string[];
  video_urls?: string[];
  media_type?: "image" | "video";
  credits_used: number;
  created_at: string;
  completed_at?: string | null;
};

export type World = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  prompt_template: string;
  reference_images?: string[];
  preview_url?: string;
  is_public: boolean;
  uses_count: number;
};

export type ModelPreset = {
  id: string;
  name: string;
  description?: string;
  category: string;
  gender?: string;
  ethnicity?: string;
  reference_image_url: string;
  base_prompt: string;
  preview_urls?: string[];
  uses_count: number;
  rating: number;
  is_premium: boolean;
};

export type Voice = {
  id: string;
  name: string;
  description?: string;
  external_voice_id: string;
  language: string;
  gender?: string;
  preview_url?: string;
  is_clone: boolean;
};

export type AudioGen = {
  id: string;
  type: "tts" | "voice_clone" | "music" | "lip_sync" | "sound_effect";
  status: string;
  output_url?: string;
  text_input?: string;
  voice_preset?: string;
  duration_seconds?: number;
  credits_used: number;
  created_at: string;
};

export type EditJob = {
  id: string;
  type: string;
  status: string;
  source_image_url: string;
  output_urls?: string[];
  prompt?: string;
  credits_used: number;
};

export type DriveImport = {
  id: string;
  source_url: string;
  status: "pending" | "importing" | "analyzing" | "ready" | "failed";
  total_files: number;
  imported_files: number;
  storage_paths?: string[];
  created_at: string;
};

export type LearnedStyle = {
  id: string;
  name: string;
  description?: string;
  status: "analyzing" | "ready" | "failed";
  example_count: number;
  prompt_template?: string;
  style_summary?: any;
};

export type RecreateJob = {
  id: string;
  persona_id: string;
  drive_import_id: string;
  status: string;
  total_files: number;
  completed_files: number;
  generation_ids?: string[];
};

export type BatchJob = {
  id: string;
  type: string;
  status: string;
  total_jobs: number;
  completed_jobs: number;
  generation_ids?: string[];
  total_credits_used: number;
};

export type Balance = { credits: number; tier: string };
export type Job = { id: string; status: string; progress?: number; result?: unknown };
export type SignedUploadResponse = { upload_url: string; token?: string; path: string; bucket: string };

// ============== API ==============

export const api = {
  // ──────────── PERSONAS ────────────
  personas: {
    list: () => http.get<Persona[]>("/personas"),
    get: (id: string) => http.get<Persona>(`/personas/${id}`),
    create: (body: Partial<Persona>) => http.post<Persona>("/personas", body),
    update: (id: string, body: Partial<Persona>) => http.patch<Persona>(`/personas/${id}`, body),
    remove: (id: string) => http.delete<void>(`/personas/${id}`),
  },

  // ──────────── TEMPLATES ────────────
  templates: {
    list: (params?: { category?: string; media_type?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return http.get<Template[]>(`/templates${q ? "?" + q : ""}`);
    },
    get: (id: string) => http.get<Template>(`/templates/${id}`),
    categories: () => http.get<{ name: string; count: number }[]>("/templates/categories/list"),
  },

  // ──────────── GENERATIONS (image + video) ────────────
  generations: {
    list: (limit = 50, offset = 0) => http.get<Generation[]>(`/generations?limit=${limit}&offset=${offset}`),
    get: (id: string) => http.get<Generation>(`/generations/${id}`),
    create: (body: {
      persona_id?: string;
      template_id?: string;
      learned_style_id?: string;
      prompt?: string;
      aspect_ratio?: string;
      resolution?: "1k" | "2k" | "4k";
      num_variations?: number;
      media_type?: "image" | "video";
      enhance_skin?: boolean;
      upscale?: boolean;
      // video
      image_url?: string;
      video_engine?: "kling_v3" | "kling_v2_1" | "hailuo" | "wan_2_1" | "runway";
      duration?: string;
    }) => http.post<{ id: string; status: string; credits_used: number }>("/generations", body),
    remove: (id: string) => http.delete<void>(`/generations/${id}`),
  },

  // ──────────── SWAPS ────────────
  swaps: {
    face: (body: { source_image_url: string; target_image_url: string }) =>
      http.post<{ id: string; status: string; credits_used: number }>("/swaps/face", body),
    scene: (body: { persona_id: string; scene_prompt: string }) =>
      http.post<{ id: string; status: string; credits_used: number }>("/swaps/scene", body),
    cloth: (body: { person_image_url: string; outfit_prompt: string }) =>
      http.post<{ id: string; status: string; credits_used: number }>("/swaps/cloth", body),
  },

  // ──────────── BATCH ────────────
  batch: {
    images: (body: { persona_id: string; template_ids: string[]; num_per_template?: number }) =>
      http.post<{ id: string; total_jobs: number; credits_used: number }>("/batch/images", body),
    videos: (body: { image_urls: string[]; prompt: string; engine?: string }) =>
      http.post<{ id: string; total_jobs: number; credits_used: number }>("/batch/videos", body),
    list: () => http.get<BatchJob[]>("/batch"),
    get: (id: string) => http.get<BatchJob>(`/batch/${id}`),
  },

  // ──────────── DRIVE / LEARN / RECREATE ────────────
  drive: {
    imports: {
      create: (body: { source_url: string; folder_name?: string }) =>
        http.post<DriveImport>("/drive/imports", body),
      list: () => http.get<DriveImport[]>("/drive/imports"),
      get: (id: string) => http.get<DriveImport>(`/drive/imports/${id}`),
    },
    learn: {
      create: (body: { drive_import_id: string; name: string; description?: string }) =>
        http.post<LearnedStyle>("/drive/learn", body),
      list: () => http.get<LearnedStyle[]>("/drive/learn"),
      get: (id: string) => http.get<LearnedStyle>(`/drive/learn/${id}`),
    },
    recreate: {
      create: (body: { persona_id: string; drive_import_id: string; skin_enhance?: boolean; magnific?: boolean; preserve_logos?: boolean }) =>
        http.post<RecreateJob>("/drive/recreate", body),
      list: () => http.get<RecreateJob[]>("/drive/recreate"),
      get: (id: string) => http.get<RecreateJob>(`/drive/recreate/${id}`),
    },
  },

  // ──────────── ENHANCE ────────────
  enhance: {
    upscale: (body: { image_url: string; scale?: 2 | 4; engine?: string; creativity?: number; hdr?: number; resemblance?: number }) =>
      http.post<{ task_id: string; credits_used: number }>("/enhance/upscale", body),
    skin: (body: { image_url: string; mode?: "faithful" | "flexible"; skin_detail?: number; smart_grain?: number }) =>
      http.post<{ task_id: string; credits_used: number }>("/enhance/skin", body),
    backgroundRemove: (body: { image_url: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/enhance/background-remove", body),
    relight: (body: { image_url: string; prompt: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/enhance/relight", body),
    task: (taskId: string, kind = "enhance") =>
      http.get<any>(`/enhance/task/${taskId}?kind=${kind}`),
  },

  // ──────────── EDIT (inpaint, outpaint, etc) ────────────
  edit: {
    inpaint: (body: { image_url: string; mask_url: string; prompt: string }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/inpaint", body),
    outpaint: (body: { image_url: string; prompt?: string; direction?: string; expansion_factor?: number }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/outpaint", body),
    removeObject: (body: { image_url: string; mask_url: string }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/remove-object", body),
    sketchToImage: (body: { sketch_url: string; prompt: string; strength?: number }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/sketch-to-image", body),
    styleTransfer: (body: { source_url: string; style_reference_url: string; prompt?: string; strength?: number }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/style-transfer", body),
    replaceBackground: (body: { image_url: string; prompt: string }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/replace-background", body),
    expand: (body: { image_url: string; target_aspect_ratio?: string }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/expand", body),
    colorize: (body: { image_url: string; prompt?: string }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/edit/colorize", body),
    list: () => http.get<EditJob[]>("/edit"),
    get: (id: string) => http.get<EditJob>(`/edit/${id}`),
  },

  // ──────────── SPECIALIZED ────────────
  specialized: {
    multiView: (body: { persona_ref: string; num_angles?: number }) =>
      http.post<{ id: string; urls: string[]; credits_used: number }>("/specialized/multi-view", body),
    hairChange: (body: { image_url: string; color?: string; style?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/hair-change", body),
    expressionChange: (body: { image_url: string; expression: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/expression-change", body),
    ageChange: (body: { image_url: string; target_age: number }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/age-change", body),
    twin: (body: { persona_ref: string; scene_prompt: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/twin", body),
    headshotPro: (body: { persona_ref: string; style?: "corporate" | "creative" | "casual" | "editorial" }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/headshot-pro", body),
    ecommerce: (body: { product_image_url: string; mode?: "white_bg" | "lifestyle" | "luxury"; scene_prompt?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/ecommerce", body),
    realEstate: (body: { property_image_url: string; style?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/real-estate", body),
    food: (body: { food_image_url: string; mood?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/food", body),
    magazineCover: (body: { persona_ref: string; magazine_name?: string; theme?: string; headline?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/magazine-cover", body),
    youtubeThumbnail: (body: { persona_ref: string; theme: string; big_text?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/youtube-thumbnail", body),
    passport: (body: { persona_ref: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/passport", body),
    maternity: (body: { persona_ref: string; weeks?: number }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/maternity", body),
    wedding: (body: { persona_ref: string; scene?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/wedding", body),
    familyPortrait: (body: { persona_refs: string[]; scene?: string }) =>
      http.post<{ task_id: string; credits_used: number }>("/specialized/family-portrait", body),
    photoRestoration: (body: { image_url: string; colorize?: boolean; upscale?: boolean }) =>
      http.post<{ id: string; final: string; steps: Record<string, string>; credits_used: number }>("/specialized/photo-restoration", body),
  },

  // ──────────── AUDIO ────────────
  audio: {
    tts: (body: { text: string; voice?: string; language?: string; stability?: number; similarity_boost?: number; style?: number }) =>
      http.post<{ id: string; url: string; credits_used: number }>("/audio/tts", body),
    music: (body: { prompt: string; duration?: number; genre?: string; mood?: string }) =>
      http.post<{ id: string; url: string; duration: number; credits_used: number }>("/audio/music", body),
    sfx: (body: { prompt: string; duration?: number }) =>
      http.post<{ url: string; credits_used: number }>("/audio/sfx", body),
    lipSync: (body: { video_url: string; audio_url: string }) =>
      http.post<{ id: string; task_id: string; credits_used: number }>("/audio/lip-sync", body),
    voiceClone: (formData: FormData) =>
      http.post<{ id: string; voice_id: string; credits_used: number }>("/audio/voices/clone", formData),
    voices: () => http.get<{ presets: Record<string, string>; user_voices: Voice[] }>("/audio/voices"),
    deleteVoice: (id: string) => http.delete<void>(`/audio/voices/${id}`),
    list: () => http.get<AudioGen[]>("/audio"),
    get: (id: string) => http.get<AudioGen>(`/audio/${id}`),
  },

  // ──────────── WORLDS / PRESETS / MUSIC LIBRARY ────────────
  worlds: {
    list: (category?: string) => http.get<World[]>(`/worlds${category ? "?category=" + category : ""}`),
    create: (body: Partial<World>) => http.post<World>("/worlds", body),
    remove: (id: string) => http.delete<void>(`/worlds/${id}`),
    categories: () => http.get<{ name: string; count: number }[]>("/worlds/categories"),
  },
  presets: {
    list: (params?: { category?: string; gender?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return http.get<ModelPreset[]>(`/presets${q ? "?" + q : ""}`);
    },
    categories: () => http.get<{ name: string; count: number }[]>("/presets/categories"),
    use: (id: string) => http.post<{ persona_id: string; name: string }>(`/presets/${id}/use`),
  },
  musicLibrary: {
    list: (params?: { genre?: string; mood?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return http.get<any[]>(`/music-library${q ? "?" + q : ""}`);
    },
  },

  // ──────────── CONTENT CALENDAR (mass content) ────────────
  calendar: {
    packs: () => http.get<{ key: string; name: string; description: string; category: string; duration_days: number }[]>("/calendar/packs"),
    getPack: (key: string) => http.get<any>(`/calendar/packs/${key}`),
    create: (body: {
      persona_id: string;
      name: string;
      brief?: string;
      pack_key?: string;
      custom_prompts?: string[];
      n_posts?: number;
      start_date?: string;
      enhance_skin?: boolean;
      upscale?: boolean;
    }) => http.post<{ id: string; n_posts: number; total_credits: number; start_date: string; end_date: string }>("/calendar", body),
    list: () => http.get<any[]>("/calendar"),
    get: (id: string) => http.get<any>(`/calendar/${id}`),
    remove: (id: string) => http.delete<void>(`/calendar/${id}`),
  },

  // ──────────── BILLING ────────────
  billing: {
    me: () => http.get<{
      tier: string;
      credits: number;
      tiers: Record<string, { credits: number; amount_brl: number; interval: "month" | "year"; tier: string; welcome_bonus: number }>;
      packs:  Record<string, { credits: number; amount_brl: number }>;
      addons: Record<string, { amount_brl: number; label: string }>;
    }>("/billing/me"),
    checkout: (body: { tier?: string; pack?: string; addon?: string }) =>
      http.post<{ url: string; session_id: string }>("/billing/checkout", body),
    portal: () => http.get<{ url: string }>("/billing/portal"),
  },

  // ──────────── CATALOG (modelos + capacidade do user) ────────────
  catalog: {
    models: () => http.get<{
      images: Array<{ id: string; name: string; tier: string; resolutions: Record<string, number> }>;
      videos: Array<{ id: string; name: string; tier: string; variants: Array<{ duration: string; audio: boolean; cost: number }> }>;
      enhance: Array<{ id: string; cost: number }>;
      edit:    Array<{ id: string; cost: number }>;
      audio:   Array<{ id: string; cost: number }>;
      swap:    Array<{ id: string; cost: number }>;
      specialized: Array<{ id: string; cost: number }>;
    }>("/catalog/models"),
    capacity: () => http.get<{
      balance: number;
      tier: string;
      images: Record<string, Record<string, number>>;
      videos: Record<string, Array<{ duration: string; audio: boolean; available: number }>>;
      enhance: Record<string, number>;
      edit:    Record<string, number>;
      audio:   Record<string, number>;
      swap:    Record<string, number>;
      specialized: Record<string, number>;
    }>("/catalog/capacity"),
    costPreview: (params: { model: string; resolution?: string; duration?: string; audio?: boolean }) => {
      const q = new URLSearchParams(params as any).toString();
      return http.get<{ cost: number; kind: "image" | "video" }>(`/catalog/cost-preview?${q}`);
    },
  },

  // ──────────── UPLOADS ────────────
  uploads: {
    signedUrl: (body: { bucket: string; filename: string; content_type?: string }) =>
      http.post<SignedUploadResponse>("/uploads/signed-url", body),
    signedDownload: (params: { bucket: string; path: string; ttl?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return http.post<{ url: string }>(`/uploads/signed-download?${q}`);
    },
  },

  // ──────────── SYSTEM ────────────
  health: () => http.get<{ status: string; version: string }>("/health"),
};
