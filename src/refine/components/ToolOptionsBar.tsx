/**
 * ToolOptionsBar — barra de opções específicas por ferramenta,
 * renderizada acima do Dock. Cada tab mostra só os controles que fazem sentido.
 */
import type { CSSProperties } from "react";

export type ToolExtras = {
  mask_url?: string;
  audio_url?: string;
  voice?: string;
  horizontal_rotation?: number;
  vertical_tilt?: number;
  zoom?: number;
  skin_target?: "enhance_everything" | "smooth_skin" | "remove_blemishes";
};

export type ToolOptions = {
  // video
  videoDuration?: "5s" | "6s" | "10s";
  // edit
  editOp?:
    | "remove-bg" | "replace-bg" | "relight" | "expand" | "style-transfer"
    | "ideogram-edit" | "change-camera" | "reimagine-flux"
    | "skin-enhancer-creative" | "skin-enhancer-faithful" | "skin-enhancer-flexible";
  // upscale
  upscaleEngine?:
    | "magnific-creative" | "magnific-precision" | "magnific-precision-v2"
    | "video-upscaler" | "video-upscaler-turbo";
  // audio
  audioKind?: "music" | "sfx" | "voiceover" | "audio-isolation";
  // r3d
  r3dStyle?: "figurine" | "toy" | "sculpture" | "clay";
  // assets
  assetsKind?: "icon" | "sprite" | "prop" | "ui";
  // depth
  depthMode?: "grayscale" | "colored";
  // generic extras (mask url, audio url, voice, sliders…)
  extras?: ToolExtras;
};

type Props = {
  tab: string;
  value: ToolOptions;
  onChange: (patch: Partial<ToolOptions>) => void;
  /** Conteúdo extra renderizado à direita (ex.: upload de último frame). */
  extra?: React.ReactNode;
};

const wrap: CSSProperties = {
  display: "flex", gap: 8, padding: "8px 14px", flexWrap: "wrap",
  alignItems: "center", justifyContent: "center",
};
const label: CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
  color: "rgba(255,255,255,.45)", marginRight: 4,
};
const inputStyle: CSSProperties = {
  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8, color: "rgba(255,255,255,.85)", padding: "6px 10px",
  fontSize: 11.5, minWidth: 160,
};

function Seg<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value?: T; onChange: (v: T) => void }) {
  return (
    <div style={{
      display: "inline-flex", flexWrap: "wrap", borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)",
      maxWidth: "100%",
    }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              all: "unset", cursor: "pointer", padding: "6px 12px", fontSize: 11.5,
              color: active ? "#ff8a3d" : "rgba(255,255,255,.75)",
              background: active ? "rgba(255,106,26,.10)" : "transparent",
              whiteSpace: "nowrap",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NumInput({ val, onChange, min, max, step = 1, ph }: {
  val?: number; onChange: (n: number) => void; min: number; max: number; step?: number; ph: string;
}) {
  return (
    <input
      type="number" value={val ?? ""} placeholder={ph}
      min={min} max={max} step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ...inputStyle, minWidth: 80 }}
    />
  );
}

