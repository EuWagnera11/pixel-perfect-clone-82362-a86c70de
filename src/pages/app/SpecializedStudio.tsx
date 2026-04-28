import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Loader2, Upload, X, RotateCw, Scissors, Smile, Hourglass, Users, Briefcase,
  ShoppingBag, Home, UtensilsCrossed, Newspaper, Youtube, IdCard, Baby, Heart,
  UsersRound, Sparkles, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

/* ───────── Mini dropzone (returns signed URL) ───────── */
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
      const path = `${user.id}/specialized/${crypto.randomUUID()}.${ext}`;
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
      <div onClick={() => !busy && ref.current?.click()} className="mt-2 relative flex min-h-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface text-center transition-colors hover:border-primary/40">
        {value ? (
          <>
            <img src={value} alt="" className="h-32 w-full object-cover" />
            <button onClick={(e) => { e.stopPropagation(); onChange(null); }} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90"><X className="h-3.5 w-3.5" /></button>
          </>
        ) : busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
          <div className="p-3">
            <Upload className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-xs">Clique para enviar</p>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </div>
  );
}

/* ───────── Polling hook ───────── */
function useTaskPolling(taskId: string | null) {
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<string | string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    setResult(null);
    setError(null);
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const r = await api.enhance.task(taskId);
        if (stop) return;
        setStatus(r?.status ?? "");
        const done = ["completed", "COMPLETED", "succeeded", "ready"].includes(r?.status);
        const failed = ["failed", "FAILED", "error"].includes(r?.status);
        if (done) {
          const u = r?.urls ?? r?.output_urls ?? r?.output_url ?? r?.url ?? r?.image_url;
          setResult(u ?? null);
        } else if (failed) {
          setError("Tarefa falhou");
        } else {
          timer = setTimeout(tick, 2500);
        }
      } catch (e: any) {
        if (!stop) setError(e?.message ?? "Erro");
      }
    };
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [taskId]);

  return { status, result, error };
}

function ResultBlock({ direct, taskId }: { direct?: string | string[] | null; taskId?: string | null }) {
  const polled = useTaskPolling(taskId ?? null);
  const out = direct ?? polled.result;
  const error = polled.error;
  if (!direct && !taskId) return null;
  return (
    <div className="mt-5 rounded-xl border border-primary/30 bg-primary-light/10 p-4">
      <div className="eyebrow eyebrow-dot mb-3">Resultado</div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && !out && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Processando...</div>}
      {out && (Array.isArray(out)
        ? <div className="grid grid-cols-2 gap-3">{out.map((u, i) => <img key={i} src={u} alt="" className="w-full rounded-lg" />)}</div>
        : <img src={out} alt="" className="w-full rounded-lg" />)}
    </div>
  );
}

/* ───────── Card grid ───────── */
type CardDef = {
  id: string;
  title: string;
  desc: string;
  icon: ReactNode;
  Form: React.FC<{ onClose: () => void }>;
};

