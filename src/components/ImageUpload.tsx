import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Bucket = "persona-photos" | "avatars" | "generation-refs";

interface ImageUploadProps {
  bucket: Bucket;
  /** Current value (storage path inside bucket, e.g. `<uid>/file.jpg`). */
  value?: string | null;
  /** Receives the new storage path (or null when removed). */
  onChange: (path: string | null, publicUrl: string | null) => void;
  /** Optional sub-folder appended after `<uid>/`. */
  folder?: string;
  className?: string;
  label?: string;
  hint?: string;
  /** When true, render a circular avatar instead of a card. */
  avatar?: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function ImageUpload({
  bucket,
  value,
  onChange,
  folder,
  className,
  label = "Imagem",
  hint = "JPG, PNG ou WebP até 10 MB",
  avatar = false,
}: ImageUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => resolvePreview(bucket, value));

  const upload = useCallback(async (file: File) => {
    if (!user) {
      toast({ title: "Faça login primeiro", variant: "destructive" });
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeFolder = folder ? `${folder}/` : "";
    const path = `${user.id}/${safeFolder}${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      setUploading(false);
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      return;
    }
    const publicUrl = bucket === "avatars"
      ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : (await supabase.storage.from(bucket).createSignedUrl(path, 3600)).data?.signedUrl ?? null;
    setPreviewUrl(publicUrl);
    onChange(path, publicUrl);
    setUploading(false);
  }, [user, bucket, folder, onChange, toast]);

  const remove = async () => {
    if (value && user) {
      await supabase.storage.from(bucket).remove([value]).catch(() => {});
    }
    setPreviewUrl(null);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  if (avatar) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-secondary">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Trocar foto
            </Button>
            {previewUrl && (
              <Button type="button" size="sm" variant="ghost" onClick={remove}>
                <X className="h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</p>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
          onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-surface p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary-light/40" : "border-border hover:border-primary/40",
          previewUrl && "min-h-0 p-0",
        )}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="" className="max-h-72 w-full rounded-xl object-cover" />
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(); }}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background">
              <X className="h-4 w-4" />
            </button>
          </>
        ) : uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando...</p>
          </>
        ) : (
          <>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-background">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Clique ou arraste uma imagem</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</p>
          </>
        )}
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
          onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </div>
  );
}

function resolvePreview(bucket: Bucket, value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  if (bucket === "avatars") return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
  return null; // signed URL needs to be generated async; caller can pass full URL via value
}
