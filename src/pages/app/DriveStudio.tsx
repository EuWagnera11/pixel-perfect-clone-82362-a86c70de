import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cloud, Plus, Loader2, RefreshCw } from "lucide-react";
import { api, ApiError, type DriveImport } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STATUS_TONE: Record<DriveImport["status"], string> = {
  pending: "bg-secondary text-muted-foreground",
  importing: "bg-primary-light text-primary",
  analyzing: "bg-primary-light text-primary",
  ready: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/10 text-destructive",
};

export default function DriveStudio() {
  const { toast } = useToast();
  const [items, setItems] = useState<DriveImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [url, setUrl] = useState("");
  const [folderName, setFolderName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.drive.imports.list();
      setItems(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao listar imports", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      await api.drive.imports.create({ source_url: url.trim(), folder_name: folderName.trim() || undefined });
      toast({ title: "Import criado", description: "Vamos baixar e analisar os arquivos." });
      setUrl("");
      setFolderName("");
      load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Falha ao criar import", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      <div>
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Drive</div>
        <h1 className="text-3xl font-semibold tracking-tight">Importar do Google Drive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cole uma pasta pública do Drive e o Refine baixa, analisa e disponibiliza os arquivos para Learn / Recreate.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-border bg-background p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">URL da pasta do Drive</label>
          <Input
            type="url"
            placeholder="https://drive.google.com/drive/folders/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome (opcional)</label>
          <Input
            placeholder="Ex.: Refs Sophia 2026"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={submitting || !url.trim()}>
          {submitting ? <><Loader2 className="animate-spin" /> Criando...</> : <><Plus /> Importar pasta</>}
        </Button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Imports recentes</h2>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
          </Button>
        </div>
        {loading ? (
          <div className="font-mono text-xs text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
              <Cloud className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum import ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">Cole uma URL do Drive acima para começar.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Arquivos</th>
                  <th className="px-4 py-3">Criado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-border last:border-b-0">
                    <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs">{it.source_url}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_TONE[it.status] ?? "bg-secondary text-muted-foreground"}`}>
                        {it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {it.imported_files}/{it.total_files}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
