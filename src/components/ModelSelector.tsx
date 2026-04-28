/**
 * ModelSelector — seletor de modelo de imagem com capacity display.
 *
 * Mostra todos os modelos disponíveis no catálogo, agrupados por tier visual
 * (econômico / equilibrado / premium), com a quantidade de imagens que o user
 * ainda consegue gerar com o saldo atual.
 *
 * Não revela o custo em créditos por modelo — só a capacidade ("você gera X").
 */
import { useEffect, useState } from "react";
import { Loader2, Zap, Star, Crown } from "lucide-react";
import { api } from "@/lib/api";

type ModelInfo = {
  id: string;
  name: string;
  tier: "economic" | "balanced" | "premium" | "elite";
  resolutions: Record<string, number>;
};

type CapacityResp = {
  balance: number;
  images: Record<string, Record<string, number>>;
};

const TIER_ORDER: Record<string, number> = {
  economic: 0,
  balanced: 1,
  premium: 2,
  elite: 3,
};

const TIER_BADGE: Record<string, { icon: any; label: string; classes: string }> = {
  economic: { icon: Zap,   label: "Econômico",  classes: "bg-green-500/10 text-green-400 border-green-500/30" },
  balanced: { icon: Star,  label: "Equilibrado", classes: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  premium:  { icon: Crown, label: "Premium",    classes: "bg-primary/15 text-primary border-primary/30" },
  elite:    { icon: Crown, label: "Elite",      classes: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

interface Props {
  value: { model: string; resolution: string };
  onChange: (v: { model: string; resolution: string }) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [capacity, setCapacity] = useState<CapacityResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.catalog.models(), api.catalog.capacity()])
      .then(([catalog, cap]) => {
        setModels(catalog.images as ModelInfo[]);
        setCapacity(cap as CapacityResp);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Ordena por tier visual + nome
  const sortedModels = [...models].sort((a, b) =>
    (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99) || a.name.localeCompare(b.name)
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
          Modelo
        </div>
        {capacity && (
          <div className="font-mono text-[10px] text-foreground-muted">
            Saldo: <span className="font-semibold text-primary">{capacity.balance.toLocaleString("pt-BR")}</span> créditos
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {sortedModels.map(m => {
          const badge = TIER_BADGE[m.tier] ?? TIER_BADGE.balanced;
          const TierIcon = badge.icon;
          const resolutionsAvailable = Object.keys(m.resolutions);
          const isSelected = value.model === m.id;

          return (
            <div
              key={m.id}
              className={`rounded-xl border p-3 transition-all ${
                isSelected
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-surface/40 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${badge.classes}`}>
                    <TierIcon className="h-3 w-3" /> {badge.label}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {resolutionsAvailable.map(res => {
                  const available = capacity?.images[m.id]?.[res] ?? 0;
                  const isResSelected = isSelected && value.resolution === res;
                  const disabled = available === 0;

                  return (
                    <button
                      key={res}
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange({ model: m.id, resolution: res })}
                      className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-all ${
                        isResSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : disabled
                            ? "border-border bg-surface/20 text-foreground-muted/40 cursor-not-allowed"
                            : "border-border bg-surface/60 hover:border-primary/40 hover:bg-surface"
                      }`}
                    >
                      <span className="font-mono text-[11px] uppercase font-semibold">{res}</span>
                      <span className="text-[10px] text-foreground-muted">
                        {disabled ? "sem créditos" : `${available.toLocaleString("pt-BR")} disponíveis`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
