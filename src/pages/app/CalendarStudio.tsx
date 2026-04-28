import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Sparkles, Loader2, Package, Clock, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, ApiError, type Persona } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Pack = { key: string; name: string; description: string; category: string; duration_days: number };

export default function CalendarStudio() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [packs, setPacks] = useState<Pack[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<string>("lifestyle_30d");
  const [personaId, setPersonaId] = useState<string>("");
  const [name, setName] = useState("Conteúdo do mês");
  const [brief, setBrief] = useState("");
  const [customPrompts, setCustomPrompts] = useState("");
  const [nPosts, setNPosts] = useState(30);
  const [enhanceSkin, setEnhanceSkin] = useState(true);
  const [upscale, setUpscale] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.calendar.packs().then(setPacks).catch(() => setPacks([]));
    api.personas.list().then(setPersonas).catch(() => setPersonas([]));
    api.calendar.list().then(setCalendars).catch(() => setCalendars([]));
  }, []);

  const selectedPackData = packs.find(p => p.key === selectedPack);
  const cost = (upscale ? 13 : 8) * nPosts;

  const submitPack = async () => {
    if (!personaId) {
      toast({ title: "Selecione uma persona", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.calendar.create({
        persona_id: personaId,
        name,
        brief: brief || undefined,
        pack_key: selectedPack,
        n_posts: nPosts,
        enhance_skin: enhanceSkin,
        upscale,
      });
      toast({
        title: "Calendário disparado",
        description: `${r.n_posts} posts em geração. ${r.total_credits} créditos usados.`,
      });
      const list = await api.calendar.list();
      setCalendars(list);
    } catch (e) {
      toast({
        title: "Falha",
        description: e instanceof ApiError ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitCustom = async () => {
    const lines = customPrompts.split("\n").map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "Adicione pelo menos 1 prompt", variant: "destructive" });
      return;
    }
    if (!personaId) {
      toast({ title: "Selecione uma persona", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.calendar.create({
        persona_id: personaId,
        name,
        brief: brief || undefined,
        custom_prompts: lines,
        n_posts: lines.length,
        enhance_skin: enhanceSkin,
        upscale,
      });
      toast({
        title: "Calendário customizado disparado",
        description: `${r.n_posts} posts em geração. ${r.total_credits} créditos usados.`,
      });
      const list = await api.calendar.list();
      setCalendars(list);
    } catch (e) {
      toast({
        title: "Falha",
        description: e instanceof ApiError ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-suite animate-fade-in">
      <div className="mb-8">
        <div className="eyebrow eyebrow-dot mb-4">Content Calendar</div>
        <h1 className="display-2 mb-3">Gere o <span className="text-gradient-copper">mês inteiro</span><br />em 1 clique.</h1>
        <p className="lead">
          Brief + persona + N posts → calendário automatizado. A Refine monta as imagens,
          variações de cenário e dispara em batch.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* FORM */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pack" className="w-full">
            <TabsList className="mb-6 inline-flex h-auto rounded-full border border-border bg-surface/40 p-1">
              <TabsTrigger value="pack" className="rounded-full px-5 py-2 text-sm">
                <Package className="mr-2 h-4 w-4" /> Pack pré-curado
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-full px-5 py-2 text-sm">
                <Sparkles className="mr-2 h-4 w-4" /> Prompts customizados
              </TabsTrigger>
            </TabsList>

            {/* SHARED FIELDS */}
            <div className="mb-6 space-y-4 rounded-2xl border border-border bg-surface/40 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Persona</Label>
                  <Select value={personaId} onValueChange={setPersonaId}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {personas.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nome do calendário</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="mt-2" />
                </div>
              </div>
              <div>
                <Label>Brief / contexto do mês <span className="text-foreground-muted">(opcional)</span></Label>
                <Textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder="Ex: Lançamento da coleção verão tropical com foco em Ibiza/Mykonos. Vibe luxo descolada."
                  rows={3}
                  className="mt-2"
                />
                <p className="mt-1.5 text-xs text-foreground-muted">
                  Esse brief é concatenado a CADA prompt de imagem pra contextualizar.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={enhanceSkin} onCheckedChange={setEnhanceSkin} />
                  <Label className="cursor-pointer">Skin enhance</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={upscale} onCheckedChange={setUpscale} />
                  <Label className="cursor-pointer">Magnific upscale 4K</Label>
                </div>
              </div>
            </div>

            <TabsContent value="pack">
              <div className="space-y-4">
                <div>
                  <Label>Pack</Label>
                  <Select value={selectedPack} onValueChange={(v) => {
                    setSelectedPack(v);
                    const p = packs.find(x => x.key === v);
                    if (p) setNPosts(p.duration_days);
                  }}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {packs.map(p => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.name} ({p.duration_days} dias)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPackData && (
                    <p className="mt-2 text-sm text-foreground-muted">{selectedPackData.description}</p>
                  )}
                </div>

                <div>
                  <Label>Número de posts</Label>
                  <Input
                    type="number" min={1} max={60}
                    value={nPosts}
                    onChange={e => setNPosts(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">Custo total</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-gradient-copper">{cost}</span>
                    <span className="text-sm text-foreground-muted">créditos · {nPosts} posts</span>
                  </div>
                </div>

                <Button onClick={submitPack} disabled={submitting} className="w-full" size="lg">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Gerar {nPosts} posts ({cost} créditos)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="custom">
              <div className="space-y-4">
                <div>
                  <Label>Prompts customizados (1 por linha)</Label>
                  <Textarea
                    value={customPrompts}
                    onChange={e => setCustomPrompts(e.target.value)}
                    placeholder={`mediterranean café, golden hour, white outfit\nrooftop NYC sunset, casual chic\npilates studio mirror, athletic wear\n...`}
                    rows={12}
                    className="mt-2 font-mono text-xs"
                  />
                  <p className="mt-1.5 text-xs text-foreground-muted">
                    Cada linha vira 1 post. {customPrompts.split("\n").filter(s => s.trim()).length} prompts detectados.
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">Custo total</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-gradient-copper">
                      {(upscale ? 13 : 8) * customPrompts.split("\n").filter(s => s.trim()).length}
                    </span>
                    <span className="text-sm text-foreground-muted">créditos</span>
                  </div>
                </div>

                <Button onClick={submitCustom} disabled={submitting} className="w-full" size="lg">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Gerar calendário customizado
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* HISTORY SIDEBAR */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" /> Histórico
          </h3>
          {calendars.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
              Nenhum calendário gerado ainda.
            </p>
          ) : (
            calendars.map(c => (
              <div key={c.id} className="rounded-xl border border-border bg-surface/40 p-4 transition-colors hover:border-primary/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
                      {c.n_posts} posts · {c.status}
                    </div>
                    {c.start_date && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-foreground-muted">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.start_date).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/app/generations?calendar=${c.id}`)}
                    className="text-foreground-muted hover:text-primary"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
