import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mic2, Music2, Wand2, AudioLines, Volume2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError, type AudioGen } from "@/lib/api";

const VOICE_PRESETS = [
  { value: "feminina_jovem", label: "Feminina · Jovem" },
  { value: "feminina_mature", label: "Feminina · Madura" },
  { value: "masculina_jovem", label: "Masculina · Jovem" },
  { value: "masculina_mature", label: "Masculina · Madura" },
  { value: "narrador", label: "Narrador" },
  { value: "carismatico", label: "Carismático" },
  { value: "feminina_doce", label: "Feminina · Doce" },
  { value: "masculina_grave", label: "Masculina · Grave" },
];

const GENRES = ["pop", "cinematic", "lofi", "rock", "jazz", "electronic", "ambient", "classical", "hiphop", "funk"];
const MOODS = ["upbeat", "melancholic", "epic", "calm", "tense", "dreamy", "energetic", "romantic", "dark", "playful"];

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  } as const;
}

function ResultPanel({ url, label }: { url?: string | null; label: string }) {
  if (!url) return null;
  return (
    <div className="mt-5 rounded-xl border border-primary/30 bg-primary-light/10 p-4">
      <div className="eyebrow eyebrow-dot mb-3">{label}</div>
      <audio controls src={url} className="w-full" />
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-primary hover:underline">
        Abrir em nova aba
      </a>
    </div>
  );
}

