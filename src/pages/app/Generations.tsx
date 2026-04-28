import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon } from "lucide-react";

type Gen = { id: string; status: string; created_at: string; image_urls: string[] };

export default function Generations() {
  const { user } = useAuth();
  const [items, setItems] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("generations").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Galeria</div>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Suas gerações</h1>

      {loading ? <div className="font-mono text-xs text-muted-foreground">Carregando...</div> :
        items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
              <ImageIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Nenhuma geração ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">Suas imagens aparecerão aqui assim que você gerar a primeira.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map(g => (
              <div key={g.id} className="aspect-[4/5] rounded-xl border border-border bg-surface" />
            ))}
          </div>
        )
      }
    </div>
  );
}
