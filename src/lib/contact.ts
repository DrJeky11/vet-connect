/** Turn a stated phone number into a tel: link. Returns null if no digits. */
export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const m = phone.match(/\+?[\d][\d\s().-]{1,}\d|\d{3}/);
  if (!m) return null;
  const digits = m[0].replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function directionsHref(address: string | null): string | null {
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
