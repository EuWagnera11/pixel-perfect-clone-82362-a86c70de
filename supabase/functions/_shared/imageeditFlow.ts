/**
 * Fluxo compartilhado das ferramentas em `imageedit_generations`.
 * - Roda gates (auth + rate-limit + opcional ToS)
 * - Insere row PENDING
 * - Chama Freepik via freepikFetch (com rotação de chave + log)
 * - Salva task_id e retorna { generation_id, task_id, status }
 *
 * Polling fica em `imageedit-status`.
 */
import { json } from "./cors.ts";
import { adminClient, requireUserId, checkRateLimit, checkTosAccepted } from "./gates.ts";
import { freepikFetch } from "./freepik.ts";
import { toMagnificAspect } from "./engines.ts";
import { calculateCost, debitCredits, refundCredits } from "./credits.ts";

// Endpoints que exigem aspect no formato magnific (square_1_1, ...).
// Mantemos o mapeamento apenas para motores que realmente aceitam esses tokens.
const MAGNIFIC_ASPECT_ENDPOINT_TO_ENGINE: Record<string, string> = {
  "/v1/ai/text-to-image/flux-kontext-pro": "flux-kontext-pro",
  "/v1/ai/text-to-image/flux-2-klein": "flux-2-klein",
  "/v1/ai/text-to-image/flux-dev": "flux-dev",
  "/v1/ai/text-to-image/hyperflux": "hyperflux",
  "/v1/ai/text-to-image/seedream-v4": "seedream-v4",
  "/v1/ai/text-to-image/seedream-v4-edit": "seedream-v4-edit",
  "/v1/ai/text-to-image/seedream-v4-5": "seedream-v4-5",
  "/v1/ai/text-to-image/seedream-v4-5-edit": "seedream-v4-5-edit",
  "/v1/ai/text-to-image/seedream-v5-lite": "seedream-v5-lite",
  "/v1/ai/text-to-image/seedream-v5-lite-edit": "seedream-v5-lite-edit",
  "/v1/ai/mystic": "mystic",
  "/v1/ai/text-to-image/imagen4-ultra": "imagen4-ultra",
  "/v1/ai/text-to-image/imagen4-fast": "imagen4-fast",
};

export type StartImageEditArgs = {
  req: Request;
  tool: string;            // "remove-bg" | "realistic-3d" | "colorize" | ...
  model: string;           // id do modelo Freepik
  endpoint: string;        // path Freepik
  body: Record<string, unknown>;
  inputUrls: string[];
  metadata?: Record<string, unknown>;
  requireTos?: boolean;
  aspectStyle?: "auto" | "freepik" | "magnific";
};

function extractTaskId(body: any): string | null {
  return (
    body?.data?.task_id ??
    body?.task_id ??
    body?.data?.id ??
    body?.id ??
    null
  );
}

