/**
 * Shared UTR (UPI transaction reference) validation.
 * Mirrors the database `is_valid_utr` check so the UI fails fast with the
 * same rules the backend enforces.
 */
export const UTR_HINT = "6–40 letters or numbers, including at least one digit";

export function normalizeUtr(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 40);
}

export function validateUtr(value: string): { ok: true; utr: string } | { ok: false; message: string } {
  const utr = normalizeUtr(value.trim());
  if (utr.length === 0) return { ok: false, message: "Enter the UTR / transaction reference from your UPI app" };
  if (!/^[A-Za-z0-9-]{6,40}$/.test(utr)) {
    return { ok: false, message: `UTR looks invalid — use ${UTR_HINT}` };
  }
  if (!/[0-9]/.test(utr)) return { ok: false, message: "UTR must contain at least one digit" };
  if (utr.replace(/[^A-Za-z0-9]/g, "").length < 6) {
    return { ok: false, message: `UTR is too short — use ${UTR_HINT}` };
  }
  return { ok: true, utr };
}
