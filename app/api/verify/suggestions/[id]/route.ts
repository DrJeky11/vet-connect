import { NextResponse } from "next/server";
import { getSuggestions } from "@/lib/store";
import { currentVerifier } from "@/lib/session";
import { VerifierError } from "@/lib/verifier";

/** A verifier marks a public report as handled. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const initials = await currentVerifier();
  if (!initials) return NextResponse.json({ error: "Sign in as a verifier first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    getSuggestions().resolve(Number((await params).id), initials, typeof body.note === "string" ? body.note : null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof VerifierError ? e.status : 500 });
  }
}
