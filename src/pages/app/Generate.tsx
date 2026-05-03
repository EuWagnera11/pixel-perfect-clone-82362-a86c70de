import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { ModelSelector } from "@/components/ModelSelector";
import { api, ApiError, type Generation } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ratios = ["1:1", "3:4", "9:16", "4:5"];
const variations = [1, 2, 4, 6];

function Pills({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            type="button"
            key={o}
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

export default function Generate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ratio, setRatio] = useState("4:5");
  const [model, setModel] = useState({ model: "nano-banana-pro-flash", resolution: "2k" });
  const [numVars, setNumVars] = useState(4);
  const [prompt, setPrompt] = useState("");
  const [refPath, setRefPath] = useState<string | null>(null);
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [costPreview, setCostPreview] = useState<number | null>(null);

  const personaId = params.get("persona") ?? undefined;
  const templateId = params.get("template") ?? undefined;
  const totalCost = (costPreview ?? 0) * numVars;

  // Atualiza custo via API quando model/resolution muda
  useEffect(() => {
    api.catalog.costPreview({ model: model.model, resolution: model.resolution })
      .then(r => setCostPreview(r.cost))
      .catch(() => setCostPreview(null));
  }, [model.model, model.resolution]);

  // Poll status while running
  useEffect(() => {
    if (!generation || generation.status === "completed" || generation.status === "failed") return;
    const id = generation.id;
    const t = setInterval(async () => {
      try {
        const next = await api.generations.get(id);
        setGeneration(next);
        if (next.status === "completed" || next.status === "failed") clearInterval(t);
      } catch (e) {
        clearInterval(t);
      }
    }, 2500);
    return () => clearInterval(t);
  }, [generation?.id, generation?.status]);

  const handleGenerate = async () => {
    setSubmitting(true);
    setGeneration(null);
    try {
      const g = await api.generations.create({
        persona_id: personaId,
        template_id: templateId,
        num_variations: numVars,
        resolution: model.resolution as "1k" | "2k" | "4k",
        aspect_ratio: ratio,
        model: model.model,
      } as any);
      setGeneration(g as Generation);
      toast({ title: "Geração iniciada", description: "Aguarde alguns segundos..." });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro desconhecido";
      const offline = e instanceof TypeError; // fetch network error
      toast({
        title: offline ? "Backend offline" : "Falha ao gerar",
        description: offline
          ? "api.refinecubo.com.br ainda não respondeu. Verifique se o FastAPI está no ar."
          : msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl animate-fade-in gap-8 lg:grid-cols-5">
      {/* Controls */}
      <div className="space-y-6 rounded-2xl border border-border bg-background p-6 lg:col-span-2">
        <div>
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Gerar</div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova geração</h1>
        </div>

        <Pills label="Aspect ratio" options={ratios} value={ratio} onChange={setRatio} />
        <ModelSelector value={model} onChange={setModel} />
        <Pills label="Variações" options={variations.map(String)} value={String(numVars)} onChange={v => setNumVars(Number(v))} />

        <ImageUpload
          bucket="generation-refs"
          label="Imagem de referência (opcional)"
          hint="Inspiração para estilo/pose — JPG, PNG, WebP"
          value={refPath}
          onChange={(path) => setRefPath(path)}
        />

        <div className="rounded-md border border-primary/30 bg-primary-light p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Custo estimado</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-primary">{totalCost || "..."}</span>
            <span className="text-sm text-muted-foreground">créditos</span>
          </div>
        </div>

        <Button type="button" size="lg" variant="hero" className="w-full" onClick={handleGenerate} disabled={submitting || !costPreview}>
          {submitting ? <><Loader2 className="animate-spin" /> Enviando...</> : <><Sparkles /> Gerar ({totalCost} créditos)</>}
        </Button>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-dashed border-border bg-surface p-6 lg:col-span-3">
        {!generation && (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-background">
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Sua geração aparecerá aqui</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Configure as opções à esquerda e clique em gerar.</p>
          </div>
        )}

        {generation && generation.status !== "completed" && generation.status !== "failed" && (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Gerando suas fotos...</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Status: {generation.status}</p>
          </div>
        )}

        {generation?.status === "completed" && (
          <div className="grid grid-cols-2 gap-3">
            {generation.image_urls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-full rounded-xl object-cover" />
            ))}
          </div>
        )}

        {generation?.status === "failed" && (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
            <h3 className="text-lg font-semibold text-destructive">Geração falhou</h3>
            <Button variant="outline" className="mt-4" onClick={handleGenerate}>Tentar novamente</Button>
          </div>
        )}
      </div>
    </div>
  );
}
