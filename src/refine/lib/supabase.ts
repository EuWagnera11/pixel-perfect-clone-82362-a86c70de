import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://obxbwawlvtbfbxocnxzl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_NY_ToQeIZmjraQkAdso2_w_5t8AnW7T";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const API_URL =
  import.meta.env.VITE_API_URL ?? "https://refine-saas-cubo-api.ewp1z9.easypanel.host";

export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session!;
}

export async function api<T = unknown>(
  path: string,
  opts: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("No session");
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${session.access_token}`,
    ...((opts.headers as Record<string, string>) || {}),
  };
  let body = opts.body as BodyInit | undefined;
  if (opts.body !== undefined && typeof opts.body !== "string" && !(opts.body instanceof FormData)) {
    body = JSON.stringify(opts.body);
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers, body });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const detail =
      (json && typeof json === "object" && "detail" in json && (json as any).detail) ||
      `HTTP ${res.status}`;
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    (err as any).status = res.status;
    (err as any).body = json;
    throw err;
  }
  return json as T;
}
