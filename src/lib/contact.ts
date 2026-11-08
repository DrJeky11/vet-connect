/**
 * Turn a stated phone number into a tel: link. Returns null if no digits.
 * Takes the first full North American number in the field; notes after it,
 * such as "(866-LEGLAID)" or "(24-hour hotline)", are ignored. Falls back to
 * short codes like "988" or "2-1-1".
 */
export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const full = phone.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const short = full ? null : phone.match(/\b\d(?:-\d){2}\b|\b\d{3}\b/);
  const m = full ?? short;
  if (!m) return null;
  const digits = m[0].replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function directionsHref(address: string | null): string | null {
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
