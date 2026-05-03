// POST /uploads-file
// multipart/form-data with field "file" -> stores in bucket "uploads" at <user_id>/<uuid>.<ext>
// Returns { url, path, size, content_type } — public URL is required because Freepik needs to fetch it.
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return json({ error: "Expected multipart/form-data" }, 400); }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Missing 'file' field" }, 400);
  if (file.size === 0) return json({ error: "Empty file" }, 400);
  if (file.size > 25 * 1024 * 1024) return json({ error: "File too large (max 25MB)" }, 400);

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${auth.userId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await auth.admin.storage.from("uploads").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return json({ error: "Upload failed", detail: upErr.message }, 500);

  const { data: pub } = auth.admin.storage.from("uploads").getPublicUrl(path);

  return json({
    ok: true,
    url: pub.publicUrl,
    path,
    size: file.size,
    content_type: file.type || "application/octet-stream",
  });
});
