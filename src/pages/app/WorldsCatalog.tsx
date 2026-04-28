import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Sparkles, TrendingUp } from "lucide-react";
import { api, ApiError, type World } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function WorldsCatalog() {
  const { toast } = useToast();
  const [items, setItems] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");

  const load = async (cat?: string) => {
    setLoading(true);
    try {
      const data = await api.worlds.list(cat);
      setItems(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao carregar worlds", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(category === "all" ? undefined : category);
  }, [category]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[]))],
    [items],
  );

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Worlds</div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Mundos pré-construídos</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Cenários completos com prompts e referências afinadas. Selecione um e use direto na geração.
      </p>

      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${category === c ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {c === "all" ? "Todos" : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="font-mono text-xs text-muted-foreground">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
            <Globe className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold">Nenhum world disponível</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tente outro filtro.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <div key={w.id} className="group overflow-hidden rounded-xl border border-border bg-background transition-all hover:shadow-elegant">
              <div className="aspect-[16/10] bg-gradient-to-br from-primary-light to-surface">
                {w.preview_url && (
                  <img src={w.preview_url} alt={w.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-5">
                <div className="mb-1 flex items-center gap-2">
                  {w.category && (
                    <span className="rounded-full bg-primary-light px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                      {w.category}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> {w.uses_count}
                  </span>
                </div>
                <div className="text-base font-semibold">{w.name}</div>
                {w.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{w.description}</p>}
                <Button size="sm" className="mt-4 w-full" asChild>
                  <Link to={`/app/generate?world=${w.id}`}><Sparkles /> Criar com este world</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
