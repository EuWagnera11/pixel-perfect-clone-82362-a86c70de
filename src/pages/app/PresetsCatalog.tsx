import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Loader2, Crown } from "lucide-react";
import { api, ApiError, type ModelPreset } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function PresetsCatalog() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<ModelPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [usingId, setUsingId] = useState<string | null>(null);

  const load = async (params?: { category?: string; gender?: string }) => {
    setLoading(true);
    try {
      const data = await api.presets.list(params);
      setItems(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao carregar presets", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({
      category: category === "all" ? undefined : category,
      gender: gender === "all" ? undefined : gender,
    });
  }, [category, gender]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
    [items],
  );
  const genders = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.gender).filter(Boolean) as string[]))],
    [items],
  );

  const handleUse = async (id: string) => {
    setUsingId(id);
    try {
      const r = await api.presets.use(id);
      toast({ title: "Persona criada", description: r.name });
      navigate("/app/personas");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao usar preset", description: msg, variant: "destructive" });
    } finally {
      setUsingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Modelos prontos</div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Catálogo de personas</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Modelos pré-treinados curados pela equipe Refine. Use um clique para clonar como sua persona.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Categoria</div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {c === "all" ? "Todas" : c}
              </button>
            ))}
          </div>
        </div>
        {genders.length > 1 && (
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Gênero</div>
            <div className="flex flex-wrap gap-2">
              {genders.map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${gender === g ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {g === "all" ? "Todos" : g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="font-mono text-xs text-muted-foreground">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
          <h3 className="text-lg font-semibold">Nenhum modelo disponível</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tente alterar os filtros.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-xl border border-border bg-background transition-all hover:shadow-elegant">
              <div className="relative aspect-[4/5] bg-gradient-to-br from-primary-light to-surface">
                {p.reference_image_url && (
                  <img src={p.reference_image_url} alt={p.name} className="h-full w-full object-cover" />
                )}
                {p.is_premium && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-foreground/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-background">
                    <Crown className="h-3 w-3" /> Premium
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary-light px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                    {p.category}
                  </span>
                  {p.gender && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.gender}</span>
                  )}
                  <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <Star className="h-3 w-3 fill-current" /> {p.rating?.toFixed?.(1) ?? p.rating ?? "—"}
                  </span>
                </div>
                <div className="text-base font-semibold">{p.name}</div>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                <Button
                  size="sm"
                  className="mt-4 w-full"
                  disabled={usingId === p.id}
                  onClick={() => handleUse(p.id)}
                >
                  {usingId === p.id ? <><Loader2 className="animate-spin" /> Clonando...</> : <><Sparkles /> Usar este modelo</>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
