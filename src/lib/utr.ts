/**
 * Shared UTR (UPI transaction reference) validation.
 * A UPI UTR is always exactly 12 digits, and the database `is_valid_utr`
 * check (6–40 alphanumerics with at least one digit) accepts that shape,
 * so the UI enforces the stricter, exact rule.
 */
export const UTR_LENGTH = 12;
export const UTR_HINT = `exactly ${UTR_LENGTH} digits`;

export function normalizeUtr(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, UTR_LENGTH);
}

export function validateUtr(
  value: string,
): { ok: true; utr: string } | { ok: false; message: string } {
  const utr = normalizeUtr(value.trim());
  if (utr.length === 0) return { ok: false, message: "Enter the 12-digit UTR from your UPI app" };
  if (utr.length !== UTR_LENGTH) {
    return { ok: false, message: `UTR must be ${UTR_HINT} — you entered ${utr.length}` };
  }
  return { ok: true, utr };
}
