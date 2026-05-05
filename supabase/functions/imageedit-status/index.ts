// GET /imageedit-status?generation_id=...
// Endpoint compartilhado de polling de TODAS as 11 ferramentas novas.
// - Se status local for terminal (COMPLETED/FAILED) → devolve direto.
// - Senão consulta a Freepik via task_id, baixa resultado, salva no Storage,
//   atualiza tabela e devolve URL final.
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, requireUserId } from "../_shared/gates.ts";
import { magnificFetch } from "../_shared/magnific.ts";
import { freepikFetch } from "../_shared/freepik.ts";
import { urlToRefObject } from "../_shared/engines.ts";

const REPLACE_BG_TIMEOUT_MS: Record<string, number> = {
  "nano-banana-pro-flash": 5 * 60_000,
  "nano-banana-pro": 10 * 60_000,
};

const REPLACE_BG_FALLBACK_MODEL: Record<string, string | undefined> = {
  "nano-banana-pro-flash": "nano-banana-pro",
};

function extractTaskId(body: any): string | null {
  return body?.data?.task_id ?? body?.task_id ?? body?.data?.id ?? body?.id ?? null;
}

function extractOutputUrl(body: any): string | undefined {
  const data = body?.data ?? body ?? {};
  return data?.generated?.[0] || data?.images?.[0]?.url || data?.image?.url || data?.url;
}

function buildReplaceBgPrompt(userPrompt: string) {
  return (
    `Replace the background of the reference image with: ${userPrompt}. ` +
    `Keep the main subject perfectly intact — same pose, lighting on the subject, color, edges and proportions. ` +
    `Match the new background lighting to the subject realistically.`
  );
}

function isRecoverableReplaceBgTimeout(gen: any) {
  return gen.tool === "replace-bg" && /demorou demais no provedor|expirou neste modelo/i.test(gen.error_message || "");
}

