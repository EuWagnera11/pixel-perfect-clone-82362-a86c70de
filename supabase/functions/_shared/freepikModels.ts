/**
 * Lista canônica de modelos Freepik usados pelas tools novas.
 * Única fonte da verdade compartilhada entre frontend e edge functions.
 *
 * IMPORTANTE: confirmar nomes exatos em https://docs.freepik.com/api-reference
 * antes de implementar cada ferramenta nova. Os já validados em produção
 * (que rodam em `_shared/engines.ts`) estão marcados com `verified: true`.
 */

export type FreepikModelKind = "editor" | "generator" | "dedicated";

export type FreepikModel = {
  id: string;          // kebab-case, ID interno
  label: string;       // nome amigável pra UI
  endpoint: string;    // path da Freepik (sem host)
  kind: FreepikModelKind;
  recommended?: boolean;
  description?: string;
  maxRefs?: number;    // só pra editores
  verified?: boolean;  // já testado em produção
};

// ───────── Editores (aceitam imagem de referência) ─────────
export const FREEPIK_EDITORS: FreepikModel[] = [
  {
    id: "nano-banana-pro",
    label: "Nano Banana 2",
    endpoint: "/v1/ai/text-to-image/nano-banana-pro",
    kind: "editor",
    recommended: true,
    maxRefs: 14,
    verified: true,
    description: "Edição em geral, melhor qualidade. Default global.",
  },
  {
    id: "nano-banana-pro-flash",
    label: "Nano Banana 2 Flash",
    endpoint: "/v1/ai/text-to-image/nano-banana-pro-flash",
    kind: "editor",
    maxRefs: 4,
    verified: true,
    description: "Versão rápida do Nano Banana 2.",
  },
  {
    id: "flux-kontext-pro",
    label: "Flux Kontext Pro",
    endpoint: "/v1/ai/flux-kontext-pro",
    kind: "editor",
    maxRefs: 4,
    description: "Edições editoriais, retoques contextuais.",
  },
  {
    id: "seedream-v4-edit",
    label: "Seedream V4 Edit",
    endpoint: "/v1/ai/seedream-v4-edit",
    kind: "editor",
    maxRefs: 6,
    description: "Edição alternativa, fallback.",
  },
];

// ───────── Geradores puros (sem referência) ─────────
export const FREEPIK_GENERATORS: FreepikModel[] = [
  { id: "mystic", label: "Mystic", endpoint: "/v1/ai/mystic", kind: "generator", verified: true, description: "Até 4K, ultra-realista." },
  { id: "imagen4-ultra", label: "Imagen 4 Ultra", endpoint: "/v1/ai/imagen4-ultra", kind: "generator", verified: true, description: "Google, premium." },
  { id: "imagen4-fast", label: "Imagen 4 Fast", endpoint: "/v1/ai/imagen4-fast", kind: "generator", verified: true, description: "Imagen 4 versão rápida." },
  { id: "flux-pro-1-1", label: "Flux Pro 1.1", endpoint: "/v1/ai/flux-pro-v1-1", kind: "generator", verified: true },
  { id: "flux-2-klein", label: "Flux 2 Klein", endpoint: "/v1/ai/flux-2-klein", kind: "generator", verified: true, description: "Tempo real." },
  { id: "seedream-v4", label: "Seedream V4", endpoint: "/v1/ai/seedream-v4", kind: "generator", verified: true },
];

// ───────── Endpoints dedicados (não substituem editores) ─────────
export const FREEPIK_DEDICATED: FreepikModel[] = [
  { id: "freepik-style-transfer", label: "Style Transfer", endpoint: "/v1/ai/image-style-transfer", kind: "dedicated" },
  { id: "freepik-remove-bg", label: "Remove Background", endpoint: "/v1/ai/remove-background", kind: "dedicated" },
  { id: "flux-pro-expand", label: "Expand (Flux Pro)", endpoint: "/v1/ai/image-expand/flux-pro", kind: "dedicated" },
  { id: "image-relight", label: "Relight", endpoint: "/v1/ai/image-relight", kind: "dedicated" },
];

export const ALL_FREEPIK_MODELS: FreepikModel[] = [
  ...FREEPIK_EDITORS, ...FREEPIK_GENERATORS, ...FREEPIK_DEDICATED,
];

export function getModel(id: string): FreepikModel | undefined {
  return ALL_FREEPIK_MODELS.find((m) => m.id === id);
}

/** Modelos disponíveis pra cada tool da spec. */
export const TOOL_MODEL_WHITELIST: Record<string, string[]> = {
  "style-transfer":     ["nano-banana-pro", "nano-banana-pro-flash", "flux-kontext-pro", "seedream-v4-edit"],
  "replace-bg":         ["nano-banana-pro", "nano-banana-pro-flash", "flux-kontext-pro", "seedream-v4-edit"],
  "remove-bg":          ["freepik-remove-bg"],
  "expand":             ["flux-pro-expand"],
  "colorize":           ["nano-banana-pro", "flux-kontext-pro"],
  "face-swap":          ["nano-banana-pro"],
  "cloth-swap":         ["nano-banana-pro"],
  "realistic-3d":       ["nano-banana-pro", "flux-kontext-pro"],
  "product-gen":        ["nano-banana-pro", "nano-banana-pro-flash", "seedream-v4-edit"],
  "assets-gen":         ["nano-banana-pro", "nano-banana-pro-flash"],
  "depth-map":          ["nano-banana-pro"],
};

export function modelsForTool(tool: string): FreepikModel[] {
  const ids = TOOL_MODEL_WHITELIST[tool] || [];
  return ids.map(getModel).filter(Boolean) as FreepikModel[];
}

export function defaultModelForTool(tool: string): string {
  const list = TOOL_MODEL_WHITELIST[tool];
  return list?.[0] || "nano-banana-pro";
}
