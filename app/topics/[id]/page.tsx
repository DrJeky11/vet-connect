import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_IDS, LOCALITIES, type CategoryId, type LocalityId } from "@/lib/schema";
import { applyFilters, filtersToParams } from "@/lib/filter";
import { getPublicResources } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { placeShort } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ResourceCard } from "@/components/ResourceCard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ locality?: string }> };

const asCategory = (id: string) => ((CATEGORY_IDS as string[]).includes(id) ? (id as CategoryId) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = asCategory((await params).id);
  const t = await getDict();
  return id ? { title: t.categories[id].label, description: t.categories[id].hint } : {};
}

export default async function TopicPage({ params, searchParams }: Props) {
  const id = asCategory((await params).id);
  if (!id) notFound();
  const sp = await searchParams;
  const locality = LOCALITIES.find((l) => l.id === sp.locality)?.id ?? null;
  const t = await getDict();
  const all = getPublicResources();
  const now = new Date();
  const results = applyFilters(all, { category: id, locality });
  const nearby = locality ? applyFilters(all, { category: id }).filter((r) => !results.some((x) => x.id === r.id)) : [];
  const label = t.categories[id].label;
  const chip = (l: LocalityId | null, text: string) => {
    const current = l === locality;
    return (
      <li key={l ?? "all"}>
        <Link
          href={l ? `/topics/${id}?locality=${l}` : `/topics/${id}`}
          aria-current={current ? "true" : undefined}
          className={`btn !min-h-[44px] ${current ? "btn-primary" : "btn-secondary"}`}
          scroll={false}
        >
          {text}
        </Link>
      </li>
    );
  };

  return (
    <div className="grid gap-6">
      <Breadcrumbs items={[{ href: "/", label: t.nav.home }, { href: "/topics", label: t.topicPage.crumbTopics }, { label }]} />
      <div>
        <h1 className="text-3xl font-bold">
          {label}
          {locality ? t.directory.near(placeShort(t, locality)) : ""}
        </h1>
        <p className="text-xl text-muted">{t.categories[id].hint}</p>
      </div>

      <section aria-labelledby="place-h" className="grid gap-2">
        <h2 id="place-h" className="text-lg font-bold">{t.topicPage.pickPlace}</h2>
        <ul className="flex flex-wrap gap-2">
          {chip(null, t.topicPage.everywhere)}
          {LOCALITIES.map((l) => chip(l.id, placeShort(t, l.id)))}
        </ul>
      </section>

      <section aria-labelledby="ready-h" className="grid gap-3 rounded-xl bg-wash p-4 sm:grid-cols-2">
        <div>
          <h2 id="ready-h" className="text-xl font-bold">{t.topicPage.beforeYouCall}</h2>
          <ul className="ml-5 mt-2 list-disc">
            {t.topicPage.tips[id].map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-bold">{t.topicPage.askThese}</h2>
          <ul className="ml-5 mt-2 list-disc">
            {t.topicPage.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      </section>

      {t.card.sourceLanguageNote && <p className="text-base text-muted">{t.card.sourceLanguageNote}</p>}
      <p className="font-bold" data-testid="result-count">
        {t.directory.count(results.length)}
        {locality ? t.directory.thatList(t.localities[locality]) : ""}
      </p>
      {results.length === 0 && nearby.length === 0 && (
        <div className="rounded-xl bg-warn-bg p-4" role="status">
          <p className="font-bold">{t.directory.noneTitle}</p>
          <p className="mt-1">
            <a href="https://search.211virginia.org/">{t.directory.none211}</a>
          </p>
        </div>
      )}
      <ul className="grid gap-4">
        {results.map((r) => (
          <li key={r.id}>
            <ResourceCard r={r} now={now} />
          </li>
        ))}
      </ul>
      {nearby.length > 0 && (
        <section aria-labelledby="nearby-h" className="grid gap-3" data-testid="nearby">
          <h2 id="nearby-h" className="text-2xl font-bold">{t.directory.nearbyTitle}</h2>
          <p>{t.directory.nearbyBody(t.localities[locality!])}</p>
          <ul className="grid gap-4">
            {nearby.map((r) => (
              <li key={r.id}>
                <ResourceCard r={r} now={now} headingLevel={3} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="no-print flex flex-wrap gap-3 border-t border-line pt-4">
        <Link href={`/resources?${filtersToParams({ category: id, locality }).toString()}`} className="btn btn-secondary">
          {t.topicPage.moreFilters}
        </Link>
        <Link href={`/updates?topic=${id}`} className="btn btn-secondary">
          {t.topicPage.getUpdates(label)}
        </Link>
      </div>
    </div>
  );
}
