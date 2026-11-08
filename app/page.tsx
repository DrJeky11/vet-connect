import Link from "next/link";
import { CATEGORIES } from "@/lib/schema";
import { chatEnabled } from "@/lib/navigator-llm";
import { getDict } from "@/lib/i18n/server";
import { readConfig } from "@/lib/outreach/config";
import { getPublicResources } from "@/lib/data";
import { CATEGORY_STYLE } from "@/lib/category-style";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getDict();
  const line = readConfig().lineNumber;
  const ways = t.home.otherWays;
  const counts = new Map<string, number>();
  for (const r of getPublicResources()) for (const c of r.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  return (
    <div className="grid gap-10">
      <section aria-labelledby="hero" className="grid gap-4">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">{t.home.kicker}</p>
        <h1 id="hero" className="text-4xl font-extrabold leading-tight tracking-tight">
          {t.home.title}
        </h1>
        <p className="text-xl">{t.home.lead}</p>

        <form action="/resources" method="get" role="search" className="grid gap-2">
          <label htmlFor="home-q" className="text-lg font-bold">
            {t.home.searchLabel}
          </label>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
              🔍
            </span>
            <input
              id="home-q"
              name="q"
              type="search"
              className="field !min-h-[64px] !rounded-xl !pl-14 !pr-28 text-xl shadow-sm"
              placeholder={t.home.searchPlaceholder}
            />
            <button className="btn btn-primary absolute right-2 top-1/2 -translate-y-1/2">{t.home.searchButton}</button>
          </div>
        </form>

        <div className="flex flex-wrap gap-3">
          <Link href="/intake" className="btn btn-primary text-xl !min-h-[56px] !px-6">
            {t.home.start}
          </Link>
          <Link href="/resources" className="btn btn-secondary !min-h-[56px]">
            {t.home.browse}
          </Link>
          {chatEnabled() && (
            <Link href="/ask" className="btn btn-secondary !min-h-[56px]">
              {t.home.ask}
            </Link>
          )}
        </div>
        <p className="text-muted">{t.home.privacy}</p>
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-3 text-2xl font-bold">
          {t.home.topicsTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const s = CATEGORY_STYLE[c.id];
            const n = counts.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/topics/${c.id}`}
                  className={`tile group flex h-full min-h-[8rem] flex-col gap-1 rounded-xl border-2 border-t-8 border-line ${s.topBorder} bg-white p-4 text-ink no-underline shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <span aria-hidden="true" className="text-4xl">
                    {s.emoji}
                  </span>
                  <span className="text-xl font-bold leading-snug group-hover:underline">{t.categories[c.id].label}</span>
                  <span className="text-base text-muted">{t.categories[c.id].hint}</span>
                  <span className="mt-auto pt-1 text-sm font-bold text-muted">{t.topicPage.count(n)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ways" className="grid gap-3" data-testid="other-ways">
        <h2 id="ways" className="text-2xl font-bold">
          {t.home.otherWaysTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border-2 border-line p-4">
            <h3 className="text-xl font-bold">📱 {ways.textTitle}</h3>
            <p className="mt-1">{line ? ways.textBody(line) : ways.textBodyOff}</p>
          </li>
          <li className="rounded-xl border-2 border-line p-4">
            <h3 className="text-xl font-bold">
              <Link href="/updates">✉️ {ways.updatesTitle}</Link>
            </h3>
            <p className="mt-1">{ways.updatesBody}</p>
          </li>
          <li className="rounded-xl border-2 border-line p-4">
            <h3 className="text-xl font-bold">
              <Link href="/print">🖨️ {ways.printTitle}</Link>
            </h3>
            <p className="mt-1">{ways.printBody}</p>
          </li>
          <li className="rounded-xl border-2 border-line p-4">
            <h3 className="text-xl font-bold">
              <Link href="/updates/paper-form">📝 {ways.paperTitle}</Link>
            </h3>
            <p className="mt-1">{ways.paperBody}</p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="trust" className="rounded-xl bg-wash p-4">
        <h2 id="trust" className="text-xl font-bold">
          {t.home.trustTitle}
        </h2>
        <ul className="ml-5 mt-2 list-disc">
          {t.home.trust.map(([b, rest]) => (
            <li key={rest}>
              {b && <strong>{b}</strong>} {rest}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
