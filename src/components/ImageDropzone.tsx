import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  /** MIME types accepted by the underlying file input. */
  accept?: string;
  /** Storage bucket the file should land in. */
  bucket?: string;
  /** Current path inside the bucket. */
  value?: string | null;
  /** Receives the new path (or null when removed). */
  onChange: (path: string | null) => void;
  /** Optional preview URL when caller already has one. */
  previewUrl?: string | null;
  className?: string;
  label?: string;
  hint?: string;
}

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export function ImageDropzone({
  accept = "image/*",
  bucket = "generation-refs",
  value,
  onChange,
  previewUrl: previewUrlProp,
  className,
  label,
  hint = "Clique ou arraste — JPG, PNG, WebP",
}: ImageDropzoneProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(previewUrlProp ?? null);

  useEffect(() => {
    if (previewUrlProp !== undefined) setLocalPreview(previewUrlProp);
  }, [previewUrlProp]);

  const upload = useCallback(async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Máximo 25 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    // Show preview immediately while we upload.
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    try {
      const { upload_url, path } = await api.uploads.signedUrl({
        bucket,
        filename: file.name,
        content_type: file.type || "application/octet-stream",
      });
      const put = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload PUT falhou: ${put.status}`);
      onChange(path);
      toast({ title: "Imagem enviada" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Falha no upload";
      toast({ title: "Erro no upload", description: msg, variant: "destructive" });
      setLocalPreview(null);
      onChange(null);
    } finally {
      setUploading(false);
    }
  }, [bucket, onChange, toast]);

  const remove = () => {
    setLocalPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const showPreview = localPreview ?? (value && value.startsWith("http") ? value : null);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-surface p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary-light/40" : "border-border hover:border-primary/40",
          showPreview && "min-h-0 p-0",
        )}
      >
        {showPreview ? (
          <>
            <img src={showPreview} alt="" className="max-h-72 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(); }}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
              aria-label="Remover imagem"
            >
              <X className="h-4 w-4" />
            </button>
            {uploading && (
              <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
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
            {value && !showPreview && (
              <p className="mt-2 max-w-full truncate font-mono text-[10px] text-muted-foreground">{value}</p>
            )}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </div>
    </div>
  );
}

export default ImageDropzone;
