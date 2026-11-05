/**
 * US phone numbers only (the service area is in Virginia). Stored as E.164
 * (+15405551234) so lookups and opt-outs match however a number was typed.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  // NANP: area code and exchange cannot start with 0 or 1.
  if (/^[01]/.test(digits) || /^[01]/.test(digits.slice(3))) return null;
  return `+1${digits}`;
}

/** (540) 555-1234 */
export function formatUs(e164: string): string {
  const d = e164.replace(/^\+1/, "");
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Staff screens show only the last four digits. */
export function maskPhone(last4: string | null): string {
  return last4 ? `(•••) •••-${last4}` : "—";
}

/** Spoken digit by digit so text-to-speech does not read "five billion…". */
export function speakDigits(phone: string): string {
  return phone
    .replace(/\D/g, "")
    .split("")
    .join(" ");
}
