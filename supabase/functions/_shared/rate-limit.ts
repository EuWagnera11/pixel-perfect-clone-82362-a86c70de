// Helper de rate limit ad-hoc baseado em Postgres (tumbling window).
// Uso:
//   const rl = await checkRateLimit(admin, userId, "generate-image", { limit: 10, windowSeconds: 60 });
//   if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
//
// Nota: backend não tem primitivas oficiais de rate limit. Implementação é ad-hoc
// e suficiente para escala média. Para produção pesada, considerar Redis/Upstash.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit?: number;
  count?: number;
  remaining?: number;
  retry_after_seconds?: number;
  error?: string;
};

export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string | null | undefined,
  bucket: string,
  cfg: RateLimitConfig
): Promise<RateLimitResult> {
  if (!userId) return { allowed: false, error: "no_user" };
  try {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_user_id: userId,
      p_bucket: bucket,
      p_limit: cfg.limit,
      p_window_seconds: cfg.windowSeconds,
    });
    if (error) {
      console.warn("[rate-limit] rpc error, fail-open", error.message);
      return { allowed: true };
    }
    return data as RateLimitResult;
  } catch (e) {
    console.warn("[rate-limit] exception, fail-open", e);
    return { allowed: true };
  }
}

export function rateLimitResponse(
  rl: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retry = rl.retry_after_seconds ?? 60;
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: `Muitas requisições. Tente novamente em ${retry}s.`,
      retry_after_seconds: retry,
      limit: rl.limit,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retry),
      },
    }
  );
}
