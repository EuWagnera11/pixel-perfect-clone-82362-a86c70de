// GET /generations?limit=30 — list user's generations
// GET /generations/:id     — single
// DELETE /generations/:id  — remove
// POST /generations        — alias of /generate-image (backward compat)
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { startGeneration } from "../_shared/generation-flow.ts";
import { requiresReferenceImage, resolveImageEngine } from "../_shared/engines.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const segs = url.pathname.split("/").filter(Boolean);
  const id = segs[1];

  if (req.method === "GET" && !id) {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
    const [genRes, editRes] = await Promise.all([
      auth.admin
        .from("generations")
        .select("id,status,prompt,image_urls,video_urls,credits_used,media_type,error_message,created_at,completed_at,model,tool")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      auth.admin
        .from("imageedit_generations")
        .select("generation_id,status,output_url,error_message,created_at,completed_at,model,tool,metadata")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);
    if (genRes.error) return json({ error: "DB error", detail: genRes.error.message }, 500);

    const editRows = (editRes.data || []).map((r: any) => ({
      id: r.generation_id,
      status: r.status === "COMPLETED" ? "completed" : r.status === "FAILED" ? "failed" : "processing",
      prompt: r.metadata?.user_prompt || "",
      image_urls: r.output_url ? [r.output_url] : [],
      video_urls: [],
      credits_used: 0,
      media_type: "image",
      error_message: r.error_message,
      created_at: r.created_at,
      completed_at: r.completed_at,
      model: r.model,
      tool: r.tool,
    }));

    const merged = [...(genRes.data || []), ...editRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
    return json(merged);
  }

  if (req.method === "GET" && id) {
    const { data, error } = await auth.admin
      .from("generations")
      .select("*")
      .eq("id", id).eq("user_id", auth.userId).maybeSingle();
    if (error) return json({ error: "DB error", detail: error.message }, 500);
    if (!data) return json({ error: "Not found" }, 404);
    return json(data);
  }

  if (req.method === "DELETE" && id) {
    const { error } = await auth.admin
      .from("generations").delete()
      .eq("id", id).eq("user_id", auth.userId);
    if (error) return json({ error: "DB error", detail: error.message }, 500);
    return json({ ok: true });
  }

  if (req.method === "POST" && !id) {
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const prompt: string = (body.prompt || "").trim();
    if (!prompt) return json({ error: "prompt required" }, 400);
    const aspect = body.aspect_ratio || "1:1";
    const num = Math.max(1, Math.min(4, body.num_variations ?? 1));
    const refs: string[] = Array.isArray(body.refs)
      ? body.refs.map((r: any) => typeof r === "string" ? r : r?.url).filter(Boolean) : [];
    const engineId = resolveImageEngine(refs.length, body.model);
    if (requiresReferenceImage(engineId) && refs.length === 0) {
      return json({ error: `${engineId} requires at least 1 reference image` }, 400);
    }
    return await startGeneration({
      auth, engineId, tool: "image",
      op: refs.length ? "i2i" : "t2i", mediaType: "image",
      input: { prompt, aspect, refs, num },
    });
  }

  return json({ error: "Not found" }, 404);
});
