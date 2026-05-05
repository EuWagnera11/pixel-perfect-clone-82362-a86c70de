/**
 * MaskEditor — modal para desenhar máscara de inpaint sobre a imagem-fonte.
 * Exporta PNG (branco = editar, preto = manter) e devolve via onSave(file).
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

type Props = {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (file: File) => void | Promise<void>;
};

export function MaskEditor({ imageUrl, open, onClose, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [brush, setBrush] = useState(40);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega imagem e dimensiona canvas
  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      // Limita tamanho de exibição
      const MAX = 900;
      let w = img.naturalWidth, h = img.naturalHeight;
      const r = Math.min(1, MAX / Math.max(w, h));
      w = Math.round(w * r); h = Math.round(h * r);
      setSize({ w, h });
      requestAnimationFrame(() => {
        const m = maskRef.current; const p = previewRef.current;
        if (m && p) {
          [m, p].forEach((c) => { c.width = w; c.height = h; });
          const pctx = p.getContext("2d");
          pctx?.drawImage(img, 0, 0, w, h);
          const mctx = m.getContext("2d");
          if (mctx) { mctx.fillStyle = "#000"; mctx.fillRect(0, 0, w, h); }
        }
      });
    };
    img.onerror = () => { /* ignore */ };
    img.src = imageUrl;
  }, [imageUrl, open]);

  function pos(e: React.PointerEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function paint(x: number, y: number) {
    const m = maskRef.current; if (!m) return;
    const ctx = m.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y, brush / 2, 0, Math.PI * 2); ctx.fill();
  }
  function clear() {
    const m = maskRef.current; if (!m) return;
    const ctx = m.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, m.width, m.height);
  }

  async function save() {
    const m = maskRef.current; const img = imgRef.current; if (!m || !img) return;
    // Re-render em resolução original
    const out = document.createElement("canvas");
    out.width = img.naturalWidth; out.height = img.naturalHeight;
    const ctx = out.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(m, 0, 0, out.width, out.height);
    setSaving(true);
    out.toBlob(async (blob) => {
      if (!blob) { setSaving(false); return; }
      const file = new File([blob], `mask-${Date.now()}.png`, { type: "image/png" });
      try { await onSave(file); onClose(); } finally { setSaving(false); }
    }, "image/png");
  }

  if (!open) return null;

  const overlay: CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };
  const panel: CSSProperties = {
    background: "#101010", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14,
    padding: 16, maxWidth: "95vw", maxHeight: "95vh", display: "flex", flexDirection: "column", gap: 12,
  };
  const stage: CSSProperties = {
    position: "relative", width: size.w, height: size.h, margin: "0 auto",
    background: "#000", borderRadius: 8, overflow: "hidden", touchAction: "none",
  };
  const canvasBase: CSSProperties = { position: "absolute", inset: 0 };
  const btn: CSSProperties = {
    all: "unset", cursor: "pointer", padding: "8px 14px", fontSize: 12,
    background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 8, color: "#fff",
  };
  const cta: CSSProperties = { ...btn, background: "#ff6a1a", color: "#000", fontWeight: 600 };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <strong style={{ color: "#fff", fontSize: 13 }}>Desenhar máscara — pinte de branco a área a editar</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,.7)", fontSize: 12 }}>
            <span>Pincel</span>
            <input type="range" min={5} max={150} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
            <span style={{ width: 28, textAlign: "right" }}>{brush}</span>
          </div>
        </div>

        <div style={stage}>
          <canvas ref={previewRef} style={canvasBase} />
          <canvas
            ref={maskRef}
            style={{ ...canvasBase, opacity: 0.5, cursor: "crosshair" }}
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setDrawing(true); const p = pos(e); paint(p.x, p.y); }}
            onPointerMove={(e) => { if (!drawing) return; const p = pos(e); paint(p.x, p.y); }}
            onPointerUp={() => setDrawing(false)}
            onPointerCancel={() => setDrawing(false)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button style={btn} onClick={clear}>Limpar</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn} onClick={onClose}>Cancelar</button>
            <button style={cta} onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Usar máscara"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
