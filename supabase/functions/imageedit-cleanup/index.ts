// POST /imageedit-cleanup
// Apaga arquivos do bucket `imageedit-outputs` com mais de 24h.
// Disparado via pg_cron (a cada 1h).
import { corsHeaders, json } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "imageedit-outputs";
const TTL_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const cutoff = Date.now() - TTL_MS;
  let deleted = 0;
  let scanned = 0;
  const errors: string[] = [];

  // Lista raiz; estrutura é {user_id}/{tool}/{file}
  const walk = async (prefix: string) => {
    const { data, error } = await supa.storage.from(BUCKET).list(prefix, { limit: 1000 });
    if (error) { errors.push(`list ${prefix}: ${error.message}`); return; }
    if (!data) return;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // diretório (sem id)
      if (!item.id) { await walk(path); continue; }
      scanned++;
      const created = item.created_at ? new Date(item.created_at).getTime() : Date.now();
      if (created < cutoff) {
        const { error: delErr } = await supa.storage.from(BUCKET).remove([path]);
        if (delErr) errors.push(`del ${path}: ${delErr.message}`);
        else deleted++;
      }
    }
  };

  try { await walk(""); }
  catch (e) { return json({ error: { code: "WALK_FAILED", message: (e as Error).message } }, 500); }

  return json({ ok: true, scanned, deleted, errors });
});