async function retryReplaceBgGeneration(sb: ReturnType<typeof adminClient>, userId: string, gen: any) {
  const imageUrl = Array.isArray(gen.input_urls) ? gen.input_urls[0] : null;
  const userPrompt = (gen.metadata as any)?.user_prompt;
  if (!imageUrl || !userPrompt) return null;

  const triedModels = Array.isArray((gen.metadata as any)?.replace_bg_tried_models)
    ? (gen.metadata as any).replace_bg_tried_models.filter((value: unknown): value is string => typeof value === "string")
    : [];
  const seen = new Set<string>([...triedModels, gen.model].filter(Boolean));
  const preferredModel = REPLACE_BG_FALLBACK_MODEL[gen.model];
  const nextModel = preferredModel && !seen.has(preferredModel) ? preferredModel : null;
  if (!nextModel) return null;

  const referenceImage = await urlToRefObject(imageUrl);
  const fp = await freepikFetch(`/v1/ai/text-to-image/${nextModel}`, {
    method: "POST",
    body: JSON.stringify({
      prompt: buildReplaceBgPrompt(userPrompt),
      reference_images: [referenceImage],
      aspect_ratio: (gen.metadata as any)?.aspect_ratio || "1:1",
    }),
    logCtx: {
      userId,
      generationId: gen.generation_id,
      endpointKey: `/v1/ai/text-to-image/${nextModel}`,
    },
  });

  if (fp.status >= 400 || !fp.body) {
    return {
      kind: "error",
      message: `Freepik ${fp.status}: ${typeof fp.body === "string" ? fp.body : JSON.stringify(fp.body).slice(0, 400)}`,
    } as const;
  }

  const taskId = extractTaskId(fp.body);
  const outputUrl = extractOutputUrl(fp.body);
  const nextMetadata = {
    ...(gen.metadata || {}),
    replace_bg_tried_models: [...seen, nextModel],
    replace_bg_last_retry_at: new Date().toISOString(),
    freepik_endpoint: `/v1/ai/text-to-image/${nextModel}`,
  };

  if (outputUrl) {
    await sb.from("imageedit_generations").update({
      status: "COMPLETED",
      model: nextModel,
      output_url: outputUrl,
      error_message: null,
      completed_at: new Date().toISOString(),
      metadata: nextMetadata,
    }).eq("generation_id", gen.generation_id);
    return { kind: "completed", outputUrl, model: nextModel } as const;
  }

  if (!taskId) {
    return { kind: "error", message: "Provedor não retornou task_id no retry." } as const;
  }

  await sb.from("imageedit_generations").update({
    status: "IN_PROGRESS",
    model: nextModel,
    task_id: taskId,
    error_message: null,
    completed_at: null,
    metadata: nextMetadata,
  }).eq("generation_id", gen.generation_id);

  return { kind: "restarted", taskId, model: nextModel } as const;
}

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

  if (gen.status === "COMPLETED") {
    return json({
      generation_id: gen.generation_id,
      status: gen.status,
      output_url: gen.output_url,
      error: gen.error_message,
      tool: gen.tool,
      model: gen.model,
    });
  }

  if (gen.status === "FAILED" && !isRecoverableReplaceBgTimeout(gen)) {
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
    if (isRecoverableReplaceBgTimeout(gen)) {
      try {
        const retried = await retryReplaceBgGeneration(sb, userId, gen);
        if (retried?.kind === "completed") {
          return json({ generation_id: gen.generation_id, status: "COMPLETED", output_url: retried.outputUrl, model: retried.model });
        }
        if (retried?.kind === "restarted") {
          return json({ generation_id: gen.generation_id, status: "IN_PROGRESS", model: retried.model });
        }
        if (retried?.kind === "error") {
          await sb.from("imageedit_generations").update({
            status: "FAILED",
            error_message: retried.message,
            completed_at: new Date().toISOString(),
          }).eq("generation_id", gen.generation_id);
          return json({ generation_id: gen.generation_id, status: "FAILED", error: retried.message });
        }
      } catch (e) {
        const errorMessage = (e as Error).message || "Falha ao retentar a troca de fundo.";
        await sb.from("imageedit_generations").update({
          status: "FAILED",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        }).eq("generation_id", gen.generation_id);
        return json({ generation_id: gen.generation_id, status: "FAILED", error: errorMessage });
      }
    }
    return json({ generation_id: gen.generation_id, status: gen.status });
  }

  // ─── Consulta Freepik (com rotação de chave) ───
  // Usa o endpoint específico do modelo quando conhecido, com fallback genérico.
  const endpointPath = (gen.metadata as any)?.freepik_endpoint;
  const candidates: string[] = [];
  if (endpointPath) candidates.push(`${endpointPath}/${gen.task_id}`);
  candidates.push(`/v1/ai/tasks/${gen.task_id}`);

  let body: any = null;
  let okStatus = 0;
  for (const p of candidates) {
    const fp = await magnificFetch(p, {
      method: "GET",
      logCtx: { userId, generationId, endpointKey: p.replace(gen.task_id, ":id") },
    });
    if (fp.status >= 200 && fp.status < 300 && fp.body) {
      body = fp.body;
      okStatus = fp.status;
      break;
    }
  }
  if (!body) {
    return json({ generation_id: gen.generation_id, status: gen.status });
  }
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
    const createdAtMs = gen.created_at ? new Date(gen.created_at).getTime() : Date.now();
    const ageMs = Date.now() - createdAtMs;

    // Timeouts por modelo para replace-bg (Freepik às vezes trava o task indefinidamente)
    let timeoutMs = 0;
    if (gen.tool === "replace-bg") {
      timeoutMs = REPLACE_BG_TIMEOUT_MS[gen.model] ?? 0;
    }

    if (timeoutMs > 0 && ageMs > timeoutMs) {
      const errorMessage = "A troca de fundo demorou demais no provedor. Trocando automaticamente para um modelo mais estável.";
      await sb.from("imageedit_generations").update({
        status: "FAILED",
        task_id: null,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      }).eq("generation_id", generationId);

      const timedOutGen = {
        ...gen,
        status: "FAILED",
        task_id: null,
        error_message: errorMessage,
      };

      try {
        const retried = await retryReplaceBgGeneration(sb, userId, timedOutGen);
        if (retried?.kind === "completed") {
          return json({ generation_id: generationId, status: "COMPLETED", output_url: retried.outputUrl, model: retried.model });
        }
        if (retried?.kind === "restarted") {
          return json({ generation_id: generationId, status: "IN_PROGRESS", model: retried.model });
        }
        if (retried?.kind === "error") {
          await sb.from("imageedit_generations").update({
            status: "FAILED",
            error_message: retried.message,
            completed_at: new Date().toISOString(),
          }).eq("generation_id", generationId);
          return json({ generation_id: generationId, status: "FAILED", error: retried.message });
        }
      } catch (e) {
        const retryError = (e as Error).message || errorMessage;
        await sb.from("imageedit_generations").update({
          status: "FAILED",
          error_message: retryError,
          completed_at: new Date().toISOString(),
        }).eq("generation_id", generationId);
        return json({ generation_id: generationId, status: "FAILED", error: retryError });
      }

      return json({ generation_id: generationId, status: "FAILED", error: errorMessage });
    }

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

  // ─── Assets-gen pipeline 2-passos: dispara remove-background na etapa 1 ───
  const meta = (gen.metadata || {}) as any;
  if (gen.tool === "assets-gen" && meta.pipeline_step === "generation" && meta.background === "transparente") {
    try {
      // Salva intermediário (output-step1) para referência
      try {
        const r1 = await fetch(cdnUrl);
        if (r1.ok) {
          const b1 = new Uint8Array(await r1.arrayBuffer());
          await sb.storage.from("imageedit-outputs")
            .upload(`${userId}/${gen.tool}/${generationId}/output-step1.png`, b1, { contentType: "image/png", upsert: true });
        }
      } catch { /* ignore intermediate */ }

      // Dispara remove-bg via FormData (mesmo padrão do imageedit-remove-bg)
      const form = new FormData();
      form.append("image_url", cdnUrl);
      const fpRb = await freepikFetch("/v1/ai/beta/remove-background", {
        method: "POST",
        body: form,
        logCtx: { userId, generationId, endpointKey: "/v1/ai/beta/remove-background" },
      });

      if (fpRb.status >= 400 || !fpRb.body) {
        const msg = `Remove-bg falhou: ${typeof fpRb.body === "string" ? fpRb.body : JSON.stringify(fpRb.body).slice(0, 300)}`;
        await sb.from("imageedit_generations").update({
          status: "PARTIAL_COMPLETED",
          output_url: cdnUrl,
          error_message: msg,
          completed_at: new Date().toISOString(),
          metadata: { ...meta, pipeline_step: "failed_remove_bg", freepik_endpoint: "/v1/ai/beta/remove-background" },
        }).eq("generation_id", generationId);
        return json({
          generation_id: generationId,
          status: "PARTIAL_COMPLETED",
          output_url: cdnUrl,
          warning: "Remoção de fundo falhou. Você pode baixar a versão com fundo branco e remover manualmente.",
        });
      }

      const d = fpRb.body?.data ?? fpRb.body ?? {};
      const syncUrl: string | undefined =
        d.high_resolution || d.url || d.original || d.preview ||
        (Array.isArray(d.images) ? (d.images[0]?.url ?? d.images[0]) : undefined);
      const rbTaskId = d.task_id ?? d.id ?? null;

      // remove-bg costuma ser síncrono → finaliza imediatamente
      if (syncUrl) {
        let finalUrl = syncUrl;
        try {
          const r2 = await fetch(syncUrl);
          if (r2.ok) {
            const b2 = new Uint8Array(await r2.arrayBuffer());
            const path = `${userId}/${gen.tool}/${generationId}/output.png`;
            const up = await sb.storage.from("imageedit-outputs")
              .upload(path, b2, { contentType: "image/png", upsert: true });
            if (!up.error) {
              const { data: pub } = sb.storage.from("imageedit-outputs").getPublicUrl(path);
              finalUrl = pub.publicUrl;
            }
          }
        } catch { /* ignore */ }
        await sb.from("imageedit_generations").update({
          status: "COMPLETED",
          output_url: finalUrl,
          error_message: null,
          completed_at: new Date().toISOString(),
          metadata: { ...meta, pipeline_step: "done", freepik_endpoint: "/v1/ai/beta/remove-background" },
        }).eq("generation_id", generationId);
        return json({ generation_id: generationId, status: "COMPLETED", output_url: finalUrl });
      }

      if (rbTaskId) {
        await sb.from("imageedit_generations").update({
          status: "IN_PROGRESS",
          task_id: rbTaskId,
          metadata: { ...meta, pipeline_step: "remove_bg", remove_bg_task_id: rbTaskId, freepik_endpoint: "/v1/ai/beta/remove-background", step1_url: cdnUrl },
        }).eq("generation_id", generationId);
        return json({ generation_id: generationId, status: "IN_PROGRESS" });
      }

      // Fallback: sem URL nem task → trata como parcial
      await sb.from("imageedit_generations").update({
        status: "PARTIAL_COMPLETED",
        output_url: cdnUrl,
        error_message: "Remove-bg não retornou URL nem task.",
        completed_at: new Date().toISOString(),
        metadata: { ...meta, pipeline_step: "failed_remove_bg" },
      }).eq("generation_id", generationId);
      return json({ generation_id: generationId, status: "PARTIAL_COMPLETED", output_url: cdnUrl });
    } catch (e) {
      const msg = (e as Error).message || "Falha ao iniciar remove-bg.";
      await sb.from("imageedit_generations").update({
        status: "PARTIAL_COMPLETED",
        output_url: cdnUrl,
        error_message: msg,
        completed_at: new Date().toISOString(),
        metadata: { ...meta, pipeline_step: "failed_remove_bg" },
      }).eq("generation_id", generationId);
      return json({ generation_id: generationId, status: "PARTIAL_COMPLETED", output_url: cdnUrl, warning: msg });
    }
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

  // Marca pipeline como done se for assets-gen finalizando etapa 2
  const finalMeta = gen.tool === "assets-gen" && meta.pipeline_step === "remove_bg"
    ? { ...meta, pipeline_step: "done" }
    : undefined;

  await sb.from("imageedit_generations").update({
    status: "COMPLETED",
    output_url: outputUrl,
    error_message: null,
    completed_at: new Date().toISOString(),
    ...(finalMeta ? { metadata: finalMeta } : {}),
  }).eq("generation_id", generationId);

  return json({ generation_id: generationId, status: "COMPLETED", output_url: outputUrl });
});
