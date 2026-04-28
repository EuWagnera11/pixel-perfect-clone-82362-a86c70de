import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

export default function PersonaNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [refPath, setRefPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("personas").insert({
      user_id: user.id,
      name,
      description: description || null,
      reference_image_url: refPath || null,
    });
    setLoading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Persona criada" });
    navigate("/app/personas");
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/app/personas")}>
        <ArrowLeft /> Voltar
      </Button>
      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Nova persona</div>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Crie uma IA influencer</h1>

      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-background p-8">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da persona</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Sophia" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Descrição</Label>
          <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brasileira, 24 anos, estética editorial natural..." rows={4} />
        </div>
        <ImageUpload
          bucket="persona-photos"
          label="Foto de referência (opcional)"
          hint="Foto frontal, boa iluminação — JPG, PNG ou WebP até 10 MB"
          value={refPath}
          onChange={(path) => setRefPath(path)}
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Criando..." : "Criar persona"}
        </Button>
      </form>
    </div>
  );
}
