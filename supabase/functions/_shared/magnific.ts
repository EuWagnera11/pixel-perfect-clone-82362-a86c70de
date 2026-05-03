// Magnific API helper (formerly Freepik) with API-key rotation
// (60s cooldown on 401/402/429) and structured logging into proxy_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const MAGNIFIC_BASE = "https://api.freepik.com";

function loadKeys(): string[] {
  const multi = Deno.env.get("FREEPIK_API_KEYS");
  if (multi) return multi.split(",").map((k) => k.trim()).filter(Boolean);
  const single = Deno.env.get("FREEPIK_API_KEY");
  return single ? [single.trim()] : [];
}

const KEYS = loadKeys();
const cooldown = new Map<string, number>();

function pickKey(): string | null {
  const now = Date.now();
  for (const k of KEYS) {
    if ((cooldown.get(k) ?? 0) <= now) return k;
  }
  return null;
}

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type MagnificLogContext = {
  userId?: string;
  generationId?: string;
  endpointKey?: string;
};

export type MagnificResp = { status: number; body: any; rawText: string };

/** Make a Magnific API call. Path must start with `/v1/...`. */
export async function magnificFetch(
  path: string,
  init: RequestInit & { logCtx?: MagnificLogContext } = {},
): Promise<MagnificResp> {
  if (KEYS.length === 0) throw new Error("FREEPIK_API_KEYS not configured");

  const url = path.startsWith("http") ? path : `${MAGNIFIC_BASE}${path}`;
  const { logCtx, ...rest } = init;
  let lastResp: MagnificResp | null = null;

  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const key = pickKey();
    if (!key) break;

    const headers = new Headers(rest.headers || {});
    // Send both header names so this works against api.magnific.com and legacy api.freepik.com
    headers.set("x-magnific-api-key", key);
    headers.set("x-freepik-api-key", key);
    if (rest.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    const t0 = Date.now();
    let status = 0;
    let rawText = "";
    let body: any = null;
    try {
      const resp = await fetch(url, { ...rest, headers });
      status = resp.status;
      rawText = await resp.text();
      try { body = rawText ? JSON.parse(rawText) : null; } catch { body = rawText; }
    } catch (e) {
      status = 0;
      rawText = String(e);
    }

    if (logCtx) {
      const reqBodySafe = typeof rest.body === "string" ? safeParse(rest.body) : null;
      admin().from("proxy_logs").insert({
        user_id: logCtx.userId ?? null,
        generation_id: logCtx.generationId ?? null,
        endpoint_key: logCtx.endpointKey ?? path,
        attempted_url: url,
        request_body: reqBodySafe,
        response_status: status,
        response_body: typeof body === "object" ? body : { raw: rawText.slice(0, 4000) },
        duration_ms: Date.now() - t0,
      }).then(() => {}, () => {});
    }

    if (status === 401 || status === 402 || status === 429) {
      cooldown.set(key, Date.now() + 60_000);
      lastResp = { status, body, rawText };
      continue;
    }

    // Task created with another key — try the next key without burning cooldown
    const msg = (body?.message ?? body?.detail?.message ?? "").toString();
    if (status === 404 && /task not found/i.test(msg)) {
      lastResp = { status, body, rawText };
      continue;
    }

    return { status, body, rawText };
  }

  return lastResp ?? { status: 503, body: { error: "All Magnific API keys exhausted or in cooldown" }, rawText: "" };
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return { raw: s.slice(0, 4000) }; } }

// ============= shared response helpers =============

export function extractTaskId(body: any): string | null {
  return (
    body?.data?.task_id ?? body?.data?.id ?? body?.task_id ?? body?.id ?? null
  );
}

export function extractUrls(body: any): string[] {
  const out: string[] = [];
  const d = body?.data ?? body ?? {};
  if (Array.isArray(d.generated)) out.push(...d.generated.filter((x: any) => typeof x === "string"));
  if (Array.isArray(d.images)) out.push(...d.images.map((i: any) => typeof i === "string" ? i : i?.url).filter(Boolean));
  if (Array.isArray(d.urls)) out.push(...d.urls.filter((x: any) => typeof x === "string"));
  if (typeof d.url === "string") out.push(d.url);
  if (typeof d.image_url === "string") out.push(d.image_url);
  if (typeof d.video_url === "string") out.push(d.video_url);
  if (typeof d.audio_url === "string") out.push(d.audio_url);
  if (typeof d.result_url === "string") out.push(d.result_url);
  return Array.from(new Set(out));
}

export function normalizeStatus(body: any): "queued" | "processing" | "completed" | "failed" {
  const s = (body?.data?.status ?? body?.status ?? "").toString().toUpperCase();
  if (["COMPLETED", "SUCCESS", "DONE", "FINISHED"].includes(s)) return "completed";
  if (["FAILED", "ERROR", "CANCELED", "CANCELLED"].includes(s)) return "failed";
  if (["IN_PROGRESS", "PROCESSING", "RUNNING"].includes(s)) return "processing";
  return "queued";
}
