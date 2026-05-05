/**
 * ToolOptionsBar — barra de opções específicas por ferramenta,
 * renderizada acima do Dock. Cada tab mostra só os controles que fazem sentido.
 */
import type { CSSProperties } from "react";

export type ToolOptions = {
  // video
  videoDuration?: "5s" | "6s" | "10s";
  // edit
  editOp?: "remove-bg" | "replace-bg" | "relight" | "expand" | "style-transfer";
  // upscale
  upscaleEngine?: "magnific-creative" | "magnific-precision";
  // audio
  audioKind?: "music" | "sfx";
  // r3d
  r3dStyle?: "figurine" | "toy" | "sculpture" | "clay";
  // assets
  assetsKind?: "icon" | "sprite" | "prop" | "ui";
  // depth
  depthMode?: "grayscale" | "colored";
};

type Props = {
  tab: string;
  value: ToolOptions;
  onChange: (patch: Partial<ToolOptions>) => void;
};

const wrap: CSSProperties = {
  display: "flex", gap: 8, padding: "8px 14px", flexWrap: "wrap",
  alignItems: "center", justifyContent: "center",
};
const label: CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
  color: "rgba(255,255,255,.45)", marginRight: 4,
};

function Seg<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value?: T; onChange: (v: T) => void }) {
  return (
    <div style={{
      display: "inline-flex", borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)",
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
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToolOptionsBar({ tab, value, onChange }: Props) {
  if (tab === "video") {
    return (
      <div style={wrap}>
        <span style={label}>Duração</span>
        <Seg
          options={[{ id: "5s", label: "5s" }, { id: "6s", label: "6s" }, { id: "10s", label: "10s" }]}
          value={value.videoDuration || "5s"}
          onChange={(v) => onChange({ videoDuration: v })}
        />
      </div>
    );
  }
  if (tab === "edit") {
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
          ]}
          value={value.editOp || "replace-bg"}
          onChange={(v) => onChange({ editOp: v })}
        />
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
          ]}
          value={value.upscaleEngine || "magnific-creative"}
          onChange={(v) => onChange({ upscaleEngine: v })}
        />
      </div>
    );
  }
  if (tab === "audio") {
    return (
      <div style={wrap}>
        <span style={label}>Tipo</span>
        <Seg
          options={[{ id: "music", label: "Música" }, { id: "sfx", label: "SFX" }]}
          value={value.audioKind || "music"}
          onChange={(v) => onChange({ audioKind: v })}
        />
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
