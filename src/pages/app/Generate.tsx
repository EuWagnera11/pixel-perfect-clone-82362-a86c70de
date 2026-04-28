import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Image as ImageIcon, Users, LayoutTemplate, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ratios = ["1:1", "3:4", "9:16", "4:5"];
const resolutions = ["1K", "2K", "4K"];
const variations = [1, 2, 4, 6];

type Persona = { id: string; name: string };
type Template = { id: string; name: string; category: string };

export default function Generate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const [personaId, setPersonaId] = useState(params.get("persona") || "");
  const [templateId, setTemplateId] = useState(params.get("template") || "");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("4:5");
  const [res, setRes] = useState("2K");
  const [vars, setVars] = useState(4);
  const [generating, setGenerating] = useState(false);

  const cost = vars * (res === "4K" ? 4 : res === "2K" ? 2 : 1);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const [p, t, prof] = await Promise.all([
        supabase.from("personas").select("id, name").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("templates").select("id, name, category").eq("is_public", true).order("uses_count", { ascending: false }),
        supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle(),
      ]);
      setPersonas(p.data ?? []);
      setTemplates(t.data ?? []);
      setCredits(prof.data?.credits ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    if (!personaId) {
      toast({
        title: "Selecione uma persona",
        description: "Você precisa de uma persona pra gerar. Crie uma primeiro.",
        variant: "destructive"
      });
      return;
    }
    if (credits < cost) {
      toast({
        title: "Créditos insuficientes",
        description: `Você tem ${credits} créditos. Esta geração custa ${cost}.`,
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: gen, error: insertError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          persona_id: personaId,
          template_id: templateId || null,
          status: "queued",
          prompt: prompt || null,
          aspect_ratio: ratio,
          resolution: res,
          num_variations: vars,
          credits_used: cost,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Decrementar créditos do profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: credits - cost })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Geração na fila ✨",
        description: `Job #${gen.id.slice(0, 8)} criado. ${cost} créditos debitados.`,
      });

      navigate("/app/generations");
    } catch (err) {
      toast({
        title: "Erro ao criar geração",
        description: err instanceof Error ? err.message : "Falha desconhecida",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="font-mono text-xs text-muted-foreground">Carregando...</div>;
  }

  const noPersonas = personas.length === 0;
  const insufficientCredits = credits < cost;

  return (
    <div className="mx-auto grid max-w-6xl animate-fade-in gap-8 lg:grid-cols-5">
      {/* Controls */}
      <div className="space-y-6 rounded-2xl border border-border bg-background p-6 lg:col-span-2">
        <div>
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Gerar</div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova geração</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {credits} créditos · {personas.length} persona{personas.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Persona */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" /> Persona <span className="text-destructive">*</span>
          </div>
          {noPersonas ? (
            <div className="rounded-md border border-dashed border-border bg-surface p-4 text-sm">
              <p className="text-muted-foreground">Você ainda não tem personas.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate("/app/personas/new")}>
                Criar primeira persona
              </Button>
            </div>
          ) : (
            <Select value={personaId} onValueChange={setPersonaId}>
              <SelectTrigger><SelectValue placeholder="Selecione persona" /></SelectTrigger>
              <SelectContent>
                {personas.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Template */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <LayoutTemplate className="h-3 w-3" /> Template (opcional)
          </div>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger><SelectValue placeholder="Sem template (use prompt custom)" /></SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} <span className="text-muted-foreground">· {t.category}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Prompt customizado (opcional)
          </div>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ex: caminhando em rua de Paris ao pôr do sol, trench coat bege..."
            rows={3}
          />
        </div>

        <Pills label="Aspect ratio" options={ratios} value={ratio} onChange={setRatio} />
        <Pills label="Resolução" options={resolutions} value={res} onChange={setRes} />
        <Pills label="Variações" options={variations.map(String)} value={String(vars)} onChange={v => setVars(Number(v))} />

        <div className={`rounded-md border p-4 ${insufficientCredits ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary-light"}`}>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Custo estimado</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl font-semibold ${insufficientCredits ? "text-destructive" : "text-primary"}`}>{cost}</span>
            <span className="text-sm text-muted-foreground">créditos · saldo {credits}</span>
          </div>
          {insufficientCredits && (
            <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> Insuficiente. <a href="/app/billing" className="underline">Comprar créditos</a>
            </div>
          )}
        </div>

        <Button
          size="lg"
          variant="hero"
          className="w-full"
          onClick={handleGenerate}
          disabled={generating || noPersonas || insufficientCredits}
        >
          <Sparkles /> {generating ? "Criando job..." : `Gerar (${cost} créditos)`}
        </Button>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-dashed border-border bg-surface p-12 lg:col-span-3">
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-background">
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Sua geração aparecerá aqui</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Selecione persona à esquerda e clique em Gerar. O job vai pra fila e a API processa em ~3-5min.
          </p>
          <p className="mt-3 max-w-sm text-xs text-muted-foreground/70">
            ⚡ Backend de geração em deploy. Acompanhe status em <a href="/app/generations" className="text-primary hover:underline">galeria</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Pills({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors ${value === o ? "border-primary bg-primary-light text-primary" : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
