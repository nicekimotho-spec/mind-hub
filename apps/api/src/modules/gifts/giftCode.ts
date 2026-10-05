import crypto from "node:crypto";

// No 0/O, 1/I/L: codes are read off phone screens and typed by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10; // 31^10 ≈ 8×10^14 — not guessable by trying codes.

export function generateGiftCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

/** Accepts what people actually type: any case, with or without the dash or spaces. */
export function normalizeGiftCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** "ABCDE-FGHJK", for display. */
export function formatGiftCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}
