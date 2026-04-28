import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type Template = { id: string; name: string; category: string; description: string | null; uses_count: number; rating: number };

export default function Templates() {
  const [items, setItems] = useState<Template[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("templates").select("*").eq("is_public", true).order("uses_count", { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);

  const categories = ["all", ...Array.from(new Set(items.map(t => t.category)))];
  const filtered = filter === "all" ? items : items.filter(t => t.category === filter);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Templates</div>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Biblioteca de cenas</h1>

      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${filter === c ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {c === "all" ? "Todos" : c}
          </button>
        ))}
      </div>

      {loading ? <div className="font-mono text-xs text-muted-foreground">Carregando...</div> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <div key={t.id} className="group overflow-hidden rounded-xl border border-border bg-background transition-all hover:shadow-elegant">
              <div className="aspect-[4/5] gradient-warm" />
              <div className="p-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary-light px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">{t.category}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">★ {t.rating} · ↑ {t.uses_count}</span>
                </div>
                <div className="text-base font-semibold">{t.name}</div>
                {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                <Button size="sm" className="mt-4 w-full" asChild>
                  <Link to={`/app/generate?template=${t.id}`}><Sparkles /> Usar template</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
