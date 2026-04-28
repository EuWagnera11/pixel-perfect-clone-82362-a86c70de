import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Persona = { id: string; name: string; description: string | null; reference_image_url: string | null; created_at: string };

export default function Personas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("personas").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPersonas(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("personas").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Persona removida" });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Personas</div>
          <h1 className="text-3xl font-semibold tracking-tight">Suas IA influencers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie identidades canônicas. Cada persona = 1 rosto consistente.</p>
        </div>
        <Button asChild><Link to="/app/personas/new"><Plus /> Nova persona</Link></Button>
      </div>

      {loading ? (
        <div className="font-mono text-xs text-muted-foreground">Carregando...</div>
      ) : personas.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map(p => (
            <div key={p.id} className="group overflow-hidden rounded-xl border border-border bg-background transition-all hover:shadow-elegant">
              <div className="aspect-[4/5] bg-gradient-to-br from-primary-light to-surface">
                {p.reference_image_url && (
                  <img src={p.reference_image_url} alt={p.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold">{p.name}</div>
                    {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link to={`/app/generate?persona=${p.id}`}>Gerar</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
        <Users className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">Nenhuma persona ainda</h3>
      <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira IA influencer e comece a gerar conteúdo editorial.</p>
      <Button className="mt-6" asChild><Link to="/app/personas/new"><Plus /> Criar primeira persona</Link></Button>
    </div>
  );
}
