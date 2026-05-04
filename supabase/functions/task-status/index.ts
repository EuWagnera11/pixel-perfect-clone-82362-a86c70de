// POST /task-status   body: { generation_id }
// Polls Magnific for the saved task_id and updates the row.
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { magnificFetch, extractUrls, normalizeStatus } from "../_shared/magnific.ts";

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

  const retryable = gen.status === "failed" && typeof gen.error_message === "string"
    && /task not found/i.test(gen.error_message);

  if (gen.status === "completed" || (gen.status === "failed" && !retryable)) {
    return json(gen);
  }

  const taskId = gen.metadata?.magnific_task_id ?? gen.metadata?.freepik_task_id;
  const path = gen.metadata?.magnific_path ?? gen.metadata?.freepik_path ?? gen.freepik_endpoint;
  if (!taskId || !path) {
    return json({ ...gen, polling_skipped: true });
  }

  const fp = await magnificFetch(`${path}/${taskId}`, {
    method: "GET",
    logCtx: { userId: auth.userId, generationId, endpointKey: `${path}/:id` },
  });

  const detailMessage =
    typeof fp.body?.message === "string" ? fp.body.message :
    typeof fp.body?.detail?.message === "string" ? fp.body.detail.message : "";

  // Transient: task may take a few seconds before becoming visible
  if (fp.status === 404 && /task not found/i.test(detailMessage)) {
    return json({ ...gen, status: "processing", polling_retryable: true });
  }

  if (fp.status >= 400) {
    await auth.admin.from("generations").update({
      status: "failed",
      error_message: `Magnific status ${fp.status}: ${detailMessage || "Unknown error"}`,
    }).eq("id", generationId);
    return json({ error: "Magnific status error", detail: fp.body }, 502);
  }

  const status = normalizeStatus(fp.body);
  const urls = extractUrls(fp.body);

  const update: Record<string, unknown> = { status };
  if (status === "completed") {
    update.completed_at = new Date().toISOString();
    const isVideo = gen.media_type === "video";
    const isAudio = gen.media_type === "audio";
    const ext = isVideo ? "mp4" : isAudio ? "mp3" : "png";
    const contentType = isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/png";
    const persisted: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      try {
        const r = await fetch(u);
        if (!r.ok) { persisted.push(u); continue; }
        const bytes = new Uint8Array(await r.arrayBuffer());
        const objPath = `${auth.userId}/generations/${generationId}/${i}.${ext}`;
        const up = await auth.admin.storage.from("uploads")
          .upload(objPath, bytes, { contentType, upsert: true });
        if (up.error) { persisted.push(u); continue; }
        const { data: pub } = auth.admin.storage.from("uploads").getPublicUrl(objPath);
        persisted.push(pub.publicUrl);
      } catch {
        persisted.push(u);
      }
    }
    if (isVideo || isAudio) update.video_urls = persisted;
    else update.image_urls = persisted;
  }
  if (status === "failed") {
    const d = fp.body?.data ?? {};
    const reason =
      d.error?.message ?? d.error ?? d.failure_reason ?? d.reason ?? d.message ??
      detailMessage ??
      "Geração rejeitada pelo provedor (possível filtro de conteúdo, marca registrada ou prompt inválido).";
    update.error_message = typeof reason === "string" ? reason : JSON.stringify(reason);
    update.completed_at = new Date().toISOString();
  }
  await auth.admin.from("generations").update(update).eq("id", generationId);

  const { data: fresh } = await auth.admin
    .from("generations")
    .select("id,status,prompt,image_urls,video_urls,credits_used,media_type,error_message,created_at,completed_at,model,tool")
    .eq("id", generationId)
    .single();

  return json(fresh);
});
