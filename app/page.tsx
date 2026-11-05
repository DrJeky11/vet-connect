import Link from "next/link";
import { CATEGORIES } from "@/lib/schema";
import { chatEnabled } from "@/lib/navigator-llm";
import { getDict } from "@/lib/i18n/server";
import { readConfig } from "@/lib/outreach/config";

export const dynamic = "force-dynamic";

const ICONS: Record<string, string> = {
  transportation: "🚐",
  legal: "⚖️",
  health: "🩺",
  mental_health: "💬",
  housing: "🏠",
  food: "🍎",
  benefits: "📄",
  employment: "💼",
  public_services: "🏛️",
};

export default async function Home() {
  const t = await getDict();
  const line = readConfig().lineNumber;
  const ways = t.home.otherWays;
  return (
    <div className="grid gap-10">
      <section aria-labelledby="hero" className="grid gap-4">
        <h1 id="hero" className="text-3xl font-bold leading-tight">
          {t.home.title}
        </h1>
        <p className="text-xl">{t.home.lead}</p>

        <form action="/resources" method="get" role="search" className="grid gap-2 rounded-xl border-2 border-brand p-4">
          <label htmlFor="home-q" className="text-lg font-bold">
            {t.home.searchLabel}
          </label>
          <div className="flex flex-wrap gap-2">
            <input id="home-q" name="q" type="search" className="field min-w-0 flex-1" placeholder={t.home.searchPlaceholder} />
            <button className="btn btn-primary">{t.home.searchButton}</button>
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
        <ul className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={`/topics/${c.id}`} className="choice no-underline text-ink">
                <span aria-hidden="true" className="text-2xl">{ICONS[c.id]}</span>
                <span>
                  <span className="block text-lg font-bold">{t.categories[c.id].label}</span>
                  <span className="block text-base text-muted">{t.categories[c.id].hint}</span>
                </span>
              </Link>
            </li>
          ))}
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
