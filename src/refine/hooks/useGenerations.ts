import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Generation = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  prompt?: string;
  image_urls?: string[];
  video_urls?: string[];
  error_message?: string | null;
  credits_used: number;
  media_type?: "image" | "video" | "audio";
  model?: string;
  tool?: string;
  created_at: string;
  completed_at?: string | null;
};

async function invokeFn<T>(name: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, init as any);
  if (error) throw error;
  return data as T;
}

export function useGenerations() {
  const [history, setHistory] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await invokeFn<Generation[]>("generations?limit=30", { method: "GET" });
      setHistory(
        (list || []).filter(
          (g) =>
            g.status === "completed" &&
            ((g.image_urls?.length || 0) > 0 || (g.video_urls?.length || 0) > 0)
        )
      );
    } catch (e) {
      console.warn("[refine] generations refresh:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { history, loading, refresh, setHistory };
}

// ============= dispatchers =============

type Created = { id: string; status: string; media_type?: string; task_id?: string };

export async function startImage(input: {
  prompt: string; aspect_ratio: string; num_variations?: number;
  refs?: string[]; model?: string;
}) {
  return await invokeFn<Created>("generate-image", {
    method: "POST",
    body: {
      prompt: input.prompt,
      aspect_ratio: input.aspect_ratio,
      num_variations: input.num_variations ?? 1,
      refs: (input.refs ?? []).map((url) => ({ url })),
      model: input.model,
    },
  });
}

export async function startVideo(input: {
  prompt: string; image_url?: string; model: string;
  duration?: string; aspect_ratio?: string;
}) {
  return await invokeFn<Created>("generate-video", {
    method: "POST", body: input,
  });
}

export async function startEdit(input: {
  op: "remove-bg" | "replace-bg" | "relight" | "expand" | "style-transfer";
  image_url: string; prompt?: string; style_url?: string;
}) {
  return await invokeFn<Created>("edit-image", { method: "POST", body: input });
}

export async function startUpscale(input: {
  image_url: string; engine?: "magnific-creative" | "magnific-precision";
}) {
  return await invokeFn<Created>("upscale-image", { method: "POST", body: input });
}

export async function startAudio(input: { prompt: string; kind: "music" | "sfx" }) {
  return await invokeFn<Created>("generate-audio", { method: "POST", body: input });
}

export async function fetchGeneration(id: string) {
  return await invokeFn<Generation>("task-status", {
    method: "POST", body: { generation_id: id },
  });
}

export async function pollGeneration(id: string, maxMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 4000));
    const g = await fetchGeneration(id);
    if (g.status === "completed" || g.status === "failed") return g;
  }
  throw new Error("Polling timeout");
}
