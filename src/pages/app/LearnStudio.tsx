import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Loader2, Plus, RefreshCw } from "lucide-react";
import { api, ApiError, type DriveImport, type LearnedStyle } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STATUS_TONE: Record<LearnedStyle["status"], string> = {
  analyzing: "bg-primary-light text-primary",
  ready: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/10 text-destructive",
};

export default function LearnStudio() {
  const { toast } = useToast();
  const [styles, setStyles] = useState<LearnedStyle[]>([]);
  const [imports, setImports] = useState<DriveImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [driveImportId, setDriveImportId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [s, i] = await Promise.all([api.drive.learn.list(), api.drive.imports.list()]);
      setStyles(s);
      setImports(i);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao carregar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveImportId || !name.trim()) return;
    setSubmitting(true);
    try {
      await api.drive.learn.create({
        drive_import_id: driveImportId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast({ title: "Análise iniciada", description: "O Refine vai aprender o estilo." });
      setDriveImportId("");
      setName("");
      setDescription("");
      load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao criar", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const readyImports = imports.filter((i) => i.status === "ready" || i.status === "analyzing");

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      <div>
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Learn</div>
        <h1 className="text-3xl font-semibold tracking-tight">Aprender estilo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aponte um import do Drive e o Refine extrai paleta, composição e tom para usar como estilo customizado.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-border bg-background p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Import do Drive</label>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={driveImportId}
            onChange={(e) => setDriveImportId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {readyImports.map((i) => (
              <option key={i.id} value={i.id}>
                {i.source_url} — {i.imported_files}/{i.total_files}
              </option>
            ))}
          </select>
          {readyImports.length === 0 && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Nenhum import disponível. Importe uma pasta primeiro em /app/drive.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome do estilo</label>
          <Input
            placeholder="Ex.: Editorial copper warm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Descrição (opcional)</label>
          <Textarea
            rows={3}
            placeholder="Detalhes que o modelo deve focar..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={submitting || !driveImportId || !name.trim()}>
          {submitting ? <><Loader2 className="animate-spin" /> Criando...</> : <><Plus /> Aprender estilo</>}
        </Button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Estilos aprendidos</h2>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
          </Button>
        </div>
        {loading ? (
          <div className="font-mono text-xs text-muted-foreground">Carregando...</div>
        ) : styles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum estilo ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro estilo usando o formulário acima.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {styles.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold">{s.name}</div>
                    {s.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_TONE[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.example_count} exemplos
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
