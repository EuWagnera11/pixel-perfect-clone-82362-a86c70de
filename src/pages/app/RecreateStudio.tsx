import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, RefreshCw, Wand2 } from "lucide-react";
import { api, ApiError, type DriveImport, type Persona, type RecreateJob } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function RecreateStudio() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<RecreateJob[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [imports, setImports] = useState<DriveImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [personaId, setPersonaId] = useState("");
  const [driveImportId, setDriveImportId] = useState("");
  const [skinEnhance, setSkinEnhance] = useState(true);
  const [magnific, setMagnific] = useState(false);
  const [preserveLogos, setPreserveLogos] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [j, p, i] = await Promise.all([
        api.drive.recreate.list(),
        api.personas.list(),
        api.drive.imports.list(),
      ]);
      setJobs(j);
      setPersonas(p);
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
    if (!personaId || !driveImportId) return;
    setSubmitting(true);
    try {
      await api.drive.recreate.create({
        persona_id: personaId,
        drive_import_id: driveImportId,
        skin_enhance: skinEnhance,
        magnific,
        preserve_logos: preserveLogos,
      });
      toast({ title: "Recreate iniciado", description: "Vamos recriar todas as fotos com sua persona." });
      load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao criar", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const readyImports = imports.filter((i) => i.status === "ready");

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      <div>
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Recreate</div>
        <h1 className="text-3xl font-semibold tracking-tight">Recriar com sua persona</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pegue um conjunto de fotos do Drive e refaça todas com o rosto e atributos da sua persona.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5 rounded-2xl border border-border bg-background p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Persona</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

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
                  {i.source_url} — {i.imported_files} arquivos
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-border bg-surface p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={skinEnhance} onChange={(e) => setSkinEnhance(e.target.checked)} />
            <span>Skin Enhancer (combate AI plastic look)</span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={magnific} onChange={(e) => setMagnific(e.target.checked)} />
            <span>Magnific Upscaler (4K final)</span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={preserveLogos} onChange={(e) => setPreserveLogos(e.target.checked)} />
            <span>Preservar logos (edge-based protection)</span>
          </label>
        </div>

        <Button type="submit" size="lg" disabled={submitting || !personaId || !driveImportId}>
          {submitting ? <><Loader2 className="animate-spin" /> Iniciando...</> : <><Plus /> Iniciar recreate</>}
        </Button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Jobs de recreate</h2>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
          </Button>
        </div>
        {loading ? (
          <div className="font-mono text-xs text-muted-foreground">Carregando...</div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
              <Wand2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum job ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro recreate acima.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {jobs.map((j) => {
              const pct = j.total_files > 0 ? Math.round((j.completed_files / j.total_files) * 100) : 0;
              return (
                <div key={j.id} className="rounded-xl border border-border bg-background p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-mono text-xs">{j.id.slice(0, 8)}</div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {j.status}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {j.completed_files}/{j.total_files} ({pct}%)
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
