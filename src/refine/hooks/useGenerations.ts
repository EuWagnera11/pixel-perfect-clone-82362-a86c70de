import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/supabase";

export type Generation = {
  id: string;
  status: "queued" | "processing" | "enhancing" | "upscaling" | "completed" | "failed";
  prompt?: string;
  image_urls?: string[];
  video_urls?: string[];
  error_message?: string | null;
  credits_used: number;
  media_type?: "image" | "video";
  created_at: string;
  completed_at?: string | null;
};

export function useGenerations() {
  const [history, setHistory] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await api<Generation[]>("/generations?limit=30");
      setHistory(list.filter((g) => g.status === "completed" && (g.image_urls?.length || 0) > 0));
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
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    media_type: input.media_type || "image",
    aspect_ratio: input.aspect_ratio,
    resolution: input.resolution,
    num_variations: input.num_variations,
    enhance_skin: false,
    upscale: false,
  };
  if (input.model) body.model = input.model;
  if (input.video_engine) body.video_engine = input.video_engine;
  if (input.duration) body.duration = input.duration;
  if (input.image_url) body.image_url = input.image_url;
  return await api<{ id: string; status: string; credits_used: number }>("/generations", {
    method: "POST",
    body,
  });
}

export async function fetchGeneration(id: string) {
  return await api<Generation>(`/generations/${id}`);
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
