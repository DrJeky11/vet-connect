import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResource } from "@/lib/data";
import { ResourceCard } from "@/components/ResourceCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = getResource((await params).id);
  return { title: r?.name ?? "Listing not found" };
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const r = getResource((await params).id);
  if (!r || r.status === "archived") notFound();
  return (
    <div className="grid gap-4">
      <p className="no-print">
        <Link href="/resources">← Back to directory</Link>
      </p>
      <h1 className="sr-only">{r.name}</h1>
      <ResourceCard r={r} detail headingLevel={2} />
      <p className="text-muted">
        This site does not decide who qualifies. You may be eligible — call the provider to confirm before you go.
      </p>
    </div>
  );
}
