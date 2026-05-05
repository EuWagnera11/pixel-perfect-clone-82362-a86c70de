// GET /imageedit-status?generation_id=...
// Endpoint compartilhado de polling de TODAS as 11 ferramentas novas.
// - Se status local for terminal (COMPLETED/FAILED) → devolve direto.
// - Senão consulta a Freepik via task_id, baixa resultado, salva no Storage,
//   atualiza tabela e devolve URL final.
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, requireUserId } from "../_shared/gates.ts";
import { magnificFetch } from "../_shared/magnific.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use GET." } }, 405);

  const userId = await requireUserId(req);
  if (userId instanceof Response) return userId;

  const url = new URL(req.url);
  const generationId = url.searchParams.get("generation_id");
  if (!generationId) {
    return json({ error: { code: "MISSING_INPUT", message: "generation_id obrigatório." } }, 400);
  }

  const sb = adminClient();
  const { data: gen, error } = await sb
    .from("imageedit_generations")
    .select("*")
    .eq("generation_id", generationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !gen) {
    return json({ error: { code: "NOT_FOUND", message: "Geração não encontrada." } }, 404);
  }

  if (gen.status === "COMPLETED" || gen.status === "FAILED") {
    return json({
      generation_id: gen.generation_id,
      status: gen.status,
      output_url: gen.output_url,
      error: gen.error_message,
      tool: gen.tool,
      model: gen.model,
    });
  }

  if (!gen.task_id) {
    return json({ generation_id: gen.generation_id, status: gen.status });
  }

  // ─── Consulta Freepik ───
  const taskUrl = `${FREEPIK_BASE}/v1/ai/tasks/${gen.task_id}`;
  let fpRes: Response;
  try {
    fpRes = await fetch(taskUrl, {
      headers: { "x-freepik-api-key": FREEPIK_KEY, "Accept": "application/json" },
    });
  } catch {
    return json({ generation_id: gen.generation_id, status: gen.status });
  }

  if (!fpRes.ok) {
    return json({ generation_id: gen.generation_id, status: gen.status });
  }
  const body: any = await fpRes.json();
  const data = body?.data || body;
  const fpStatus = (data.status || "").toUpperCase();

  // Mapeia Freepik → nosso status
  if (fpStatus === "FAILED" || fpStatus === "ERROR") {
    await sb.from("imageedit_generations").update({
      status: "FAILED",
      error_message: data?.error || "Falha na Freepik.",
      completed_at: new Date().toISOString(),
    }).eq("generation_id", generationId);
    return json({ generation_id: generationId, status: "FAILED", error: data?.error });
  }

  if (fpStatus !== "COMPLETED" && fpStatus !== "DONE" && fpStatus !== "SUCCESS") {
    return json({ generation_id: generationId, status: "IN_PROGRESS" });
  }

  // ─── COMPLETED: extrai URL, baixa, salva no Storage ───
  const cdnUrl: string | undefined =
    data?.generated?.[0] || data?.images?.[0]?.url || data?.image?.url || data?.url;
  if (!cdnUrl) {
    await sb.from("imageedit_generations").update({
      status: "FAILED", error_message: "Resposta sem URL de imagem.",
      completed_at: new Date().toISOString(),
    }).eq("generation_id", generationId);
    return json({ generation_id: generationId, status: "FAILED", error: "Sem URL." });
  }

  let outputUrl = cdnUrl;
  try {
    const imgRes = await fetch(cdnUrl);
    if (imgRes.ok) {
      let bytes = new Uint8Array(await imgRes.arrayBuffer());
      // Aplica watermark server-side em tools sensíveis (face-swap / cloth-swap)
      if (gen.metadata?.watermark === true) {
        try {
          const { applyWatermark } = await import("../_shared/watermark.ts");
          bytes = await applyWatermark(bytes);
        } catch (e) {
          console.warn("[imageedit-status] watermark failed:", e);
        }
      }
      const path = `${userId}/${gen.tool}/${generationId}/output.png`;
      const up = await sb.storage.from("imageedit-outputs")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (!up.error) {
        const { data: pub } = sb.storage.from("imageedit-outputs").getPublicUrl(path);
        outputUrl = pub.publicUrl;
      }
    }
  } catch (e) {
    console.warn("[imageedit-status] storage upload failed:", e);
  }

  await sb.from("imageedit_generations").update({
    status: "COMPLETED",
    output_url: outputUrl,
    completed_at: new Date().toISOString(),
  }).eq("generation_id", generationId);

  return json({ generation_id: generationId, status: "COMPLETED", output_url: outputUrl });
});
