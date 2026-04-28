import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Layers, Loader2, Sparkles, Video } from "lucide-react";
import { api, ApiError, type Persona, type Template } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const VIDEO_ENGINES = [
  { value: "kling_v3", label: "Kling V3" },
  { value: "kling_v2_1", label: "Kling V2.1" },
  { value: "hailuo", label: "Hailuo" },
  { value: "wan_2_1", label: "Wan 2.1" },
  { value: "runway", label: "Runway" },
];

export default function BatchStudio() {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Imagens
  const [personaId, setPersonaId] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [numPerTemplate, setNumPerTemplate] = useState(2);
  const [submittingImg, setSubmittingImg] = useState(false);

  // Vídeos
  const [imageUrls, setImageUrls] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [engine, setEngine] = useState(VIDEO_ENGINES[0].value);
  const [submittingVid, setSubmittingVid] = useState(false);

  useEffect(() => {
    Promise.all([api.personas.list(), api.templates.list()])
      .then(([p, t]) => { setPersonas(p); setTemplates(t); })
      .catch((e) => toast({ title: "Falha ao carregar dados", description: String(e?.message ?? e), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const totalImageJobs = selectedTemplates.length * numPerTemplate;

  const videoLines = useMemo(
    () => imageUrls.split("\n").map((l) => l.trim()).filter(Boolean),
    [imageUrls],
  );

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submitImages = async () => {
    if (!personaId || selectedTemplates.length === 0) return;
    setSubmittingImg(true);
    try {
      const r = await api.batch.images({
        persona_id: personaId,
        template_ids: selectedTemplates,
        num_per_template: numPerTemplate,
      });
      toast({
        title: "Batch criado",
        description: `${r.total_jobs} jobs · ${r.credits_used} créditos`,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha no batch", description: msg, variant: "destructive" });
    } finally {
      setSubmittingImg(false);
    }
  };

  const submitVideos = async () => {
    if (videoLines.length === 0 || !videoPrompt.trim()) return;
    setSubmittingVid(true);
    try {
      const r = await api.batch.videos({
        image_urls: videoLines,
        prompt: videoPrompt.trim(),
        engine,
      });
      toast({
        title: "Batch de vídeo criado",
        description: `${r.total_jobs} jobs · ${r.credits_used} créditos`,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha no batch", description: msg, variant: "destructive" });
    } finally {
      setSubmittingVid(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      <div>
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Batch</div>
        <h1 className="text-3xl font-semibold tracking-tight">Geração em lote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dispare várias gerações de uma vez — economia de tempo e fila otimizada.
        </p>
      </div>

      <Tabs defaultValue="images" className="space-y-6">
        <TabsList>
          <TabsTrigger value="images"><Sparkles className="mr-2 h-4 w-4" /> Imagens</TabsTrigger>
          <TabsTrigger value="videos"><Video className="mr-2 h-4 w-4" /> Vídeos</TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-border bg-background p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Persona</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={personaId}
                onChange={(e) => setPersonaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Templates ({selectedTemplates.length} selecionados)</label>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border border-border bg-surface p-3 sm:grid-cols-2">
                {loading && <div className="font-mono text-xs text-muted-foreground">Carregando...</div>}
                {!loading && templates.length === 0 && (
                  <div className="font-mono text-xs text-muted-foreground">Nenhum template disponível.</div>
                )}
                {templates.map((t) => {
                  const checked = selectedTemplates.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${checked ? "border-primary bg-primary-light/40" : "border-border bg-background hover:border-primary/40"}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleTemplate(t.id)} className="mt-0.5" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{t.name}</div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t.category}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Variações por template: <span className="font-mono text-primary">{numPerTemplate}</span>
              </label>
              <Slider
                value={[numPerTemplate]}
                onValueChange={(v) => setNumPerTemplate(v[0])}
                min={1}
                max={6}
                step={1}
              />
            </div>

            <div className="rounded-md border border-primary/30 bg-primary-light p-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Total de jobs</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-primary">{totalImageJobs}</span>
                <span className="text-sm text-muted-foreground">imagens</span>
              </div>
            </div>

            <Button
              onClick={submitImages}
              disabled={submittingImg || !personaId || selectedTemplates.length === 0}
              size="lg"
              className="w-full"
            >
              {submittingImg ? <><Loader2 className="animate-spin" /> Criando batch...</> : <><Layers /> Disparar batch ({totalImageJobs})</>}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-border bg-background p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">URLs das imagens (1 por linha)</label>
              <Textarea
                rows={6}
                placeholder={"https://...\nhttps://...\nhttps://..."}
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
              />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {videoLines.length} URLs detectadas
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt de animação</label>
              <Textarea
                rows={3}
                placeholder="Movimento sutil de cabeça, vento leve no cabelo..."
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Engine</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
              >
                {VIDEO_ENGINES.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={submitVideos}
              disabled={submittingVid || videoLines.length === 0 || !videoPrompt.trim()}
              size="lg"
              className="w-full"
            >
              {submittingVid ? <><Loader2 className="animate-spin" /> Criando batch...</> : <><Video /> Disparar batch ({videoLines.length})</>}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
