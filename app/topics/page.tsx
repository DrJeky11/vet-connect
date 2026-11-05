import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/lib/schema";
import { getPublicResources } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).topicPage.allTopics };
}

export default async function TopicsPage() {
  const t = await getDict();
  const resources = getPublicResources();
  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ href: "/", label: t.nav.home }, { label: t.topicPage.crumbTopics }]} />
      <h1 className="text-3xl font-bold">{t.topicPage.allTopics}</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const n = resources.filter((r) => r.categories.includes(c.id)).length;
          return (
            <li key={c.id}>
              <Link href={`/topics/${c.id}`} className="choice no-underline text-ink">
                <span>
                  <span className="block text-lg font-bold">{t.categories[c.id].label}</span>
                  <span className="block text-base text-muted">{t.categories[c.id].hint}</span>
                  <span className="block text-base">{t.topicPage.count(n)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
