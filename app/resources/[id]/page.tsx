import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResource } from "@/lib/data";
import { ResourceCard } from "@/components/ResourceCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = getResource((await params).id);
  return { title: r?.name ?? "Listing not found", description: r?.description };
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const r = getResource((await params).id);
  if (!r || r.status === "archived") notFound();
  const t = await getDict();
  const topic = r.categories[0];
  return (
    <div className="grid gap-4">
      <Breadcrumbs
        items={[
          { href: "/", label: t.nav.home },
          { href: `/topics/${topic}`, label: t.categories[topic].label },
          { label: r.name },
        ]}
      />
      <h1 className="sr-only">{r.name}</h1>
      {t.card.sourceLanguageNote && <p className="text-base text-muted">{t.card.sourceLanguageNote}</p>}
      <ResourceCard r={r} detail headingLevel={2} />
      <p className="text-muted">{t.card.detailNote}</p>
    </div>
  );
}