export function ToolOptionsBar({ tab, value, onChange, extra }: Props) {
  const setExtra = (patch: Partial<ToolExtras>) =>
    onChange({ extras: { ...(value.extras || {}), ...patch } });

  if (tab === "video") {
    return (
      <div style={wrap}>
        <span style={label}>Duração</span>
        <Seg
          options={[{ id: "5s", label: "5s" }, { id: "6s", label: "6s" }, { id: "10s", label: "10s" }]}
          value={value.videoDuration || "5s"}
          onChange={(v) => onChange({ videoDuration: v })}
        />
        {extra}
      </div>
    );
  }
  if (tab === "edit") {
    const op = value.editOp || "replace-bg";
    return (
      <div style={wrap}>
        <span style={label}>Operação</span>
        <Seg
          options={[
            { id: "replace-bg", label: "Trocar fundo" },
            { id: "remove-bg", label: "Remover fundo" },
            { id: "relight", label: "Reiluminar" },
            { id: "expand", label: "Expandir" },
            { id: "style-transfer", label: "Style" },
            { id: "ideogram-edit", label: "Inpaint" },
            { id: "change-camera", label: "Câmera" },
            { id: "reimagine-flux", label: "Reimagine" },
            { id: "skin-enhancer-creative", label: "Skin·Creative" },
            { id: "skin-enhancer-faithful", label: "Skin·Faithful" },
            { id: "skin-enhancer-flexible", label: "Skin·Flexible" },
          ]}
          value={op}
          onChange={(v) => onChange({ editOp: v })}
        />
        {op === "ideogram-edit" && (
          <>
            <span style={label}>Mask URL</span>
            <input
              type="url" placeholder="https://… (branco = editar)"
              value={value.extras?.mask_url || ""}
              onChange={(e) => setExtra({ mask_url: e.target.value })}
              style={inputStyle}
            />
          </>
        )}
        {op === "change-camera" && (
          <>
            <span style={label}>Rotação</span>
            <NumInput val={value.extras?.horizontal_rotation} onChange={(n) => setExtra({ horizontal_rotation: n })} min={-90} max={90} ph="±deg" />
            <span style={label}>Tilt</span>
            <NumInput val={value.extras?.vertical_tilt} onChange={(n) => setExtra({ vertical_tilt: n })} min={-45} max={45} ph="±deg" />
            <span style={label}>Zoom</span>
            <NumInput val={value.extras?.zoom} onChange={(n) => setExtra({ zoom: n })} min={-100} max={100} ph="%" />
          </>
        )}
        {op === "skin-enhancer-flexible" && (
          <>
            <span style={label}>Alvo</span>
            <Seg
              options={[
                { id: "enhance_everything", label: "Tudo" },
                { id: "smooth_skin", label: "Suavizar" },
                { id: "remove_blemishes", label: "Manchas" },
              ]}
              value={value.extras?.skin_target || "enhance_everything"}
              onChange={(v) => setExtra({ skin_target: v as any })}
            />
          </>
        )}
      </div>
    );
  }
  if (tab === "upscale") {
    return (
      <div style={wrap}>
        <span style={label}>Engine</span>
        <Seg
          options={[
            { id: "magnific-creative", label: "Creative" },
            { id: "magnific-precision", label: "Precision" },
            { id: "magnific-precision-v2", label: "Precision v2" },
            { id: "video-upscaler", label: "Vídeo" },
            { id: "video-upscaler-turbo", label: "Vídeo Turbo" },
          ]}
          value={value.upscaleEngine || "magnific-creative"}
          onChange={(v) => onChange({ upscaleEngine: v })}
        />
      </div>
    );
  }
  if (tab === "audio") {
    const kind = value.audioKind || "music";
    return (
      <div style={wrap}>
        <span style={label}>Tipo</span>
        <Seg
          options={[
            { id: "music", label: "Música" },
            { id: "sfx", label: "SFX" },
            { id: "voiceover", label: "Voiceover" },
            { id: "audio-isolation", label: "Isolar" },
          ]}
          value={kind}
          onChange={(v) => onChange({ audioKind: v })}
        />
        {kind === "voiceover" && (
          <>
            <span style={label}>Voz</span>
            <input
              type="text" placeholder="default / nome da voz"
              value={value.extras?.voice || ""}
              onChange={(e) => setExtra({ voice: e.target.value })}
              style={inputStyle}
            />
          </>
        )}
        {kind === "audio-isolation" && (
          <>
            <span style={label}>Áudio URL</span>
            <input
              type="url" placeholder="https://… arquivo de áudio"
              value={value.extras?.audio_url || ""}
              onChange={(e) => setExtra({ audio_url: e.target.value })}
              style={inputStyle}
            />
          </>
        )}
      </div>
    );
  }
  if (tab === "r3d") {
    return (
      <div style={wrap}>
        <span style={label}>Estilo 3D</span>
        <Seg
          options={[
            { id: "figurine", label: "Figurine" },
            { id: "toy", label: "Toy" },
            { id: "sculpture", label: "Escultura" },
            { id: "clay", label: "Argila" },
          ]}
          value={value.r3dStyle || "figurine"}
          onChange={(v) => onChange({ r3dStyle: v })}
        />
      </div>
    );
  }
  if (tab === "assets") {
    return (
      <div style={wrap}>
        <span style={label}>Asset</span>
        <Seg
          options={[
            { id: "icon", label: "Ícone" },
            { id: "sprite", label: "Sprite" },
            { id: "prop", label: "Prop" },
            { id: "ui", label: "UI" },
          ]}
          value={value.assetsKind || "icon"}
          onChange={(v) => onChange({ assetsKind: v })}
        />
      </div>
    );
  }
  if (tab === "depth") {
    return (
      <div style={wrap}>
        <span style={label}>Modo</span>
        <Seg
          options={[
            { id: "grayscale", label: "Cinza" },
            { id: "colored", label: "Colorido" },
          ]}
          value={value.depthMode || "grayscale"}
          onChange={(v) => onChange({ depthMode: v })}
        />
      </div>
    );
  }
  return null;
}

export function tabHasOptions(tab: string): boolean {
  return ["video", "edit", "upscale", "audio", "r3d", "assets", "depth"].includes(tab);
}
