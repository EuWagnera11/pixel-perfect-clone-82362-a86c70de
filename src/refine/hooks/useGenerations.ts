import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

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

async function invokeFn<T>(name: string, init: InvokeOptions = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, init);
  if (error) throw error;
  return data as T;
}

export function useGenerations() {
  const [history, setHistory] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        setHistory([]);
        return;
      }

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

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        refresh();
      } else if (event === "SIGNED_OUT") {
        setHistory([]);
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [refresh]);

  // Realtime: re-fetch quando alguma geração muda (insert/update/delete)
  useEffect(() => {
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      if (!userId) return;
      channel = supabase
        .channel("generations-realtime-" + userId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "generations", filter: `user_id=eq.${userId}` },
          () => { refresh(); }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "imageedit_generations", filter: `user_id=eq.${userId}` },
          () => { refresh(); }
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [refresh]);

  return { history, loading, refresh, setHistory };
}

// ============= dispatchers =============

type Created = { id: string; status: string; media_type?: string; task_id?: string };

export async function startImage(input: {
  prompt: string; aspect_ratio: string; num_variations?: number;
  refs?: string[]; model?: string; resolution?: string;
}) {
  return await invokeFn<Created>("generate-image", {
    method: "POST",
    body: {
      prompt: input.prompt,
      aspect_ratio: input.aspect_ratio,
      num_variations: input.num_variations ?? 1,
      refs: (input.refs ?? []).map((url) => ({ url })),
      model: input.model,
      resolution: input.resolution,
    },
  });
}

export async function startVideo(input: {
  prompt: string; image_url?: string; model: string;
  duration?: string; aspect_ratio?: string; last_image_url?: string;
}) {
  return await invokeFn<Created>("generate-video", {
    method: "POST", body: input,
  });
}

export async function startEdit(input: {
  op: string;
  image_url: string; prompt?: string; style_url?: string;
  extras?: Record<string, unknown>;
}) {
  return await invokeFn<Created>("edit-image", { method: "POST", body: input });
}

export async function startUpscale(input: {
  image_url?: string; video_url?: string; engine?: string;
}) {
  return await invokeFn<Created>("upscale-image", { method: "POST", body: input });
}

export async function startAudio(input: {
  prompt?: string; kind: "music" | "sfx" | "voiceover" | "audio-isolation";
  extras?: Record<string, unknown>;
}) {
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