function ToolCard({ card, onOpen }: { card: CardDef; onOpen: () => void }) {
  return (
    <motion.button {...fadeUp()} onClick={onOpen} className="tool-card p-6 text-left">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary-light/20 text-primary">{card.icon}</div>
      <h3 className="mb-1 text-lg font-semibold">{card.title}</h3>
      <p className="text-sm text-muted-foreground">{card.desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
        Abrir <Sparkles className="h-3 w-3" />
      </div>
    </motion.button>
  );
}

/* ───────── Forms ───────── */

function FormMultiView({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [angles, setAngles] = useState(4);
  const [out, setOut] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref) return toast({ title: "Persona ref obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.multiView({ persona_ref: ref, num_angles: angles });
      setOut(r.urls);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona reference" value={ref} onChange={setRef} />
      <div>
        <Label>Número de ângulos <span className="font-mono text-[10px] text-muted-foreground">({angles})</span></Label>
        <Slider min={2} max={8} step={1} value={[angles]} onValueChange={v => setAngles(v[0])} className="mt-3" />
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><RotateCw className="h-4 w-4" /> Gerar ângulos</>}
      </Button>
      <ResultBlock direct={out} />
    </div>
  );
}

function FormHair({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!src) return toast({ title: "Envie imagem", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.hairChange({ image_url: src, color: color || undefined, style: style || undefined });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Imagem" value={src} onChange={setSrc} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div><Label>Cor</Label><Input value={color} onChange={e => setColor(e.target.value)} placeholder="copper, platinum blonde, jet black" className="mt-2" /></div>
        <div><Label>Estilo</Label><Input value={style} onChange={e => setStyle(e.target.value)} placeholder="long waves, pixie cut, bob" className="mt-2" /></div>
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Scissors className="h-4 w-4" /> Aplicar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormExpression({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [expr, setExpr] = useState("smile");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!src) return toast({ title: "Envie imagem", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.expressionChange({ image_url: src, expression: expr });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Imagem" value={src} onChange={setSrc} />
      <div>
        <Label>Expressão</Label>
        <Select value={expr} onValueChange={setExpr}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="smile">Smile</SelectItem>
            <SelectItem value="serious">Serious</SelectItem>
            <SelectItem value="laughing">Laughing</SelectItem>
            <SelectItem value="surprised">Surprised</SelectItem>
            <SelectItem value="peaceful">Peaceful</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Smile className="h-4 w-4" /> Aplicar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormAge({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [age, setAge] = useState(30);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!src) return toast({ title: "Envie imagem", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.ageChange({ image_url: src, target_age: age });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Imagem" value={src} onChange={setSrc} />
      <div>
        <Label>Idade alvo <span className="font-mono text-[10px] text-muted-foreground">({age} anos)</span></Label>
        <Slider min={5} max={90} step={1} value={[age]} onValueChange={v => setAge(v[0])} className="mt-3" />
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Hourglass className="h-4 w-4" /> Aplicar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormTwin({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [scene, setScene] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref || !scene.trim()) return toast({ title: "Persona + scene obrigatórios", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.twin({ persona_ref: ref, scene_prompt: scene });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona reference" value={ref} onChange={setRef} />
      <div><Label>Cena</Label><Textarea value={scene} onChange={e => setScene(e.target.value)} rows={3} placeholder="Duas gêmeas idênticas conversando em café parisiense..." className="mt-2" /></div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Users className="h-4 w-4" /> Gerar gêmeas</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormHeadshot({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [style, setStyle] = useState<"corporate" | "creative" | "casual" | "editorial">("corporate");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref) return toast({ title: "Persona obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.headshotPro({ persona_ref: ref, style });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona reference" value={ref} onChange={setRef} />
      <div>
        <Label>Estilo</Label>
        <Select value={style} onValueChange={(v) => setStyle(v as any)}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="creative">Creative</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="editorial">Editorial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Briefcase className="h-4 w-4" /> Gerar headshot</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormEcom({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<"white_bg" | "lifestyle" | "luxury">("white_bg");
  const [scene, setScene] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!src) return toast({ title: "Imagem obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.ecommerce({ product_image_url: src, mode, scene_prompt: scene || undefined });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Produto" value={src} onChange={setSrc} />
      <div>
        <Label>Modo</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as any)}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="white_bg">White background</SelectItem>
            <SelectItem value="lifestyle">Lifestyle</SelectItem>
            <SelectItem value="luxury">Luxury</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Cena (opcional)</Label><Textarea value={scene} onChange={e => setScene(e.target.value)} rows={2} className="mt-2" /></div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><ShoppingBag className="h-4 w-4" /> Gerar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormRealEstate({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [style, setStyle] = useState("modern");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!src) return toast({ title: "Imagem obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.realEstate({ property_image_url: src, style });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Imóvel" value={src} onChange={setSrc} />
      <div>
        <Label>Estilo decoração</Label>
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="modern">Modern</SelectItem>
            <SelectItem value="scandinavian">Scandinavian</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
            <SelectItem value="boho">Boho</SelectItem>
            <SelectItem value="classic">Classic</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Home className="h-4 w-4" /> Aplicar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormFood({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [mood, setMood] = useState("rustic");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!src) return toast({ title: "Imagem obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.food({ food_image_url: src, mood });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Comida" value={src} onChange={setSrc} />
      <div>
        <Label>Mood</Label>
        <Select value={mood} onValueChange={setMood}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rustic">Rustic</SelectItem>
            <SelectItem value="luxury">Luxury</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
            <SelectItem value="vibrant">Vibrant</SelectItem>
            <SelectItem value="moody">Moody/dark</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><UtensilsCrossed className="h-4 w-4" /> Gerar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormMagazine({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [name, setName] = useState("VOGUE");
  const [theme, setTheme] = useState("");
  const [headline, setHeadline] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref) return toast({ title: "Persona obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.magazineCover({ persona_ref: ref, magazine_name: name, theme: theme || undefined, headline: headline || undefined });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona" value={ref} onChange={setRef} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div><Label>Revista</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-2" /></div>
        <div><Label>Tema</Label><Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Summer issue" className="mt-2" /></div>
      </div>
      <div><Label>Headline</Label><Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="The new icon of fashion" className="mt-2" /></div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Newspaper className="h-4 w-4" /> Gerar capa</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormThumb({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [theme, setTheme] = useState("");
  const [bigText, setBigText] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref || !theme.trim()) return toast({ title: "Persona + tema obrigatórios", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.youtubeThumbnail({ persona_ref: ref, theme, big_text: bigText || undefined });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona" value={ref} onChange={setRef} />
      <div><Label>Tema</Label><Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Tutorial de IA" className="mt-2" /></div>
      <div><Label>Texto grande</Label><Input value={bigText} onChange={e => setBigText(e.target.value)} placeholder="GANHEI 10K!" className="mt-2" /></div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Youtube className="h-4 w-4" /> Gerar thumb</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormPassport({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref) return toast({ title: "Persona obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.passport({ persona_ref: ref });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona" value={ref} onChange={setRef} />
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><IdCard className="h-4 w-4" /> Gerar passport</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormMaternity({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(34);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref) return toast({ title: "Persona obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.maternity({ persona_ref: ref, weeks });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona" value={ref} onChange={setRef} />
      <div>
        <Label>Semanas <span className="font-mono text-[10px] text-muted-foreground">({weeks})</span></Label>
        <Slider min={28} max={40} step={1} value={[weeks]} onValueChange={v => setWeeks(v[0])} className="mt-3" />
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Baby className="h-4 w-4" /> Gerar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormWedding({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [ref, setRef] = useState<string | null>(null);
  const [scene, setScene] = useState("garden");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ref) return toast({ title: "Persona obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.wedding({ persona_ref: ref, scene });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Persona" value={ref} onChange={setRef} />
      <div>
        <Label>Cenário</Label>
        <Select value={scene} onValueChange={setScene}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="garden">Garden</SelectItem>
            <SelectItem value="beach">Beach</SelectItem>
            <SelectItem value="indoor">Indoor</SelectItem>
            <SelectItem value="mountain">Mountain</SelectItem>
            <SelectItem value="vineyard">Vineyard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Heart className="h-4 w-4" /> Gerar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormFamily({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [refs, setRefs] = useState<(string | null)[]>([null, null]);
  const [scene, setScene] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setRef = (i: number, v: string | null) => setRefs(refs.map((r, j) => j === i ? v : r));

  const submit = async () => {
    const filled = refs.filter(Boolean) as string[];
    if (filled.length < 2) return toast({ title: "Pelo menos 2 personas", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.familyPortrait({ persona_refs: filled, scene: scene || undefined });
      setTaskId(r.task_id);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {refs.map((r, i) => (
          <MiniDrop key={i} label={`Persona ${i + 1}`} value={r} onChange={(v) => setRef(i, v)} />
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setRefs([...refs, null])}>+ Adicionar</Button>
        {refs.length > 2 && <Button variant="ghost" size="sm" onClick={() => setRefs(refs.slice(0, -1))}>- Remover</Button>}
      </div>
      <div><Label>Cena</Label><Textarea value={scene} onChange={e => setScene(e.target.value)} rows={2} placeholder="Família no parque ao pôr-do-sol..." className="mt-2" /></div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><UsersRound className="h-4 w-4" /> Gerar</>}
      </Button>
      <ResultBlock taskId={taskId} />
    </div>
  );
}

function FormRestoration({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [colorize, setColorize] = useState(true);
  const [upscale, setUpscale] = useState(true);
  const [out, setOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!src) return toast({ title: "Imagem obrigatória", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.specialized.photoRestoration({ image_url: src, colorize, upscale });
      setOut(r.final);
    } catch (e) { toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <MiniDrop label="Foto antiga" value={src} onChange={setSrc} />
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2"><Checkbox checked={colorize} onCheckedChange={(v) => setColorize(!!v)} /> <span className="text-sm">Colorizar</span></label>
        <label className="flex items-center gap-2"><Checkbox checked={upscale} onCheckedChange={(v) => setUpscale(!!v)} /> <span className="text-sm">Upscale</span></label>
      </div>
      <Button className="btn-pill-primary w-full" disabled={loading} onClick={submit}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Restaurando...</> : <><Wand2 className="h-4 w-4" /> Restaurar</>}
      </Button>
      <ResultBlock direct={out} />
    </div>
  );
}

const CARDS: CardDef[] = [
  { id: "multiview", title: "Multi-View", desc: "Gere múltiplos ângulos da persona em consistência.", icon: <RotateCw className="h-5 w-5" />, Form: FormMultiView },
  { id: "hair", title: "Hair Change", desc: "Mude cor ou estilo do cabelo preservando o rosto.", icon: <Scissors className="h-5 w-5" />, Form: FormHair },
  { id: "expression", title: "Expression Change", desc: "Substitua a expressão facial.", icon: <Smile className="h-5 w-5" />, Form: FormExpression },
  { id: "age", title: "Age Change", desc: "Envelheça ou rejuvenesça mantendo identidade.", icon: <Hourglass className="h-5 w-5" />, Form: FormAge },
  { id: "twin", title: "Twin Generation", desc: "Crie gêmeas idênticas em uma única cena.", icon: <Users className="h-5 w-5" />, Form: FormTwin },
  { id: "headshot", title: "Headshot Pro", desc: "Retratos corporativos premium.", icon: <Briefcase className="h-5 w-5" />, Form: FormHeadshot },
  { id: "ecom", title: "E-commerce", desc: "Imagens de produto para marketplace.", icon: <ShoppingBag className="h-5 w-5" />, Form: FormEcom },
  { id: "realestate", title: "Real Estate", desc: "Decoração virtual de imóveis.", icon: <Home className="h-5 w-5" />, Form: FormRealEstate },
  { id: "food", title: "Food Photography", desc: "Fotografia gastronômica profissional.", icon: <UtensilsCrossed className="h-5 w-5" />, Form: FormFood },
  { id: "magazine", title: "Magazine Cover", desc: "Capa estilo VOGUE/GQ.", icon: <Newspaper className="h-5 w-5" />, Form: FormMagazine },
  { id: "thumb", title: "YouTube Thumbnail", desc: "Thumbnails virais com texto grande.", icon: <Youtube className="h-5 w-5" />, Form: FormThumb },
  { id: "passport", title: "Passport Photo", desc: "Foto 3x4 padrão internacional.", icon: <IdCard className="h-5 w-5" />, Form: FormPassport },
  { id: "maternity", title: "Maternity", desc: "Ensaio gestante na semana certa.", icon: <Baby className="h-5 w-5" />, Form: FormMaternity },
  { id: "wedding", title: "Wedding", desc: "Ensaio de casamento em cenário a escolha.", icon: <Heart className="h-5 w-5" />, Form: FormWedding },
  { id: "family", title: "Family Portrait", desc: "Retrato familiar com várias personas.", icon: <UsersRound className="h-5 w-5" />, Form: FormFamily },
  { id: "restoration", title: "Photo Restoration", desc: "Restauração de fotos antigas + cor + upscale.", icon: <Sparkles className="h-5 w-5" />, Form: FormRestoration },
];

export default function SpecializedStudio() {
  const [open, setOpen] = useState<string | null>(null);
  const active = CARDS.find(c => c.id === open);
  const ActiveForm = active?.Form;

  return (
    <div className="container-suite animate-fade-in">
      <motion.header {...fadeUp()} className="mb-10">
        <div className="eyebrow eyebrow-dot mb-3">Specialized Studio</div>
        <h1 className="display-2 mb-3 text-gradient-copper">Modos profissionais</h1>
        <p className="lead">16 pipelines especializados — headshots corporativos, capas de revista, ensaios temáticos, restauração e mais.</p>
      </motion.header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CARDS.map(card => <ToolCard key={card.id} card={card} onOpen={() => setOpen(card.id)} />)}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {active?.icon}
              {active?.title}
            </DialogTitle>
          </DialogHeader>
          {ActiveForm && <ActiveForm onClose={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
