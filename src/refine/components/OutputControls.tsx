/**
 * OutputControls — Variações + Aspecto + Qualidade num único card.
 */
import { ASPECT_RATIOS, type AspectRatio } from "../lib/models";

type Props = {
  variations: number;
  onVariations: (n: number) => void;
  ratio: AspectRatio;
  onRatio: (r: AspectRatio) => void;
  quality: string;
  onQuality: (q: string) => void;
  baseCost?: number; // créditos por imagem no modelo selecionado
};

const VAR_OPTS = [1, 2, 4, 6, 8] as const;

const ASPECT_META: Record<string, { use: string }> = {
  "1:1":  { use: "Instagram" },
  "9:16": { use: "Reels" },
  "16:9": { use: "YouTube" },
  "4:5":  { use: "Feed" },
  "3:4":  { use: "Pinterest" },
  "4:3":  { use: "Clássico" },
  "21:9": { use: "Banner" },
  "2:3":  { use: "Print" },
};

const QUALITIES: { id: string; label: string; mult: number }[] = [
  { id: "1K", label: "SD", mult: 1 },
  { id: "2K", label: "HD", mult: 2 },
  { id: "4K", label: "4K", mult: 4 },
];

function rectStyle(r: string): React.CSSProperties {
  const [a, b] = r.split(":").map(Number);
  if (!a || !b) return { width: 22, height: 22 };
  const max = 28;
  if (a >= b) return { width: max, height: Math.round((b / a) * max) };
  return { width: Math.round((a / b) * max), height: max };
}

export function OutputControls({
  variations, onVariations, ratio, onRatio, quality, onQuality, baseCost = 10,
}: Props) {
  const qMult = QUALITIES.find((q) => q.id === quality)?.mult || 1;
  const totalCost = variations * baseCost * qMult;

  return (
    <div className="oc">
      {/* VARIAÇÕES */}
      <div className="oc-section">
        <div className="oc-section-head">
          <span className="oc-label">Variações</span>
          <span className="oc-meta">= {variations * baseCost} créditos</span>
        </div>
        <div className="oc-pills">
          {VAR_OPTS.map((n) => (
            <button
              key={n}
              className={"oc-pill" + (variations === n ? " active" : "")}
              onClick={() => onVariations(n)}
            >{n}</button>
          ))}
        </div>
      </div>

      <div className="oc-divider" />

      {/* ASPECTO */}
      <div className="oc-section">
        <div className="oc-section-head">
          <span className="oc-label">Aspecto</span>
        </div>
        <div className="oc-aspects">
          {ASPECT_RATIOS.map((r) => {
            const active = ratio === r;
            return (
              <button
                key={r}
                className={"oc-aspect" + (active ? " active" : "")}
                onClick={() => onRatio(r as AspectRatio)}
                title={`${r} · ${ASPECT_META[r]?.use || ""}`}
              >
                <span className="oc-aspect-frame">
                  <span className="oc-aspect-rect" style={rectStyle(r)} />
                </span>
                <span className="oc-aspect-label">
                  <b>{r}</b>
                  <em>{ASPECT_META[r]?.use || ""}</em>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="oc-divider" />

      {/* QUALIDADE */}
      <div className="oc-section">
        <div className="oc-section-head">
          <span className="oc-label">Qualidade</span>
          <span className="oc-meta">{qMult}× créditos</span>
        </div>
        <div className="oc-segmented">
          {QUALITIES.map((q) => (
            <button
              key={q.id}
              className={"oc-seg" + (quality === q.id ? " active" : "")}
              onClick={() => onQuality(q.id)}
            >
              {q.label}
              <span className="oc-seg-mult">{q.mult}×</span>
            </button>
          ))}
        </div>
      </div>

      <div className="oc-summary">
        {variations} {variations === 1 ? "imagem" : "imagens"} · {ratio} · {quality} = <b>{totalCost} créditos</b>
      </div>
    </div>
  );
}
