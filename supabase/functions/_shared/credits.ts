// Shared credit logic for edge functions: cost calculation + atomic debit/refund.
import pricing from "./pricing.json" with { type: "json" };
import { adminClient } from "./gates.ts";

type AnyModel = {
  id: string;
  name?: string;
  credits?: number;
  credits_min?: number;
  credits_max?: number;
  credits_per_unit?: number;
  unit?: string;
  duration_min?: number;
  duration_max?: number;
};

const ALL_MODELS: AnyModel[] = [
  ...(pricing.models.image as AnyModel[]),
  ...(pricing.models.video as AnyModel[]),
  ...(pricing.models.edit as AnyModel[]),
  ...(pricing.models.audio as AnyModel[]),
];
const MODEL_BY_ID = new Map(ALL_MODELS.map((m) => [m.id, m]));

// Aliases: engine IDs usados nos handlers que não batem com o `id` em pricing.json.
// Mantém isolado para não afetar outros motores.
const MODEL_ALIASES: Record<string, string> = {
  "nano-banana": "google-nano-banana",
  "nano-banana-2": "google-nano-banana-2",
  "nano-banana-pro": "google-nano-banana-pro",
  "nano-banana-pro-flash": "google-nano-banana-pro",
};

export function findModel(idOrLabel: string): AnyModel | null {
  if (!idOrLabel) return null;
  const direct = MODEL_BY_ID.get(idOrLabel);
  if (direct) return direct;
  const aliased = MODEL_ALIASES[idOrLabel];
  if (aliased) {
    const m = MODEL_BY_ID.get(aliased);
    if (m) return m;
  }
  const label = String(idOrLabel).toLowerCase();
  return ALL_MODELS.find((m) => (m.name || "").toLowerCase() === label) || null;
}

export type CostParams = {
  quality?: string;
  duration?: number;
  variations?: number;
  units?: number;
};

export function calculateCost(modelIdOrLabel: string, params: CostParams = {}): number {
  const model = findModel(modelIdOrLabel);
  const variations = Math.max(1, params.variations ?? 1);
  if (!model) return 0;

  if (typeof model.credits === "number") return model.credits * variations;

  if (typeof model.credits_per_unit === "number") {
    const units = Math.max(1, params.units ?? 1);
    let factor = units;
    if (model.unit === "1000_chars") factor = Math.max(1, Math.ceil(units / 1000));
    return Math.ceil(model.credits_per_unit * factor) * variations;
  }

  const min = model.credits_min ?? 0;
  const max = model.credits_max ?? min;
  if (max === min) return min * variations;

  let t = 0.5;
  if (params.quality === "1K") t = 0.0;
  else if (params.quality === "2K") t = 0.5;
  else if (params.quality === "4K") t = 1.0;

  if (model.duration_max && model.duration_min && params.duration) {
    const range = Math.max(1, model.duration_max - model.duration_min);
    const dt = Math.min(1, Math.max(0, (params.duration - model.duration_min) / range));
    t = Math.min(1, t * 0.4 + dt * 0.6);
  }
  const cost = min + (max - min) * t;
  return Math.ceil(cost) * variations;
}

export type DebitResult =
  | { ok: true; balance: number; amount: number }
  | { ok: false; status: number; code: string; message: string; balance?: number };

/** Atomic debit via RPC. Returns ok/false with HTTP-friendly status code. */
export async function debitCredits(
  userId: string,
  amount: number,
  reason: string,
  generationId?: string,
): Promise<DebitResult> {
  if (amount <= 0) return { ok: true, balance: -1, amount: 0 };
  const sb = adminClient();
  const { data, error } = await sb.rpc("debit_user_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_generation_id: generationId ?? null,
  });
  if (error) {
    return { ok: false, status: 500, code: "DEBIT_ERROR", message: error.message };
  }
  const r = data as { success: boolean; balance?: number; message?: string };
  if (!r?.success) {
    const isInsufficient = (r?.message || "").toLowerCase().includes("insufficient");
    return {
      ok: false,
      status: isInsufficient ? 402 : 400,
      code: isInsufficient ? "INSUFFICIENT_CREDITS" : "DEBIT_FAILED",
      message: r?.message || "Falha ao debitar créditos.",
      balance: r?.balance,
    };
  }
  return { ok: true, balance: r.balance ?? 0, amount };
}

/** Refund a previously-debited amount (used when generation fails). */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  generationId?: string,
): Promise<void> {
  if (amount <= 0) return;
  const sb = adminClient();
  await sb.rpc("credit_user_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_type: "refund",
    p_reason: reason,
    p_generation_id: generationId ?? null,
    p_metadata: {},
  });
}
