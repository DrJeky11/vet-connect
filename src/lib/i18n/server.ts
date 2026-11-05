import "server-only";
import { cookies } from "next/headers";
import { dict, isLocale, LOCALE_COOKIE, type Dict, type Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : "en";
}

export async function getDict(): Promise<Dict> {
  return dict(await getLocale());
}
