/**
 * Sanitização de texto livre do usuário antes de injetar no prompt frame.
 * - Remove tentativas óbvias de prompt-injection
 * - Bloqueia termos NSFW / deepfake / abuso de identidade
 * - Limita tamanho
 */

const MAX_LEN = 500;

const INJECTION_PATTERNS = [
  /ignore (all )?(previous|above) (instructions|prompts?)/i,
  /system\s*:\s*/i,
  /\[\s*system\s*\]/i,
  /you are now/i,
  /disregard (the )?(rules|guidelines)/i,
];

const BLOCKED_TERMS = [
  // NSFW óbvio
  "nude", "naked", "nsfw", "porn", "explicit sexual",
  "topless", "lingerie shoot", "underwear shoot",
  // Menores
  "child", "kid", "minor", "underage", "teen ", "teenager", "loli",
  // Deepfake / impersonation
  "deepfake", "impersonate", "fake celebrity", "real person without consent",
  // Violência gráfica
  "gore", "graphic violence", "decapitat", "bloody corpse",
];

export type SanitizeResult =
  | { ok: true; text: string }
  | { ok: false; code: string; message: string };

export function sanitizeUserText(input: string): SanitizeResult {
  if (typeof input !== "string") {
    return { ok: false, code: "INVALID_INPUT", message: "Texto inválido." };
  }
  const trimmed = input.trim().slice(0, MAX_LEN);
  if (!trimmed) return { ok: true, text: "" };

  for (const re of INJECTION_PATTERNS) {
    if (re.test(trimmed)) {
      return { ok: false, code: "PROMPT_INJECTION_DETECTED", message: "Texto contém instruções não permitidas." };
    }
  }
  const lower = trimmed.toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { ok: false, code: "BLOCKED_CONTENT", message: "Texto contém conteúdo não permitido." };
    }
  }
  return { ok: true, text: trimmed };
}
