import { NextResponse } from "next/server";
import { COOKIE, makeToken, passcode } from "@/lib/session";
import { VerifierError } from "@/lib/verifier";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.passcode !== passcode()) {
    return NextResponse.json({ error: "That passcode is not right." }, { status: 401 });
  }
  try {
    const token = makeToken(body.initials);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof VerifierError ? e.status : 400 });
  }
}
