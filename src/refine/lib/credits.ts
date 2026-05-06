import pricing from "@/config/pricing.json";

export type ModelCategory = "image" | "video" | "edit" | "audio";

export type CostParams = {
  /** Qualidade selecionada — modelos de imagem multiplicam range. */
  quality?: "1K" | "2K" | "4K" | string;
  /** Duração em segundos — modelos de vídeo. */
  duration?: number;
  /** Quantas variações o usuário pediu. */
  variations?: number;
  /** Quantidade de unidades para áudio (chars / minutos / segundos). */
  units?: number;
};

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

/** Resolve por id exato OU por nome (case-insensitive). */
export function findModel(idOrLabel: string): AnyModel | null {
  if (!idOrLabel) return null;
  const direct = MODEL_BY_ID.get(idOrLabel);
  if (direct) return direct;
  const label = idOrLabel.toLowerCase();
  return ALL_MODELS.find((m) => (m.name || "").toLowerCase() === label) || null;
}

/**
 * Calcula o custo em créditos pra uma geração.
 * Sempre arredonda pra cima (Math.ceil) e multiplica por variações.
 */
export function calculateCost(modelIdOrLabel: string, params: CostParams = {}): number {
  const model = findModel(modelIdOrLabel);
  const variations = Math.max(1, params.variations ?? 1);
  if (!model) return 0;

  // 1) Custo fixo (edit tools)
  if (typeof model.credits === "number") {
    return model.credits * variations;
  }

  // 2) Custo por unidade (áudio: chars/min/seg/generation)
  if (typeof model.credits_per_unit === "number") {
    const units = Math.max(1, params.units ?? 1);
    let factor = units;
    if (model.unit === "1000_chars") factor = Math.max(1, Math.ceil(units / 1000));
    return Math.ceil(model.credits_per_unit * factor) * variations;
  }

  // 3) Range min..max — interpola com qualidade e duração
  const min = model.credits_min ?? 0;
  const max = model.credits_max ?? min;
  if (max === min) return min * variations;

  let t = 0.5; // padrão: meio do range
  if (params.quality === "1K") t = 0.0;
  else if (params.quality === "2K") t = 0.5;
  else if (params.quality === "4K") t = 1.0;

  if (model.duration_max && model.duration_min && params.duration) {
    const range = Math.max(1, model.duration_max - model.duration_min);
    const dt = Math.min(1, Math.max(0, (params.duration - model.duration_min) / range));
    // Duração tem peso forte em vídeo
    t = Math.min(1, t * 0.4 + dt * 0.6);
  }

  const cost = min + (max - min) * t;
  return Math.ceil(cost) * variations;
}

/** Indicador de baixo saldo conforme thresholds do JSON. */
export function balanceLevel(balance: number, capacity: number): "low" | "warn" | "ok" {
  const pct = (balance / Math.max(1, capacity)) * 100;
  if (pct <= pricing.ui_strings.low_balance_threshold_percent) return "low";
  if (pct <= pricing.ui_strings.warning_balance_threshold_percent) return "warn";
  return "ok";
}

export const PRICING = pricing;
