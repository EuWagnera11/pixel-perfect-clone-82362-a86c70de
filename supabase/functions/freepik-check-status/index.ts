// Polls Freepik for task status of a generation, updates the row when done.
// Called by the client every few seconds (it just calls GET /generations/:id which
// internally pokes this if metadata.freepik_task_id is set).
//
// Direct endpoint: POST /freepik-check-status  body: { generation_id }
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { freepikFetch } from "../_shared/freepik.ts";
import { extractUrls, normalizeStatus } from "../_shared/tool_registry.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const generationId = body?.generation_id;
  if (!generationId) return json({ error: "generation_id required" }, 400);

  const { data: gen, error } = await auth.admin
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (error) return json({ error: "DB error", detail: error.message }, 500);
  if (!gen) return json({ error: "Not found" }, 404);

  const retryableFailure = gen.status === "failed"
    && typeof gen.error_message === "string"
    && (/task not found/i.test(gen.error_message) || /freepik status 404/i.test(gen.error_message));

  // Already settled — return as is
  if (gen.status === "completed" || (gen.status === "failed" && !retryableFailure)) {
    return json(gen);
  }

  const taskId = gen.metadata?.freepik_task_id;
  const path = gen.metadata?.freepik_path || gen.freepik_endpoint;
  if (!taskId || !path) {
    return json({ ...gen, polling_skipped: true });
  }

  const fp = await freepikFetch(`${path}/${taskId}`, {
    method: "GET",
    logCtx: { userId: auth.userId, generationId, endpointKey: `${path}/:id` },
  });

  const detailMessage = typeof fp.body?.message === "string"
    ? fp.body.message
    : typeof fp.body?.detail?.message === "string"
    ? fp.body.detail.message
    : "";

  if (fp.status === 404 && /task not found/i.test(detailMessage)) {
    if (gen.status === "failed") {
      await auth.admin.from("generations").update({
        status: "processing",
        error_message: null,
      }).eq("id", generationId);
    }

    return json({
      ...gen,
      status: "processing",
      error_message: null,
      polling_retryable: true,
      polling_message: "Generation task is not visible yet. Retry polling shortly.",
    });
  }

  if (fp.status >= 400) {
    await auth.admin.from("generations").update({
      status: "failed",
      error_message: `Freepik status ${fp.status}: ${detailMessage || "Unknown error"}`,
    }).eq("id", generationId);
    return json({ error: "Freepik status error", detail: fp.body }, 502);
  }

  const status = normalizeStatus(fp.body);
  const urls = extractUrls(fp.body);

  const update: Record<string, unknown> = { status };
  if (status === "completed") {
    update.completed_at = new Date().toISOString();
    if (gen.media_type === "video") update.video_urls = urls;
    else update.image_urls = urls;
  }

  await auth.admin.from("generations").update(update).eq("id", generationId);

  const { data: fresh } = await auth.admin
    .from("generations")
    .select("id,status,prompt,image_urls,video_urls,credits_used,media_type,error_message,created_at,completed_at")
    .eq("id", generationId)
    .single();

  return json(fresh);
});