export async function startImageEditJob(args: StartImageEditArgs): Promise<Response> {
  const userId = await requireUserId(args.req);
  if (userId instanceof Response) return userId;

  const rl = await checkRateLimit(userId);
  if (rl !== true) return rl;

  if (args.requireTos) {
    const tos = await checkTosAccepted(userId, args.tool);
    if (tos !== true) return tos;
  }

  const sb = adminClient();

  // Cost calc + atomic debit
  const cost = calculateCost(args.model, {});
  const { data: gen, error: insErr } = await sb
    .from("imageedit_generations")
    .insert({
      user_id: userId,
      tool: args.tool,
      model: args.model,
      status: "PENDING",
      input_urls: args.inputUrls,
      metadata: { ...(args.metadata ?? {}), credits_used: cost },
    })
    .select()
    .single();

  if (insErr || !gen) {
    return json({ error: { code: "DB_ERROR", message: insErr?.message || "Falha ao criar geração." } }, 500);
  }

  if (cost > 0) {
    const debit = await debitCredits(userId, cost, `${args.tool} · ${args.model}`, gen.generation_id);
    if (!debit.ok) {
      await sb.from("imageedit_generations").update({
        status: "FAILED", error_message: debit.message, completed_at: new Date().toISOString(),
      }).eq("generation_id", gen.generation_id);
      return json({
        error: { code: debit.code, message: debit.message, balance: debit.balance, required: cost },
        generation_id: gen.generation_id,
      }, debit.status);
    }
  }

  // Normaliza aspect_ratio pro formato esperado pelo endpoint
  const reqBody: Record<string, unknown> = { ...args.body };
  const shouldNormalizeAspect = (args.aspectStyle ?? "auto") !== "freepik";
  if (shouldNormalizeAspect && typeof reqBody.aspect_ratio === "string" && /^\d+:\d+$/.test(reqBody.aspect_ratio as string)) {
    const engineId = MAGNIFIC_ASPECT_ENDPOINT_TO_ENGINE[args.endpoint];
    if (engineId) {
      reqBody.aspect_ratio = toMagnificAspect(reqBody.aspect_ratio as string, engineId);
    }
  }

  const isRemoveBg = args.endpoint === "/v1/ai/beta/remove-background";
  let requestInit: RequestInit;
  if (isRemoveBg) {
    const form = new FormData();
    for (const [key, value] of Object.entries(reqBody)) {
      if (value !== undefined && value !== null) form.append(key, String(value));
    }
    requestInit = {
      method: "POST",
      body: form,
    };
  } else {
    requestInit = {
      method: "POST",
      body: JSON.stringify(reqBody),
    };
  }

  const fp = await freepikFetch(args.endpoint, {
    ...requestInit,
    logCtx: { userId, generationId: gen.generation_id, endpointKey: args.endpoint },
  });

  if (fp.status >= 400 || !fp.body) {
    const msg = `Freepik ${fp.status}: ${typeof fp.body === "string" ? fp.body : JSON.stringify(fp.body).slice(0, 400)}`;
    await sb.from("imageedit_generations").update({
      status: "FAILED", error_message: msg, completed_at: new Date().toISOString(),
    }).eq("generation_id", gen.generation_id);
    if (cost > 0) await refundCredits(userId, cost, "Freepik error: " + msg.slice(0, 120), gen.generation_id);
    return json({
      error: { code: "FREEPIK_ERROR", message: msg },
      generation_id: gen.generation_id,
    }, 502);
  }

  const taskId = extractTaskId(fp.body);
  if (!taskId) {
    if (isRemoveBg) {
      const d = fp.body?.data ?? fp.body ?? {};
      const syncUrl: string | undefined =
        d.high_resolution || d.url || d.original || d.preview ||
        (Array.isArray(d.images) ? (d.images[0]?.url ?? d.images[0]) : undefined);

      if (syncUrl) {
        await sb.from("imageedit_generations").update({
          status: "COMPLETED",
          output_url: syncUrl,
          completed_at: new Date().toISOString(),
          metadata: {
            ...(args.metadata ?? {}),
            freepik_endpoint: args.endpoint,
            freepik_response: fp.body,
          },
        }).eq("generation_id", gen.generation_id);

        return json({
          generation_id: gen.generation_id,
          status: "COMPLETED",
          output_url: syncUrl,
          tool: args.tool,
          model: args.model,
        }, 200);
      }
    }

    await sb.from("imageedit_generations").update({
      status: "FAILED", error_message: "Sem task_id na resposta Freepik.",
      completed_at: new Date().toISOString(),
      metadata: { ...(args.metadata ?? {}), freepik_response: fp.body, freepik_endpoint: args.endpoint },
    }).eq("generation_id", gen.generation_id);
    return json({
      error: { code: "NO_TASK_ID", message: "Freepik não retornou task_id." },
      generation_id: gen.generation_id,
    }, 502);
  }

  await sb.from("imageedit_generations").update({
    status: "IN_PROGRESS", task_id: taskId,
    metadata: { ...(args.metadata ?? {}), freepik_endpoint: args.endpoint },
  }).eq("generation_id", gen.generation_id);

  return json({
    generation_id: gen.generation_id,
    task_id: taskId,
    status: "IN_PROGRESS",
    tool: args.tool,
    model: args.model,
  }, 201);
}
