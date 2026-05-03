/**
 * sha256Hex — usado pra logar hashes de imagens enviadas a Face Swap / Cloth Swap.
 * Aceita ArrayBuffer ou string.
 */
export async function sha256Hex(input: ArrayBuffer | Uint8Array | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input)
    : input instanceof Uint8Array ? input
    : new Uint8Array(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await sha256Hex(await r.arrayBuffer());
  } catch {
    return null;
  }
}
