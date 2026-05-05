/**
 * ToolOptionsBar — barra de opções específicas por ferramenta,
 * renderizada acima do Dock. Cada tab mostra só os controles que fazem sentido.
 */
import { useState, type CSSProperties } from "react";
import { MaskEditor } from "./MaskEditor";

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
  /** Quando o usuário escolhe uma operação, sugerimos um prompt pronto. */
  onSuggestPrompt?: (text: string) => void;
};

const EDIT_PROMPTS: Record<string, string> = {
  "replace-bg": "Substitua o fundo por um cenário cinematográfico coerente com o sujeito. Mantenha pose, iluminação no sujeito, cores e bordas intactas; ajuste a luz do novo fundo de forma realista.",
  "remove-bg": "Remova o fundo da imagem deixando apenas o sujeito principal com bordas limpas e fundo transparente.",
  "relight": "Reilumine a cena com luz suave de estúdio vinda da esquerda, sombras naturais e contraste cinematográfico, preservando o sujeito.",
  "expand": "Expanda a imagem mantendo a continuidade do cenário, perspectiva e iluminação originais, sem distorcer o sujeito.",
  "style-transfer": "Aplique o estilo visual da referência ao sujeito, preservando identidade e composição. Combine cores, textura e atmosfera da referência.",
  "ideogram-edit": "Edite apenas a região marcada pela máscara branca, mantendo o restante da imagem inalterado e integrando textura, luz e cor.",
  "change-camera": "Recrie a cena a partir de um novo ângulo de câmera, mantendo o sujeito, proporções e iluminação consistentes.",
  "reimagine-flux": "Reimagine a cena com nova composição cinematográfica, mantendo o sujeito reconhecível e o clima geral da imagem.",
  "skin-enhancer-creative": "Aprimore a pele do sujeito com acabamento editorial: textura realista, brilho controlado e tom uniforme, sem perder traços naturais.",
  "skin-enhancer-faithful": "Aprimore a pele preservando 100% dos traços, marcas e identidade. Apenas suavize ruído e uniformize tom.",
  "skin-enhancer-flexible": "Aprimore a pele de forma equilibrada conforme o alvo selecionado, mantendo aparência natural.",
};

const R3D_PROMPTS: Record<string, string> = {
  figurine: "Transforme o sujeito em uma figurine de colecionador estilo PVC, base circular, iluminação de estúdio, alta fidelidade.",
  toy: "Transforme em um brinquedo de plástico estilizado, cores vibrantes, acabamento brilhante, fundo neutro.",
  sculpture: "Transforme em uma escultura de mármore detalhada, iluminação dramática, fundo escuro de museu.",
  clay: "Transforme em uma figura de argila modelada à mão, textura visível, iluminação suave.",
};

const ASSETS_PROMPTS: Record<string, string> = {
  icon: "Ícone vetorial minimalista, traço uniforme, fundo transparente, estilo flat moderno.",
  sprite: "Sprite de jogo 2D em pixel art, pose clara, paleta limitada, fundo transparente.",
  prop: "Prop 3D estilizado para jogo, render isométrico, iluminação suave, fundo neutro.",
  ui: "Elemento de UI moderno, glassmorphism sutil, cantos arredondados, paleta escura.",
};

const AUDIO_PROMPTS: Record<string, string> = {
  music: "Trilha cinematográfica épica, build-up gradual, percussão orquestral e cordas, 60s.",
  sfx: "Efeito sonoro curto, impacto grave seguido de reverb metálico, 2s.",
  voiceover: "Narração calma e profissional em português, tom acolhedor.",
  "audio-isolation": "Isolar a voz principal removendo ruído de fundo e música.",
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

export function ToolOptionsBar({ tab, value, onChange, extra, onSuggestPrompt }: Props) {
  const setExtra = (patch: Partial<ToolExtras>) =>
    onChange({ extras: { ...(value.extras || {}), ...patch } });
  const suggest = (text?: string) => { if (text && onSuggestPrompt) onSuggestPrompt(text); };

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
          onChange={(v) => { onChange({ editOp: v }); suggest(EDIT_PROMPTS[v]); }}
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
          onChange={(v) => { onChange({ audioKind: v }); suggest(AUDIO_PROMPTS[v]); }}
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
          onChange={(v) => { onChange({ r3dStyle: v }); suggest(R3D_PROMPTS[v]); }}
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
          onChange={(v) => { onChange({ assetsKind: v }); suggest(ASSETS_PROMPTS[v]); }}
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
