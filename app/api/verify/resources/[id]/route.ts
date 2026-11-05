import { NextResponse } from "next/server";
import { loadSeed } from "@/lib/seed";
import { getStore } from "@/lib/store";
import { currentVerifier } from "@/lib/session";
import { VerifierError } from "@/lib/verifier";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const initials = await currentVerifier();
  if (!initials) return NextResponse.json({ error: "Sign in as a verifier first." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const store = getStore();
  const seed = loadSeed();
  const note = typeof body.note === "string" ? body.note : null;
  try {
    switch (body.action) {
      case "verify":
        return NextResponse.json({ resource: store.verify(seed, id, initials, note) });
      case "edit":
        return NextResponse.json({ resource: store.edit(seed, id, initials, body.changes ?? {}, note) });
      case "note":
        store.addNote(seed, id, initials, note ?? "");
        return NextResponse.json({ ok: true });
      case "archive":
      case "unarchive":
        return NextResponse.json({ resource: store.setArchived(seed, id, initials, body.action === "archive", note) });
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (e) {
    const status = e instanceof VerifierError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
