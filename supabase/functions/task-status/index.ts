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
    typeof fp.body?.detail === "string" ? fp.body.detail :
    typeof fp.body?.detail?.message === "string" ? fp.body.detail.message :
    typeof fp.body?.detail?.detail === "string" ? fp.body.detail.detail : "";

  // Transient: task may take a few seconds before becoming visible
  if (fp.status === 404 && /task not found/i.test(detailMessage)) {
    return json({ ...gen, status: "processing", polling_retryable: true });
  }

  if (fp.status >= 400) {
    const errMsg = `Magnific status ${fp.status}: ${detailMessage || "Unknown error"}`;
    await auth.admin.from("generations").update({
      status: "failed",
      error_message: errMsg,
      completed_at: new Date().toISOString(),
    }).eq("id", generationId);
    // Return 200 with failed row so frontend handles gracefully (no blank screen).
    return json({ ...gen, status: "failed", error_message: errMsg });
  }

  const status = normalizeStatus(fp.body);
  const urls = extractUrls(fp.body);

  // Tenta persistir 1 URL no storage permanente. NUNCA salva URL do CDN expirável.
  async function persistOne(u: string, i: number, ext: string, ct: string): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(u);
        if (!r.ok) {
          await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
          continue;
        }
        const bytes = new Uint8Array(await r.arrayBuffer());
        if (bytes.byteLength === 0) {
          await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
          continue;
        }
        const objPath = `${auth.userId}/generations/${generationId}/${i}.${ext}`;
        const up = await auth.admin.storage.from("uploads")
          .upload(objPath, bytes, { contentType: ct, upsert: true });
        if (up.error) {
          await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
          continue;
        }
        const { data: pub } = auth.admin.storage.from("uploads").getPublicUrl(objPath);
        return pub.publicUrl;
      } catch {
        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
      }
    }
    return null;
  }

  const update: Record<string, unknown> = { status };
  if (status === "completed") {
    update.completed_at = new Date().toISOString();
    const isVideo = gen.media_type === "video";
    const isAudio = gen.media_type === "audio";
    const ext = isVideo ? "mp4" : isAudio ? "mp3" : "png";
    const contentType = isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/png";

    const persisted: string[] = [];
    let failedAt: number | null = null;
    for (let i = 0; i < urls.length; i++) {
      const out = await persistOne(urls[i], i, ext, contentType);
      if (!out) { failedAt = i; break; }
      persisted.push(out);
    }

    if (failedAt !== null) {
      // Garantia de durabilidade: jamais expor URL expirável.
      update.status = "failed";
      update.error_message = `Falha ao persistir mídia ${failedAt + 1}/${urls.length} no storage permanente.`;
    } else if (isVideo || isAudio) {
      update.video_urls = persisted;
    } else {
      update.image_urls = persisted;
    }
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
