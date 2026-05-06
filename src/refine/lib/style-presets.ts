/**
 * Catálogo único de presets de Style Transfer.
 * Carrega do JSON (refine-styles) e expõe lista tipada para a UI.
 * O backend usa apenas o `id` + texto descritivo concatenado no prompt.
 */
import raw from "./style-presets.json";

export type StylePreset = {
  id: string;
  display_name: string;
  category: string;
  description: string;
  prompt_suffix: string;
  intensity_default: number;
  color_palette: string[];
};

export const STYLE_PRESETS: StylePreset[] = (raw as any).styles.map((s: any) => ({
  id: s.id,
  display_name: s.display_name,
  category: s.category,
  description: s.description,
  prompt_suffix: s.prompt_suffix,
  intensity_default: s.intensity_default ?? 0.7,
  color_palette: s.color_palette ?? [],
}));

export const STYLE_PRESET_IDS = STYLE_PRESETS.map((s) => s.id);

export function getStylePreset(id?: string): StylePreset | undefined {
  if (!id) return undefined;
  return STYLE_PRESETS.find((s) => s.id === id);
}
