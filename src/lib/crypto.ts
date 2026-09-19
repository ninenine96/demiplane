/** Small crypto helpers for magic-link tokens and sessions. */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Cryptographically random URL-safe token. */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/**
 * A numeric one-time code (the "sigil" on a sending stone). Rejection sampling
 * keeps the distribution uniform rather than modulo-biased.
 */
export function randomCode(digits = 6): string {
  const max = 10 ** digits;
  const ceiling = Math.floor(0xffffffff / max) * max;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= ceiling);
  return String(value % max).padStart(digits, "0");
}

/** SHA-256 hex digest. Only hashes are ever stored for tokens. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
