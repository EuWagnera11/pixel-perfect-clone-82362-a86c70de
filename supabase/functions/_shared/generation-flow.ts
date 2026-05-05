// Shared flow: insert generation row, fire Magnific POST, save task_id.
// Polling lives in `task-status` function.
import { magnificFetch, extractTaskId } from "./magnific.ts";
import { json } from "./cors.ts";
import { buildBody, getEngine, urlToRefObject, type BuildInput, type MediaKind } from "./engines.ts";

export type StartArgs = {
  auth: any;
  engineId: string;
  tool: string;          // "image" | "video" | "edit" | "upscale" | "audio"
  op: string;            // "t2i" | "i2i" | "t2v" | "i2v" | "edit" | "upscale" | "music" | "sfx"
  input: BuildInput;
  mediaType: MediaKind;
};

export async function startGeneration(args: StartArgs): Promise<Response> {
  const engine = getEngine(args.engineId);
  if (!engine) return json({ error: "Unknown engine", detail: args.engineId }, 400);

  // Insert pending row
  const { data: gen, error: insErr } = await args.auth.admin
    .from("generations")
    .insert({
      user_id: args.auth.userId,
      status: "processing",
      tool: args.tool,
      op: args.op,
      model: engine.id,
      freepik_endpoint: engine.path,
      raw_prompt: args.input.prompt,
      final_prompt: args.input.prompt,
      envelope_version: "v2",
      refs: args.input.refs.map((url) => ({ url })),
      aspect_ratio: args.input.aspect,
      num_variations: args.input.num,
      media_type: args.mediaType,
      prompt: args.input.prompt,
    })
    .select()
    .single();
  if (insErr) return json({ error: "DB insert failed", detail: insErr.message }, 500);

  // Pre-fetch reference images as base64 (Freepik requires {image, mime_type} objects)
  if (args.input.refs?.length && !args.input.refsB64) {
    try {
      args.input.refsB64 = await Promise.all(args.input.refs.slice(0, 4).map(urlToRefObject));
    } catch (e) {
      await args.auth.admin.from("generations").update({
        status: "failed", error_message: `Ref fetch failed: ${(e as Error).message}`,
      }).eq("id", gen.id);
      return json({ error: "Ref fetch failed", detail: (e as Error).message, generation_id: gen.id }, 502);
    }
  }

  const body = buildBody(engine, args.input);

  // Freepik's /v1/ai/beta/remove-background endpoint requires multipart/form-data
  // (it does not accept JSON). Use form encoding for it specifically.
  const isRemoveBg = engine.path === "/v1/ai/beta/remove-background";
  let reqInit: RequestInit;
  if (isRemoveBg) {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) form.append(k, String(v));
    }
    reqInit = { method: "POST", body: form };
  } else {
    reqInit = { method: "POST", body: JSON.stringify(body) };
  }

  const fp = await magnificFetch(engine.path, {
    ...reqInit,
    logCtx: { userId: args.auth.userId, generationId: gen.id, endpointKey: engine.path },
  });

  if (fp.status >= 400 || !fp.body) {
    const msg = `Magnific ${fp.status}: ${typeof fp.body === "string" ? fp.body : JSON.stringify(fp.body).slice(0, 500)}`;
    await args.auth.admin.from("generations").update({
      status: "failed",
      error_message: msg,
    }).eq("id", gen.id);
    return json({ error: "Magnific error", detail: fp.body, status: fp.status, generation_id: gen.id }, 502);
  }

  const taskId = extractTaskId(fp.body);
  if (!taskId) {
    await args.auth.admin.from("generations").update({
      status: "failed",
      error_message: "Magnific did not return a task id",
      metadata: { magnific_response: fp.body },
    }).eq("id", gen.id);
    return json({ error: "Missing task id", detail: fp.body, generation_id: gen.id }, 502);
  }

  await args.auth.admin.from("generations").update({
    metadata: { magnific_task_id: taskId, magnific_path: engine.path },
  }).eq("id", gen.id);

  return json({
    id: gen.id,
    status: "processing",
    media_type: args.mediaType,
    created_at: gen.created_at,
    task_id: taskId,
  }, 201);
}
