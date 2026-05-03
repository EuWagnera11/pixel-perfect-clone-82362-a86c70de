/**
 * Watermark server-side pra Face Swap e Cloth Swap.
 * Aplica texto "REFINE · AI generated" no canto inferior direito.
 *
 * Uso server-side em Deno: `imagescript` (sem deps nativas).
 * Recebe Uint8Array da imagem original e devolve Uint8Array PNG marcada.
 */
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

export const BRAND_NAME = "REFINE";
const WATERMARK_TEXT = `${BRAND_NAME} · AI generated`;

export async function applyWatermark(input: Uint8Array): Promise<Uint8Array> {
  const img = await Image.decode(input);
  const fontSize = Math.max(14, Math.round(img.width / 60));
  // Sombra translúcida + texto branco. Posiciona a ~16px da borda.
  const text = await Image.renderText(
    await loadFont(),
    fontSize,
    WATERMARK_TEXT,
    0xffffffe6, // branco com leve transparência
  );
  const margin = Math.round(fontSize * 0.8);
  const x = img.width - text.width - margin;
  const y = img.height - text.height - margin;

  // Sombra/box atrás pra legibilidade
  const pad = Math.round(fontSize * 0.3);
  const box = new Image(text.width + pad * 2, text.height + pad * 2);
  box.fill(0x00000080);
  img.composite(box, x - pad, y - pad);
  img.composite(text, x, y);

  return await img.encode();
}

let _font: Uint8Array | null = null;
async function loadFont(): Promise<Uint8Array> {
  if (_font) return _font;
  // imagescript renderText aceita TTF; usamos uma sans bundled via URL pública estável.
  const r = await fetch(
    "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Bold.ttf",
  );
  _font = new Uint8Array(await r.arrayBuffer());
  return _font;
}
