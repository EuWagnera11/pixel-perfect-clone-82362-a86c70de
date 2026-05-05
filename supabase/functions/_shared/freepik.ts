// Freepik fetch helper with API-key rotation (60s cooldown on 401/402/429)
// and structured logging into proxy_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREEPIK_BASE = "https://api.freepik.com";

function loadKeys(): string[] {
  const multi = Deno.env.get("FREEPIK_API_KEYS");
  if (multi) return multi.split(",").map((k) => k.trim()).filter(Boolean);
  const single = Deno.env.get("FREEPIK_API_KEY");
  return single ? [single.trim()] : [];
}

const KEYS = loadKeys();
const cooldown = new Map<string, number>(); // key -> until ts ms

function pickKey(): string | null {
  const now = Date.now();
  for (const k of KEYS) {
    const until = cooldown.get(k) ?? 0;
    if (until <= now) return k;
  }
  return null;
}

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type FreepikLogContext = {
  userId?: string;
  generationId?: string;
  endpointKey?: string;
};

/** Make a Freepik API call. Path must start with `/v1/...`. */
export async function freepikFetch(
  path: string,
  init: RequestInit & { logCtx?: FreepikLogContext } = {},
): Promise<{ status: number; body: any; rawText: string }> {
  if (KEYS.length === 0) throw new Error("FREEPIK_API_KEY not configured");

  const url = path.startsWith("http") ? path : `${FREEPIK_BASE}${path}`;
  const { logCtx, ...rest } = init;
  let lastResp: { status: number; body: any; rawText: string } | null = null;

  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const key = pickKey();
    if (!key) throw new Error("All Freepik API keys are in cooldown");

    const headers = new Headers(rest.headers || {});
    headers.set("x-freepik-api-key", key);
    if (rest.body && !headers.has("Content-Type") && !(rest.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
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

    // Log async (don't await — fire and forget)
    if (logCtx) {
      const reqBodySafe = typeof rest.body === "string"
        ? safeParse(rest.body) : null;
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

    return { status, body, rawText };
  }

  return lastResp ?? { status: 503, body: { error: "no key available" }, rawText: "" };
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return { raw: s.slice(0, 4000) }; } }
