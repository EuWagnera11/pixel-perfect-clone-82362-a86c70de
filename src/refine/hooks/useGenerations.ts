import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Generation = {
  id: string;
  status: "queued" | "processing" | "enhancing" | "upscaling" | "completed" | "failed";
  prompt?: string;
  image_urls?: string[];
  video_urls?: string[];
  error_message?: string | null;
  credits_used: number;
  media_type?: "image" | "video" | "audio";
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, loading, refresh, setHistory };
}

export type GenerateInput = {
  prompt: string;
  aspect_ratio: string;
  resolution: "1k" | "2k" | "4k";
  num_variations: number;
  media_type?: "image" | "video";
  model?: string;
  video_engine?: string;
  duration?: string;
  image_url?: string;
};

export async function createGeneration(input: GenerateInput) {
  // Edge function expects the new envelope (tool=image only for now)
  const payload: Record<string, unknown> = {
    tool: "image",
    prompt: input.prompt,
    aspect_ratio: input.aspect_ratio,
    num_variations: input.num_variations,
    refs: input.image_url ? [{ url: input.image_url }] : [],
  };
  if (input.model) payload.model = input.model;
  return await invokeFn<{ id: string; status: string; credits_used: number }>("generations", {
    method: "POST",
    body: payload,
  });
}

export async function fetchGeneration(id: string) {
  // freepik-check-status pokes Freepik (if needed) and returns latest row
  return await invokeFn<Generation>("freepik-check-status", {
    method: "POST",
    body: { generation_id: id },
  });
}

export async function pollGeneration(id: string, maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 4000));
    const g = await fetchGeneration(id);
    if (g.status === "completed" || g.status === "failed") return g;
  }
  throw new Error("Polling timeout");
}
