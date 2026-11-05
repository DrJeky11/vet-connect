import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { normalizeInitials } from "./verifier";

/**
 * SIMULATED login for the demo. A shared passcode plus initials, kept in a
 * signed cookie. This is not real authentication and is labeled as such.
 */
export const COOKIE = "vsn-verifier";
export const passcode = () => process.env.VERIFIER_PASSCODE || "demo-verifier";
const secret = () => `vsn:${passcode()}`;

function sign(v: string) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

export function makeToken(initials: string): string {
  const v = normalizeInitials(initials);
  return `${v}.${sign(v)}`;
}

export function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [v, sig] = token.split(".");
  if (!v || !sig) return null;
  const expected = Buffer.from(sign(v));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return v;
}

export async function currentVerifier(): Promise<string | null> {
  return readToken((await cookies()).get(COOKIE)?.value);
}
