import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.full_name ?? ""));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setLoading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Perfil atualizado" });
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Conta</div>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Ajustes</h1>

      <div className="space-y-6 rounded-2xl border border-border bg-background p-8">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
      </div>
    </div>
  );
}