/* ───────────────────────── TTS ───────────────────────── */
function TtsTab() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("feminina_jovem");
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const handle = async () => {
    if (!text.trim()) {
      toast({ title: "Texto vazio", description: "Digite o texto a ser narrado.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const r = await api.audio.tts({ text, voice, stability, similarity_boost: similarity });
      setUrl(r.url);
      toast({ title: "Áudio gerado", description: `${r.credits_used} créditos consumidos.` });
    } catch (e) {
      toast({ title: "Falha no TTS", description: e instanceof ApiError ? e.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Text-to-Speech</div>
      <h3 className="display-2 mb-1">Voz sintetizada</h3>
      <p className="lead mb-6">Transforme texto em narração com vozes premium em segundos.</p>

      <div className="space-y-5">
        <div>
          <Label>Texto</Label>
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Digite o texto a ser narrado..." className="mt-2" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Voz</Label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOICE_PRESETS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stability <span className="font-mono text-[10px] text-muted-foreground">({stability.toFixed(2)})</span></Label>
            <Slider min={0} max={1} step={0.05} value={[stability]} onValueChange={v => setStability(v[0])} className="mt-3" />
          </div>
          <div className="sm:col-span-2">
            <Label>Similarity boost <span className="font-mono text-[10px] text-muted-foreground">({similarity.toFixed(2)})</span></Label>
            <Slider min={0} max={1} step={0.05} value={[similarity]} onValueChange={v => setSimilarity(v[0])} className="mt-3" />
          </div>
        </div>

        <Button className="btn-pill-primary w-full" disabled={loading} onClick={handle}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : <><Wand2 className="h-4 w-4" /> Gerar voz</>}
        </Button>

        <ResultPanel url={url} label="Áudio gerado" />
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Music ───────────────────────── */
function MusicTab() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [genre, setGenre] = useState("cinematic");
  const [mood, setMood] = useState("epic");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const handle = async () => {
    if (!prompt.trim()) return toast({ title: "Descreva a música", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.audio.music({ prompt, duration, genre, mood });
      setUrl(r.url);
      toast({ title: "Música pronta", description: `${r.credits_used} créditos.` });
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Música generativa</div>
      <h3 className="display-2 mb-1">Trilha sonora sob medida</h3>
      <p className="lead mb-6">Descreva o vibe e gere uma trilha original.</p>

      <div className="space-y-5">
        <div>
          <Label>Prompt</Label>
          <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="Trilha cinematográfica épica com cordas e percussão..." className="mt-2" />
        </div>
        <div>
          <Label>Duração <span className="font-mono text-[10px] text-muted-foreground">({duration}s)</span></Label>
          <Slider min={5} max={300} step={5} value={[duration]} onValueChange={v => setDuration(v[0])} className="mt-3" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Gênero</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mood</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="btn-pill-primary w-full" disabled={loading} onClick={handle}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Compondo...</> : <><Music2 className="h-4 w-4" /> Gerar música</>}
        </Button>

        <ResultPanel url={url} label="Música gerada" />
      </div>
    </motion.div>
  );
}

/* ───────────────────────── SFX ───────────────────────── */
function SfxTab() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const handle = async () => {
    if (!prompt.trim()) return toast({ title: "Descreva o efeito", variant: "destructive" });
    setLoading(true);
    try {
      const r = await api.audio.sfx({ prompt, duration });
      setUrl(r.url);
      toast({ title: "SFX gerado", description: `${r.credits_used} créditos.` });
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Sound Effects</div>
      <h3 className="display-2 mb-1">Foley & efeitos</h3>
      <p className="lead mb-6">Descreva qualquer efeito sonoro para gerar samples únicos.</p>
      <div className="space-y-5">
        <div>
          <Label>Prompt</Label>
          <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Whoosh cinemático com impacto grave, vidro estilhaçando..." className="mt-2" />
        </div>
        <div>
          <Label>Duração <span className="font-mono text-[10px] text-muted-foreground">({duration}s)</span></Label>
          <Slider min={1} max={30} step={1} value={[duration]} onValueChange={v => setDuration(v[0])} className="mt-3" />
        </div>
        <Button className="btn-pill-primary w-full" disabled={loading} onClick={handle}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : <><Volume2 className="h-4 w-4" /> Gerar SFX</>}
        </Button>
        <ResultPanel url={url} label="Efeito gerado" />
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Voice Clone ───────────────────────── */
function VoiceCloneTab() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);

  const handle = async () => {
    if (!name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    if (files.length === 0) return toast({ title: "Adicione ao menos 1 amostra", variant: "destructive" });
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      if (description) fd.append("description", description);
      files.forEach(f => fd.append("files", f));
      const r = await api.audio.voiceClone(fd);
      setVoiceId(r.voice_id);
      toast({ title: "Voz clonada", description: `voice_id: ${r.voice_id}` });
    } catch (e) {
      toast({ title: "Falha no clone", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Voice Cloning</div>
      <h3 className="display-2 mb-1">Clonagem de voz</h3>
      <p className="lead mb-6">Forneça amostras de áudio (.mp3/.wav) e crie uma réplica fiel da voz.</p>

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Sophia narradora" className="mt-2" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Voz feminina madura, tom acolhedor" className="mt-2" />
          </div>
        </div>

        <div>
          <Label>Amostras de áudio</Label>
          <div
            className="mt-2 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface p-5 text-center transition-colors hover:border-primary/40"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Clique para escolher arquivos .mp3 ou .wav</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recomendado: 3+ amostras de 30s+</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/mp3,.mp3,.wav"
            multiple
            className="hidden"
            onChange={e => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <span className="truncate font-mono text-xs">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="btn-pill-primary w-full" disabled={loading} onClick={handle}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Treinando...</> : <><Mic2 className="h-4 w-4" /> Clonar voz</>}
        </Button>

        {voiceId && (
          <div className="rounded-xl border border-primary/30 bg-primary-light/10 p-4">
            <div className="eyebrow eyebrow-dot mb-2">Pronta</div>
            <p className="text-sm">Voice ID: <span className="font-mono text-primary">{voiceId}</span></p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Lip Sync ───────────────────────── */
function LipSyncTab() {
  const { toast } = useToast();
  const [video, setVideo] = useState("");
  const [audio, setAudio] = useState("");
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [output, setOutput] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId || output) return;
    const t = setInterval(async () => {
      try {
        const r = await api.enhance.task(taskId, "lip-sync");
        setStatus(r?.status ?? "");
        if (r?.status === "completed" || r?.status === "COMPLETED" || r?.status === "succeeded") {
          const u = r?.output_url ?? r?.video_url ?? r?.url ?? r?.urls?.[0];
          if (u) setOutput(u);
          clearInterval(t);
        } else if (r?.status === "failed" || r?.status === "FAILED") {
          clearInterval(t);
          toast({ title: "Lip sync falhou", variant: "destructive" });
        }
      } catch {
        clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [taskId, output, toast]);

  const handle = async () => {
    if (!video.trim() || !audio.trim()) return toast({ title: "URLs obrigatórias", variant: "destructive" });
    setLoading(true);
    setOutput(null);
    try {
      const r = await api.audio.lipSync({ video_url: video, audio_url: audio });
      setTaskId(r.task_id);
      toast({ title: "Lip sync iniciado", description: `task ${r.task_id}` });
    } catch (e) {
      toast({ title: "Falha", description: e instanceof ApiError ? e.message : "Erro", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...fadeUp()} className="tool-card p-6">
      <div className="eyebrow eyebrow-dot mb-3">Lip Sync</div>
      <h3 className="display-2 mb-1">Sincronia labial</h3>
      <p className="lead mb-6">Envie um vídeo + áudio e gere lip sync perfeito.</p>

      <div className="space-y-5">
        <div>
          <Label>URL do vídeo</Label>
          <Input value={video} onChange={e => setVideo(e.target.value)} placeholder="https://..." className="mt-2" />
        </div>
        <div>
          <Label>URL do áudio</Label>
          <Input value={audio} onChange={e => setAudio(e.target.value)} placeholder="https://..." className="mt-2" />
        </div>
        <Button className="btn-pill-primary w-full" disabled={loading || (!!taskId && !output)} onClick={handle}>
          {loading || (taskId && !output) ? <><Loader2 className="h-4 w-4 animate-spin" /> {status || "Processando..."}</> : <><AudioLines className="h-4 w-4" /> Sincronizar</>}
        </Button>

        {output && (
          <div className="rounded-xl border border-primary/30 bg-primary-light/10 p-4">
            <div className="eyebrow eyebrow-dot mb-3">Vídeo sincronizado</div>
            <video controls src={output} className="w-full rounded-lg" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ───────────────────────── History ───────────────────────── */
function History() {
  const [items, setItems] = useState<AudioGen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.audio.list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div {...fadeUp(0.1)} className="mt-12">
      <div className="eyebrow eyebrow-dot mb-3">Histórico</div>
      <h3 className="display-2 mb-6">Gerações recentes</h3>
      {loading ? (
        <div className="font-mono text-xs text-muted-foreground">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma geração de áudio ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(it => (
            <div key={it.id} className="tool-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-primary-light/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">{it.type}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleDateString()}</span>
              </div>
              {it.text_input && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{it.text_input}</p>}
              {it.output_url ? (
                it.type === "lip_sync" ? (
                  <video controls src={it.output_url} className="w-full rounded-md" />
                ) : (
                  <audio controls src={it.output_url} className="w-full" />
                )
              ) : (
                <div className="font-mono text-[10px] text-muted-foreground">Status: {it.status}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function AudioStudio() {
  return (
    <div className="container-suite animate-fade-in">
      <motion.header {...fadeUp()} className="mb-10">
        <div className="eyebrow eyebrow-dot mb-3">Audio Studio</div>
        <h1 className="display-2 mb-3 text-gradient-copper">Estúdio de áudio cinematográfico</h1>
        <p className="lead">TTS premium, música generativa, SFX, clone de voz e lip sync — tudo num único pipeline.</p>
      </motion.header>

      <Tabs defaultValue="tts" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="tts">TTS</TabsTrigger>
          <TabsTrigger value="music">Música</TabsTrigger>
          <TabsTrigger value="sfx">SFX</TabsTrigger>
          <TabsTrigger value="clone">Voice Clone</TabsTrigger>
          <TabsTrigger value="lipsync">Lip Sync</TabsTrigger>
        </TabsList>
        <TabsContent value="tts"><TtsTab /></TabsContent>
        <TabsContent value="music"><MusicTab /></TabsContent>
        <TabsContent value="sfx"><SfxTab /></TabsContent>
        <TabsContent value="clone"><VoiceCloneTab /></TabsContent>
        <TabsContent value="lipsync"><LipSyncTab /></TabsContent>
      </Tabs>

      <History />
    </div>
  );
}
