import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

const ratios = ["1:1", "3:4", "9:16", "4:5"];
const resolutions = ["1K", "2K", "4K"];
const variations = [1, 2, 4, 6];

export default function Generate() {
  const [params] = useSearchParams();
  const [ratio, setRatio] = useState("4:5");
  const [res, setRes] = useState("2K");
  const [vars, setVars] = useState(4);
  const [refPath, setRefPath] = useState<string | null>(null);
  const cost = vars * (res === "4K" ? 4 : res === "2K" ? 2 : 1);

  return (
    <div className="mx-auto grid max-w-6xl animate-fade-in gap-8 lg:grid-cols-5">
      {/* Controls */}
      <div className="space-y-6 rounded-2xl border border-border bg-background p-6 lg:col-span-2">
        <div>
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Gerar</div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova geração</h1>
        </div>

        <Pills label="Aspect ratio" options={ratios} value={ratio} onChange={setRatio} />
        <Pills label="Resolução" options={resolutions} value={res} onChange={setRes} />
        <Pills label="Variações" options={variations.map(String)} value={String(vars)} onChange={v => setVars(Number(v))} />

        <div className="rounded-md border border-primary/30 bg-primary-light p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Custo estimado</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-primary">{cost}</span>
            <span className="text-sm text-muted-foreground">créditos</span>
          </div>
        </div>

        <Button size="lg" variant="hero" className="w-full">
          <Sparkles /> Gerar ({cost} créditos)
        </Button>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-dashed border-border bg-surface p-12 lg:col-span-3">
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-background">
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Sua geração aparecerá aqui</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Escolha persona e template à esquerda. Clique em gerar e acompanhe o progresso em tempo real.</p>
        </div>
      </div>
    </div>
  );
}

function Pills({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors ${value === o ? "border-primary bg-primary-light text-primary" : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
