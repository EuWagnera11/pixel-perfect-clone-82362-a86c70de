import { supabase } from "@/integrations/supabase/client";

/**
 * Cubo API client.
 * Base URL comes from VITE_API_URL (public).
 * Every request automatically attaches the current Supabase JWT as Bearer token.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? "https://api.refinecubo.com.br";

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

type ReqOpts = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth header even if session exists. */
  anonymous?: boolean;
  /** Treat response as raw (no JSON parse). */
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
    const msg =
      (json && typeof json === "object" && "message" in json && String((json as any).message)) ||
      `Request failed: ${res.status}`;
    throw new ApiError(res.status, json ?? text, msg);
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const http = {
  get: <T = unknown>(p: string, o?: ReqOpts) => request<T>(p, { ...o, method: "GET" }),
  post: <T = unknown>(p: string, body?: unknown, o?: ReqOpts) => request<T>(p, { ...o, method: "POST", body }),
  patch: <T = unknown>(p: string, body?: unknown, o?: ReqOpts) => request<T>(p, { ...o, method: "PATCH", body }),
  put: <T = unknown>(p: string, body?: unknown, o?: ReqOpts) => request<T>(p, { ...o, method: "PUT", body }),
  delete: <T = unknown>(p: string, o?: ReqOpts) => request<T>(p, { ...o, method: "DELETE" }),
};

// ---------- Domain types (loose – refine when OpenAPI is live) ----------
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
};

export type GenerationStatus = "queued" | "running" | "completed" | "failed";

export type Generation = {
  id: string;
  status: GenerationStatus;
  prompt?: string;
  persona_id?: string;
  template_id?: string;
  num_variations: number;
  resolution: string;
  aspect_ratio: string;
  image_urls: string[];
  credits_used: number;
  created_at: string;
  completed_at?: string | null;
};

export type Balance = { credits: number; tier: string };
export type CheckoutResponse = { url: string };
export type SignedUploadResponse = { upload_url: string; public_url: string; key: string };
export type Job = { id: string; status: string; progress?: number; result?: unknown };

// ---------- API surface ----------
export const api = {
  auth: {
    me: () => http.get("/api/auth/me"),
    signup: (body: { email: string; password: string; full_name?: string }) =>
      http.post("/api/auth/signup", body, { anonymous: true }),
    login: (body: { email: string; password: string }) =>
      http.post("/api/auth/login", body, { anonymous: true }),
    google: (body: { id_token: string }) => http.post("/api/auth/google", body, { anonymous: true }),
    refresh: (body: { refresh_token: string }) => http.post("/api/auth/refresh", body, { anonymous: true }),
  },
  personas: {
    list: () => http.get<Persona[]>("/api/personas"),
    get: (id: string) => http.get<Persona>(`/api/personas/${id}`),
    create: (body: Partial<Persona>) => http.post<Persona>("/api/personas", body),
    update: (id: string, body: Partial<Persona>) => http.patch<Persona>(`/api/personas/${id}`, body),
    remove: (id: string) => http.delete<void>(`/api/personas/${id}`),
    generateGrid: (id: string) => http.post<Job>(`/api/personas/${id}/generate-grid`),
  },
  generations: {
    list: () => http.get<Generation[]>("/api/generations"),
    get: (id: string) => http.get<Generation>(`/api/generations/${id}`),
    create: (body: {
      persona_id?: string;
      template_id?: string;
      prompt?: string;
      num_variations?: number;
      resolution?: string;
      aspect_ratio?: string;
    }) => http.post<Generation>("/api/generations", body),
    remove: (id: string) => http.delete<void>(`/api/generations/${id}`),
    regenerate: (id: string) => http.post<Generation>(`/api/generations/${id}/regenerate`),
  },
  templates: {
    list: () => http.get<Template[]>("/api/templates"),
    get: (id: string) => http.get<Template>(`/api/templates/${id}`),
  },
  billing: {
    balance: () => http.get<Balance>("/api/billing/balance"),
    checkout: (body: { price_id?: string; plan?: string }) =>
      http.post<CheckoutResponse>("/api/billing/checkout", body),
    portal: () => http.post<CheckoutResponse>("/api/billing/portal"),
    history: () => http.get<unknown[]>("/api/billing/history"),
  },
  uploads: {
    personaPhoto: (body: { filename: string; content_type: string }) =>
      http.post<SignedUploadResponse>("/api/uploads/persona-photo", body),
  },
  jobs: {
    get: (jobId: string) => http.get<Job>(`/api/jobs/${jobId}`),
  },
};
