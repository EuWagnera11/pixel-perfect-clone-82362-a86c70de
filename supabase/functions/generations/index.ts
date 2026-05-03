// /generations
//   POST   -> create a generation (currently: tool=image only — Phase 2 pilot)
//   GET    -> list user's generations (?limit=30)
//   GET /:id -> single generation status
//   DELETE /:id -> delete
//
// Body shape (image, simplified discriminated union):
// {
//   tool: "image",
//   prompt: string,
//   aspect_ratio?: "1:1"|"9:16"|"16:9"|"4:3"|"3:4"|"21:9",
//   refs?: { url: string, role?: string }[],
//   num_variations?: 1..4,
//   model?: string  // override
// }
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { freepikFetch } from "../_shared/freepik.ts";
import {
  buildImageBody,
  extractTaskId,
  imageEndpoint,
  resolveImageModel,
} from "../_shared/tool_registry.ts";
import { ENVELOPES } from "../_shared/envelopes.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  // path: /generations or /generations/:id  -> after function name
  const segments = url.pathname.split("/").filter(Boolean);
  // segments[0] === "generations" (function name)
  const id = segments[1];

  if (req.method === "GET" && !id) return await listGenerations(auth, url);
  if (req.method === "GET" && id) return await getGeneration(auth, id);
  if (req.method === "DELETE" && id) return await deleteGeneration(auth, id);
  if (req.method === "POST" && !id) return await createGeneration(auth, req);

  return json({ error: "Not found" }, 404);
});

async function listGenerations(auth: any, url: URL) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
  const { data, error } = await auth.admin
    .from("generations")
    .select("id,status,prompt,image_urls,video_urls,credits_used,media_type,error_message,created_at,completed_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return json({ error: "DB error", detail: error.message }, 500);
  return json(data);
}

async function getGeneration(auth: any, id: string) {
  const { data, error } = await auth.admin
    .from("generations")
    .select("id,status,prompt,image_urls,video_urls,credits_used,media_type,error_message,created_at,completed_at,metadata")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (error) return json({ error: "DB error", detail: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  return json(data);
}

async function deleteGeneration(auth: any, id: string) {
  const { error } = await auth.admin
    .from("generations")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);
  if (error) return json({ error: "DB error", detail: error.message }, 500);
  return json({ ok: true });
}

async function createGeneration(auth: any, req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const tool = body.tool ?? "image";
  if (tool !== "image") {
    return json({ error: "Unsupported tool", detail: `tool=${tool} not implemented yet (Phase 2 covers image only)` }, 400);
  }

  const prompt: string = (body.prompt || "").trim();
  if (!prompt) return json({ error: "prompt is required" }, 400);

  const aspect = body.aspect_ratio || "1:1";
  const numVariations = Math.max(1, Math.min(4, body.num_variations ?? 1));
  const refs: string[] = Array.isArray(body.refs)
    ? body.refs.map((r: any) => (typeof r === "string" ? r : r?.url)).filter(Boolean)
    : [];

  // Envelope (light wrap for default image)
  const env = ENVELOPES.image_default(prompt, aspect);

  // Model resolution + endpoint
  const model = resolveImageModel(refs.length, body.model);
  const endpoint = imageEndpoint(model);

  // Insert pending row (status=processing)
  const { data: gen, error: insErr } = await auth.admin
    .from("generations")
    .insert({
      user_id: auth.userId,
      status: "processing",
      tool: "image",
      op: refs.length ? "i2i" : "t2i",
      model,
      freepik_endpoint: endpoint,
      raw_prompt: prompt,
      final_prompt: env.prompt,
      envelope_version: env.version,
      refs: refs.map((url) => ({ url })),
      aspect_ratio: aspect,
      num_variations: numVariations,
      media_type: "image",
      prompt,
    })
    .select()
    .single();
  if (insErr) return json({ error: "DB insert failed", detail: insErr.message }, 500);

  // Build Freepik body and fire
  const freepikBody = await buildImageBody(model, env.prompt, aspect, refs, numVariations);

  const fp = await freepikFetch(endpoint, {
    method: "POST",
    body: JSON.stringify(freepikBody),
    logCtx: { userId: auth.userId, generationId: gen.id, endpointKey: endpoint },
  });

  if (fp.status >= 400 || !fp.body) {
    await auth.admin.from("generations").update({
      status: "failed",
      error_message: `Freepik ${fp.status}: ${typeof fp.body === "string" ? fp.body : JSON.stringify(fp.body).slice(0, 500)}`,
    }).eq("id", gen.id);
    return json({ error: "Freepik error", detail: fp.body, status: fp.status }, 502);
  }

  const taskId = extractTaskId(fp.body);
  if (!taskId) {
    await auth.admin.from("generations").update({
      status: "failed",
      error_message: "Freepik did not return a task id",
      metadata: { freepik_response: fp.body },
    }).eq("id", gen.id);
    return json({ error: "Missing task id in Freepik response", detail: fp.body }, 502);
  }

  await auth.admin.from("generations").update({
    metadata: { freepik_task_id: taskId, freepik_path: endpoint },
  }).eq("id", gen.id);

  return json({
    id: gen.id,
    status: "processing",
    credits_used: 0,
    media_type: "image",
    created_at: gen.created_at,
    freepik_task_id: taskId,
  }, 201);
}
