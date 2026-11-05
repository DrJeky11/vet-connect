import { NextResponse } from "next/server";
import { getPublicResources } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Public, read-only listing data (archived listings excluded). */
export function GET() {
  return NextResponse.json({ resources: getPublicResources() });
}
