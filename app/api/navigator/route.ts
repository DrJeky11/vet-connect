import { NextResponse } from "next/server";
import { getPublicResources } from "@/lib/data";
import { answer } from "@/lib/navigator";
import { chatEnabled, extractFilters } from "@/lib/navigator-llm";

export async function POST(req: Request) {
  if (!chatEnabled()) return NextResponse.json({ error: "The navigator is turned off." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Type what you need." }, { status: 400 });
  const { filters, engine } = await extractFilters(text);
  return NextResponse.json({ ...answer(getPublicResources(), filters), engine });
}
