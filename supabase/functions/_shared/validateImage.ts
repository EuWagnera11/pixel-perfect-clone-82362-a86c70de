/**
 * Validação de imagens — limites compartilhados entre todas as tools.
 * Recebe uma URL pública (já no Storage) e retorna metadata + erro padronizado.
 */
export type ImageValidation =
  | { ok: true; mime: string; bytes: number; width?: number; height?: number }
  | { ok: false; code: string; message: string };

const ACCEPTED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_PX = 256;
const MAX_PX = 4096;

export async function validateImageUrl(url: string): Promise<ImageValidation> {
  let head: Response;
  try {
    head = await fetch(url, { method: "HEAD" });
  } catch {
    return { ok: false, code: "INVALID_IMAGE_URL", message: "Não foi possível acessar a imagem." };
  }
  if (!head.ok) return { ok: false, code: "INVALID_IMAGE_URL", message: "Imagem inacessível." };

  const mime = (head.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ACCEPTED_MIMES.includes(mime)) {
    return { ok: false, code: "INVALID_IMAGE_TYPE", message: "Formato não suportado. Use JPEG, PNG ou WebP." };
  }
  const len = parseInt(head.headers.get("content-length") || "0", 10);
  if (len > MAX_BYTES) {
    return { ok: false, code: "IMAGE_TOO_LARGE", message: "Imagem maior que 10 MB." };
  }
  return { ok: true, mime, bytes: len };
}

export const IMG_LIMITS = { ACCEPTED_MIMES, MAX_BYTES, MIN_PX, MAX_PX };
