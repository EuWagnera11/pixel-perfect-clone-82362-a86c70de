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

// Endpoints que exigem aspect no formato magnific (square_1_1, ...)
const MAGNIFIC_ASPECT_ENDPOINTS = [
  "/v1/ai/text-to-image/nano-banana-pro",
  "/v1/ai/text-to-image/nano-banana-pro-flash",
  "/v1/ai/text-to-image/seedream-v4",
  "/v1/ai/text-to-image/seedream-v4-edit",
  "/v1/ai/mystic",
  "/v1/ai/text-to-image/imagen4-ultra",
  "/v1/ai/text-to-image/imagen4-fast",
];

export type StartImageEditArgs = {
  req: Request;
  tool: string;            // "remove-bg" | "realistic-3d" | "colorize" | ...
  model: string;           // id do modelo Freepik
  endpoint: string;        // path Freepik
  body: Record<string, unknown>;
  inputUrls: string[];
  metadata?: Record<string, unknown>;
  requireTos?: boolean;
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
  const { data: gen, error: insErr } = await sb
    .from("imageedit_generations")
    .insert({
      user_id: userId,
      tool: args.tool,
      model: args.model,
      status: "PENDING",
      input_urls: args.inputUrls,
      metadata: args.metadata ?? {},
    })
    .select()
    .single();

  if (insErr || !gen) {
    return json({ error: { code: "DB_ERROR", message: insErr?.message || "Falha ao criar geração." } }, 500);
  }

  // Normaliza aspect_ratio pro formato esperado pelo endpoint
  const reqBody: Record<string, unknown> = { ...args.body };
  if (typeof reqBody.aspect_ratio === "string" && /^\d+:\d+$/.test(reqBody.aspect_ratio as string)) {
    if (MAGNIFIC_ASPECT_ENDPOINTS.includes(args.endpoint)) {
      reqBody.aspect_ratio = toMagnificAspect(reqBody.aspect_ratio as string);
    }
  }

  const fp = await freepikFetch(args.endpoint, {
    method: "POST",
    body: JSON.stringify(reqBody),
    logCtx: { userId, generationId: gen.generation_id, endpointKey: args.endpoint },
  });

  if (fp.status >= 400 || !fp.body) {
    const msg = `Freepik ${fp.status}: ${typeof fp.body === "string" ? fp.body : JSON.stringify(fp.body).slice(0, 400)}`;
    await sb.from("imageedit_generations").update({
      status: "FAILED", error_message: msg, completed_at: new Date().toISOString(),
    }).eq("generation_id", gen.generation_id);
    return json({
      error: { code: "FREEPIK_ERROR", message: msg },
      generation_id: gen.generation_id,
    }, 502);
  }

  const taskId = extractTaskId(fp.body);
  if (!taskId) {
    await sb.from("imageedit_generations").update({
      status: "FAILED", error_message: "Sem task_id na resposta Freepik.",
      completed_at: new Date().toISOString(),
      metadata: { ...(args.metadata ?? {}), freepik_response: fp.body },
    }).eq("generation_id", gen.generation_id);
    return json({
      error: { code: "NO_TASK_ID", message: "Freepik não retornou task_id." },
      generation_id: gen.generation_id,
    }, 502);
  }

  await sb.from("imageedit_generations").update({
    status: "IN_PROGRESS", task_id: taskId,
  }).eq("generation_id", gen.generation_id);

  return json({
    generation_id: gen.generation_id,
    task_id: taskId,
    status: "IN_PROGRESS",
    tool: args.tool,
    model: args.model,
  }, 201);
}
