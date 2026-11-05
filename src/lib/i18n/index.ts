import type { LocalityId } from "../schema";
import { en, type Dict, type Locale } from "./en";
import { es } from "./es";

export type { Dict, Locale };
export const LOCALES: Locale[] = ["en", "es"];
export const LOCALE_COOKIE = "vsn-lang";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "es";
}

export function dict(locale: Locale): Dict {
  return locale === "es" ? es : en;
}

/** "Spotsylvania County" / "Condado de Spotsylvania", or "Fredericksburg" for the city. */
export function placeShort(t: Dict, id: LocalityId): string {
  return t.localities[id].replace(/^City of |^Ciudad de /, "");
}

export function formatDateIn(t: Dict, date: string | null): string {
  if (!date) return t.status.notYet;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(t.dateLocale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
