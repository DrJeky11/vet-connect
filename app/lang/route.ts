import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

/** No-JavaScript language switch: sets the cookie and returns to the page. */
export function GET(req: Request) {
  const u = new URL(req.url);
  const to = u.searchParams.get("to");
  const next = u.searchParams.get("next") ?? "/";
  // Only same-site paths, never "//host" or a full URL.
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(safe, u.origin), 303);
  if (isLocale(to)) res.cookies.set(LOCALE_COOKIE, to, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
