import type { Metadata } from "next";
import { getPublicResources } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SuggestForm } from "./SuggestForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).suggest.title };
}

export default async function SuggestPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const t = await getDict();
  const listings = getPublicResources()
    .map((r) => ({ id: r.id, name: r.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const listing = (await searchParams).listing;
  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ href: "/", label: t.nav.home }, { label: t.suggest.title }]} />
      <h1 className="text-3xl font-bold">{t.suggest.title}</h1>
      <p className="text-xl">{t.suggest.lead}</p>
      <SuggestForm listings={listings} preset={listings.some((l) => l.id === listing) ? listing! : ""} />
    </div>
  );
}
