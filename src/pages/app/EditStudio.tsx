import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Upload, X, Wand2, Eraser, Brush, Palette, Layers, Replace, Maximize2, Sparkles } from "lucide-react";
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

/* ───── helper: minimal dropzone returning a public URL ───── */
function MiniDrop({ label, value, onChange, hint = "JPG/PNG/WebP" }: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!user) return toast({ title: "Faça login", variant: "destructive" });
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${user.id}/edit/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("generation-refs").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = await supabase.storage.from("generation-refs").createSignedUrl(path, 3600);
      onChange(data?.signedUrl ?? null);
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div
        onClick={() => !busy && ref.current?.click()}
        className="mt-2 relative flex min-h-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface text-center transition-colors hover:border-primary/40"
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-40 w-full object-cover" />
            <button onClick={(e) => { e.stopPropagation(); onChange(null); }} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="p-4">
            <Upload className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-xs">Clique para enviar</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</p>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </div>
  );
}

/* ───── helper: poll an enhance task until done ───── */
function useTaskPolling(taskId: string | null) {
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
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
          const u = r?.output_url ?? r?.url ?? r?.image_url ?? r?.urls?.[0] ?? r?.output_urls?.[0];
          setResult(u ?? null);
        } else if (failed) {
          setError("Tarefa falhou");
        } else {
          timer = setTimeout(tick, 2500);
        }
      } catch (e: any) {
        if (!stop) setError(e?.message ?? "Erro de polling");
      }
    };
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [taskId]);

  return { status, result, error };
}

function ResultPreview({ taskId, output, error }: { taskId: string | null; output: string | null; error: string | null }) {
  if (!taskId) return null;
  return (
    <div className="mt-5 rounded-xl border border-primary/30 bg-primary-light/10 p-4">
      <div className="eyebrow eyebrow-dot mb-3">Resultado</div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && !output && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Processando...</div>}
      {output && <img src={output} alt="" className="w-full rounded-lg" />}
    </div>
  );
}

/* ───────── TABS ───────── */

function InpaintTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [mask, setMask] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src || !mask || !prompt.trim()) return toast({ title: "Preencha imagem, máscara e prompt", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.inpaint({ image_url: src, mask_url: mask, prompt });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Inpaint</div>
      <h3 className="display-2 mb-1">Pintar dentro da máscara</h3>
      <p className="lead mb-6">Substitua áreas específicas mantendo o resto intacto.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <MiniDrop label="Imagem source" value={src} onChange={setSrc} />
        <MiniDrop label="Máscara (branco = editar)" value={mask} onChange={setMask} />
      </div>
      <div className="mt-5">
        <Label>Prompt</Label>
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Descreva o que deve aparecer na área branca da máscara..." className="mt-2" />
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Brush className="h-4 w-4" /> Inpaint</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

function OutpaintTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [direction, setDirection] = useState("all");
  const [factor, setFactor] = useState(1.5);
  const [prompt, setPrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src) return toast({ title: "Envie a imagem", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.outpaint({ image_url: src, prompt: prompt || undefined, direction, expansion_factor: factor });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Outpaint</div>
      <h3 className="display-2 mb-1">Expandir cenário</h3>
      <p className="lead mb-6">Estenda os limites da imagem mantendo coerência.</p>
      <MiniDrop label="Imagem source" value={src} onChange={setSrc} />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Direção</Label>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os lados</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
              <SelectItem value="up">Cima</SelectItem>
              <SelectItem value="down">Baixo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Expansion factor <span className="font-mono text-[10px] text-muted-foreground">({factor.toFixed(1)}x)</span></Label>
          <Slider min={1.1} max={3} step={0.1} value={[factor]} onValueChange={v => setFactor(v[0])} className="mt-3" />
        </div>
      </div>
      <div className="mt-5">
        <Label>Prompt (opcional)</Label>
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} placeholder="Descreva o que continuar nas bordas..." className="mt-2" />
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Maximize2 className="h-4 w-4" /> Outpaint</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

function RemoveObjectTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [mask, setMask] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src || !mask) return toast({ title: "Envie source + mask", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.removeObject({ image_url: src, mask_url: mask });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Remove Object</div>
      <h3 className="display-2 mb-1">Remover elemento</h3>
      <p className="lead mb-6">Apague qualquer objeto e deixe a IA reconstruir o fundo.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <MiniDrop label="Imagem source" value={src} onChange={setSrc} />
        <MiniDrop label="Máscara (branco = remover)" value={mask} onChange={setMask} />
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Eraser className="h-4 w-4" /> Remover</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

function SketchTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [strength, setStrength] = useState(0.7);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src || !prompt.trim()) return toast({ title: "Sketch + prompt obrigatórios", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.sketchToImage({ sketch_url: src, prompt, strength });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Sketch to Image</div>
      <h3 className="display-2 mb-1">Esboço em fotorrealismo</h3>
      <p className="lead mb-6">Transforme um rascunho em imagem renderizada.</p>
      <MiniDrop label="Sketch" value={src} onChange={setSrc} />
      <div className="mt-5">
        <Label>Prompt</Label>
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} className="mt-2" />
      </div>
      <div className="mt-5">
        <Label>Strength <span className="font-mono text-[10px] text-muted-foreground">({strength.toFixed(2)})</span></Label>
        <Slider min={0} max={1} step={0.05} value={[strength]} onValueChange={v => setStrength(v[0])} className="mt-3" />
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Wand2 className="h-4 w-4" /> Gerar</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

function StyleTransferTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [strength, setStrength] = useState(0.6);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src || !ref) return toast({ title: "Source + style ref obrigatórios", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.styleTransfer({ source_url: src, style_reference_url: ref, prompt: prompt || undefined, strength });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Style Transfer</div>
      <h3 className="display-2 mb-1">Transferência de estilo</h3>
      <p className="lead mb-6">Aplique a estética de uma referência sobre sua imagem.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <MiniDrop label="Source" value={src} onChange={setSrc} />
        <MiniDrop label="Style reference" value={ref} onChange={setRef} />
      </div>
      <div className="mt-5">
        <Label>Prompt (opcional)</Label>
        <Input value={prompt} onChange={e => setPrompt(e.target.value)} className="mt-2" />
      </div>
      <div className="mt-5">
        <Label>Strength <span className="font-mono text-[10px] text-muted-foreground">({strength.toFixed(2)})</span></Label>
        <Slider min={0} max={1} step={0.05} value={[strength]} onValueChange={v => setStrength(v[0])} className="mt-3" />
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Palette className="h-4 w-4" /> Transferir estilo</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

function ReplaceBgTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src || !prompt.trim()) return toast({ title: "Imagem + prompt obrigatórios", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.replaceBackground({ image_url: src, prompt });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Replace Background</div>
      <h3 className="display-2 mb-1">Trocar cenário</h3>
      <p className="lead mb-6">Mantenha o sujeito e gere um novo background.</p>
      <MiniDrop label="Imagem com sujeito" value={src} onChange={setSrc} />
      <div className="mt-5">
        <Label>Novo background</Label>
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Praia tropical ao pôr-do-sol, golden hour, cinematográfico..." className="mt-2" />
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Replace className="h-4 w-4" /> Trocar BG</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

function ExpandTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [ratio, setRatio] = useState("9:16");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src) return toast({ title: "Envie a imagem", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.expand({ image_url: src, target_aspect_ratio: ratio });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Expand</div>
      <h3 className="display-2 mb-1">Aspect ratio inteligente</h3>
      <p className="lead mb-6">Transforme uma imagem em qualquer proporção sem cortar.</p>
      <MiniDrop label="Source" value={src} onChange={setSrc} />
      <div className="mt-5">
        <Label>Aspect ratio alvo</Label>
        <Select value={ratio} onValueChange={setRatio}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 (quadrado)</SelectItem>
            <SelectItem value="4:5">4:5 (Instagram)</SelectItem>
            <SelectItem value="9:16">9:16 (vertical)</SelectItem>
            <SelectItem value="16:9">16:9 (horizontal)</SelectItem>
            <SelectItem value="3:4">3:4 (retrato)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Layers className="h-4 w-4" /> Expandir</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

function ColorizeTab() {
  const { toast } = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { result, error } = useTaskPolling(taskId);

  const handle = async () => {
    if (!src) return toast({ title: "Envie a imagem", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.edit.colorize({ image_url: src, prompt: prompt || undefined });
      setTaskId(r.task_id);
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Colorize</div>
      <h3 className="display-2 mb-1">Colorir preto & branco</h3>
      <p className="lead mb-6">Reviva fotos antigas com cor natural.</p>
      <MiniDrop label="Imagem P&B" value={src} onChange={setSrc} />
      <div className="mt-5">
        <Label>Hint de cor (opcional)</Label>
        <Input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Tons quentes, paleta vintage anos 70..." className="mt-2" />
      </div>
      <Button className="btn-pill-primary mt-5 w-full" disabled={loading || (!!taskId && !result && !error)} onClick={handle}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Sparkles className="h-4 w-4" /> Colorir</>}
      </Button>
      <ResultPreview taskId={taskId} output={result} error={error} />
    </motion.div>
  );
}

export default function EditStudio() {
  return (
    <div className="container-suite animate-fade-in">
      <motion.header {...fadeUp()} className="mb-10">
        <div className="eyebrow eyebrow-dot mb-3">Edit Studio</div>
        <h1 className="display-2 mb-3 text-gradient-copper">Edição cinematográfica de imagens</h1>
        <p className="lead">Inpaint, outpaint, style transfer, remoção de objetos e muito mais — pipeline Freepik integrado.</p>
      </motion.header>

      <Tabs defaultValue="inpaint" className="w-full">
        <TabsList className="mb-6 flex w-full flex-wrap gap-1">
          <TabsTrigger value="inpaint">Inpaint</TabsTrigger>
          <TabsTrigger value="outpaint">Outpaint</TabsTrigger>
          <TabsTrigger value="remove">Remove</TabsTrigger>
          <TabsTrigger value="sketch">Sketch</TabsTrigger>
          <TabsTrigger value="style">Style Transfer</TabsTrigger>
          <TabsTrigger value="bg">Replace BG</TabsTrigger>
          <TabsTrigger value="expand">Expand</TabsTrigger>
          <TabsTrigger value="color">Colorize</TabsTrigger>
        </TabsList>
        <TabsContent value="inpaint"><InpaintTab /></TabsContent>
        <TabsContent value="outpaint"><OutpaintTab /></TabsContent>
        <TabsContent value="remove"><RemoveObjectTab /></TabsContent>
        <TabsContent value="sketch"><SketchTab /></TabsContent>
        <TabsContent value="style"><StyleTransferTab /></TabsContent>
        <TabsContent value="bg"><ReplaceBgTab /></TabsContent>
        <TabsContent value="expand"><ExpandTab /></TabsContent>
        <TabsContent value="color"><ColorizeTab /></TabsContent>
      </Tabs>
    </div>
  );
}
