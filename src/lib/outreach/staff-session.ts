import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { normalizeInitials } from "../verifier";
import { readConfig } from "./config";

/**
 * Staff sign-in for outreach: a passcode plus initials, in a signed cookie
 * that expires after 8 hours. Separate from the verifier sign-in because this
 * area holds people's contact details. Until OUTREACH_PASSCODE is set it runs
 * in demo mode, where names, numbers and addresses are never shown.
 */
export const STAFF_COOKIE = "vsn-staff";
export const STAFF_MAX_AGE = 60 * 60 * 8;

const secret = () => `vsn-staff:${readConfig().staffPasscode}`;
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

export function checkPasscode(given: unknown): boolean {
  const expected = Buffer.from(readConfig().staffPasscode);
  const got = Buffer.from(typeof given === "string" ? given : "");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export function makeStaffToken(initials: string, now = Date.now()): string {
  const v = `${normalizeInitials(initials)}~${Math.floor(now / 1000)}`;
  return `${v}.${sign(v)}`;
}

export function readStaffToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [v, sig] = token.split(".");
  if (!v || !sig) return null;
  const expected = Buffer.from(sign(v));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  const [initials, issued] = v.split("~");
  if (!issued || now / 1000 - Number(issued) > STAFF_MAX_AGE) return null;
  return initials;
}

export async function currentStaff(): Promise<string | null> {
  return readStaffToken((await cookies()).get(STAFF_COOKIE)?.value);
}

/** Use at the top of every staff page, action and route. */
export async function requireStaff(): Promise<string> {
  const who = await currentStaff();
  if (!who) throw new Error("Sign in as staff first.");
  return who;
}
