import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Upload, X, Sparkles, Hash, BookOpen, LayoutList, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const TONES = ["casual", "professional", "playful", "luxury", "inspirational", "edgy", "minimal", "poetic"];
const LANGS = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

function MiniDrop({ label, value, onChange }: { label: string; value: string | null; onChange: (url: string | null) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (f: File) => {
    if (!user) return toast({ title: "Faça login", variant: "destructive" });
    setBusy(true);
    try {
      const ext = f.name.split(".").pop() ?? "png";
      const path = `${user.id}/captions/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("generation-refs").upload(path, f, { upsert: false, contentType: f.type });
      if (error) throw error;
      const { data } = await supabase.storage.from("generation-refs").createSignedUrl(path, 3600);
      onChange(data?.signedUrl ?? null);
    } catch (e: any) {
      toast({ title: "Erro upload", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div onClick={() => !busy && ref.current?.click()} className="mt-2 relative flex min-h-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface text-center transition-colors hover:border-primary/40">
        {value ? (
          <>
            <img src={value} alt="" className="h-40 w-full object-cover" />
            <button onClick={(e) => { e.stopPropagation(); onChange(null); }} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90"><X className="h-3.5 w-3.5" /></button>
          </>
        ) : busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
          <div className="p-3">
            <Upload className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-xs">Clique para enviar</p>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </div>
  );
}

/* ───── CAPTION ───── */
function CaptionTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [tone, setTone] = useState("casual");
  const [lang, setLang] = useState("pt");
  const [maxLen, setMaxLen] = useState(280);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<string | null>(null);

  const submit = async () => {
    if (!src) return toast({ title: "Imagem obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.captions.caption({ image_url: src, tone, language: lang, max_length: maxLen });
      setOut(r.caption);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Caption</div>
      <h3 className="display-2 mb-1">Legenda inteligente</h3>
      <p className="lead mb-6">Gere uma legenda perfeita a partir da imagem.</p>

      <div className="space-y-5">
        <MiniDrop label="Imagem" value={src} onChange={setSrc} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Tom</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Idioma</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Tamanho máximo <span className="font-mono text-[10px] text-muted-foreground">({maxLen} chars)</span></Label>
          <Slider min={50} max={1000} step={10} value={[maxLen]} onValueChange={v => setMaxLen(v[0])} className="mt-3" />
        </div>
        <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : <><Sparkles className="h-4 w-4" /> Gerar legenda</>}
        </Button>

        {out && (
          <div className="rounded-xl border border-primary/30 bg-primary-light/10 p-4">
            <div className="eyebrow eyebrow-dot mb-3">Legenda</div>
            <p className="whitespace-pre-wrap text-sm">{out}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ───── HASHTAGS ───── */
function HashtagsTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [count, setCount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<string[] | null>(null);

  const submit = async () => {
    if (!src) return toast({ title: "Imagem obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.captions.hashtags({ image_url: src, count });
      setOut(r.hashtags);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Hashtags</div>
      <h3 className="display-2 mb-1">Hashtags em segundos</h3>
      <p className="lead mb-6">Cluster otimizado pra engajamento.</p>

      <div className="space-y-5">
        <MiniDrop label="Imagem" value={src} onChange={setSrc} />
        <div>
          <Label>Quantidade <span className="font-mono text-[10px] text-muted-foreground">({count})</span></Label>
          <Slider min={5} max={30} step={1} value={[count]} onValueChange={v => setCount(v[0])} className="mt-3" />
        </div>
        <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : <><Hash className="h-4 w-4" /> Gerar hashtags</>}
        </Button>

        {out && (
          <div className="rounded-xl border border-primary/30 bg-primary-light/10 p-4">
            <div className="eyebrow eyebrow-dot mb-3">{out.length} hashtags</div>
            <div className="flex flex-wrap gap-2">
              {out.map((h, i) => (
                <span key={i} className="rounded-full border border-primary/30 bg-primary-light/20 px-3 py-1 font-mono text-xs text-primary">{h.startsWith("#") ? h : `#${h}`}</span>
              ))}
            </div>
            <button onClick={() => navigator.clipboard.writeText(out.map(h => h.startsWith("#") ? h : `#${h}`).join(" "))} className="mt-3 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline">
              Copiar todas
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ───── STORY ───── */
function StoryTab() {
  const { toast } = useToast();
  const [theme, setTheme] = useState("");
  const [n, setN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[] | null>(null);

  const submit = async () => {
    if (!theme.trim()) return toast({ title: "Tema obrigatório", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.captions.story({ theme, n_posts: n });
      setPosts(r.posts);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Story Sequence</div>
      <h3 className="display-2 mb-1">Sequência narrativa</h3>
      <p className="lead mb-6">Crie uma série coerente de posts a partir de um tema.</p>

      <div className="space-y-5">
        <div><Label>Tema</Label><Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Rotina matinal de uma modelo influencer" className="mt-2" /></div>
        <div>
          <Label>Posts <span className="font-mono text-[10px] text-muted-foreground">({n})</span></Label>
          <Slider min={3} max={15} step={1} value={[n]} onValueChange={v => setN(v[0])} className="mt-3" />
        </div>
        <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Compondo...</> : <><BookOpen className="h-4 w-4" /> Gerar sequência</>}
        </Button>

        {posts && (
          <div className="space-y-3">
            {posts.map((p, i) => (
              <motion.div key={i} {...fadeUp(i * 0.05)} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-light/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">Post {i + 1}</div>
                {p.prompt && <div className="mb-2"><div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Prompt</div><p className="text-sm">{p.prompt}</p></div>}
                {p.caption && <div className="mb-2"><div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Caption</div><p className="text-sm">{p.caption}</p></div>}
                {p.hashtags && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Hashtags</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(Array.isArray(p.hashtags) ? p.hashtags : String(p.hashtags).split(/\s+/)).map((h: string, j: number) => (
                        <span key={j} className="rounded-full border border-primary/20 bg-primary-light/10 px-2 py-0.5 font-mono text-[10px] text-primary">{h.startsWith("#") ? h : `#${h}`}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ───── CAROUSEL ───── */
function CarouselTab() {
  const { toast } = useToast();
  const [brief, setBrief] = useState("");
  const [n, setN] = useState(7);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<string[] | null>(null);

  const submit = async () => {
    if (!brief.trim()) return toast({ title: "Brief obrigatório", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.captions.carousel({ brief, n_posts: n });
      setOut(r.prompts);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Carousel Prompts</div>
      <h3 className="display-2 mb-1">Carrossel pronto pra gerar</h3>
      <p className="lead mb-6">A partir de um brief, gere prompts conectados pra cada slide.</p>

      <div className="space-y-5">
        <div><Label>Brief</Label><Textarea value={brief} onChange={e => setBrief(e.target.value)} rows={4} placeholder="Carrossel mostrando uma modelo testando 5 looks de outono em Paris..." className="mt-2" /></div>
        <div>
          <Label>Slides <span className="font-mono text-[10px] text-muted-foreground">({n})</span></Label>
          <Slider min={3} max={10} step={1} value={[n]} onValueChange={v => setN(v[0])} className="mt-3" />
        </div>
        <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Compondo...</> : <><LayoutList className="h-4 w-4" /> Gerar prompts</>}
        </Button>

        {out && (
          <div className="space-y-2">
            {out.map((p, i) => (
              <motion.div key={i} {...fadeUp(i * 0.04)} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-light/20 font-mono text-xs text-primary">{i + 1}</div>
                <p className="text-sm">{p}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ───── BRAND VOICE ───── */
function BrandVoiceTab() {
  const { toast } = useToast();
  const [samples, setSamples] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const submit = async () => {
    const lines = samples.split("\n").map(s => s.trim()).filter(Boolean);
    if (lines.length < 3) return toast({ title: "Mínimo 3 amostras", description: "Cole de 3 a 20 textos, um por linha.", variant: "destructive" });
    if (lines.length > 20) return toast({ title: "Máximo 20 amostras", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.captions.brandVoice({ text_samples: lines });
      setAnalysis(r.analysis);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Brand Voice</div>
      <h3 className="display-2 mb-1">Análise de tom de marca</h3>
      <p className="lead mb-6">Cole de 3 a 20 textos da sua marca (um por linha) — gere o profile completo.</p>

      <div className="space-y-5">
        <div><Label>Amostras (uma por linha)</Label><Textarea value={samples} onChange={e => setSamples(e.target.value)} rows={10} placeholder={"Texto 1\nTexto 2\nTexto 3..."} className="mt-2 font-mono text-xs" /></div>
        <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</> : <><Mic className="h-4 w-4" /> Analisar voz</>}
        </Button>

        {analysis && (
          <div className="rounded-xl border border-primary/30 bg-primary-light/10 p-4">
            <div className="eyebrow eyebrow-dot mb-3">Brand voice profile</div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-background/60 p-3 font-mono text-[11px] text-foreground-dim">
              {typeof analysis === "string" ? analysis : JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function CaptionsStudio() {
  return (
    <div className="container-suite animate-fade-in">
      <motion.header {...fadeUp()} className="mb-10">
        <div className="eyebrow eyebrow-dot mb-3">Captions Studio</div>
        <h1 className="display-2 mb-3 text-gradient-copper">IA de texto para conteúdo</h1>
        <p className="lead">Captions, hashtags, sequências de posts, prompts de carrossel e análise de brand voice.</p>
      </motion.header>

      <Tabs defaultValue="caption" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="caption">Caption</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          <TabsTrigger value="story">Story</TabsTrigger>
          <TabsTrigger value="carousel">Carousel</TabsTrigger>
          <TabsTrigger value="brand">Brand Voice</TabsTrigger>
        </TabsList>
        <TabsContent value="caption"><CaptionTab /></TabsContent>
        <TabsContent value="hashtags"><HashtagsTab /></TabsContent>
        <TabsContent value="story"><StoryTab /></TabsContent>
        <TabsContent value="carousel"><CarouselTab /></TabsContent>
        <TabsContent value="brand"><BrandVoiceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
