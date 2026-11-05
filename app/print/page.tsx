import type { Metadata } from "next";
import { CATEGORIES } from "@/lib/schema";
import { getPublicResources } from "@/lib/data";
import { effectiveStatus } from "@/lib/status";
import { getDict } from "@/lib/i18n/server";
import { formatDateIn } from "@/lib/i18n";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).print.title };
}

/** The whole directory in large type, grouped by topic, for printing and mailing. */
export default async function PrintDirectory() {
  const t = await getDict();
  const resources = getPublicResources();
  const now = new Date();
  const groups = CATEGORIES.map((c) => ({ c, items: resources.filter((r) => r.categories[0] === c.id) })).filter((g) => g.items.length);
  return (
    <div className="grid gap-6 print:text-[1.1em]">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold">{t.print.title}</h1>
        <p className="text-xl">{t.print.subtitle}</p>
        <p>{t.print.printed(now.toLocaleDateString(t.dateLocale, { dateStyle: "long" }))}</p>
        <p>{t.print.howTo}</p>
        <p className="rounded-lg border-4 border-crisis p-3 font-bold">
          {t.crisis.title}: {t.crisis.dial} · {t.crisis.text}
        </p>
        <PrintButton label={t.print.button} />
      </header>
      {t.card.sourceLanguageNote && <p className="text-base">{t.card.sourceLanguageNote}</p>}
      <nav aria-label={t.print.contents}>
        <h2 className="text-xl font-bold">{t.print.contents}</h2>
        <ul className="ml-5 list-disc">
          {groups.map((g) => (
            <li key={g.c.id}>
              <a href={`#${g.c.id}`}>{t.categories[g.c.id].label}</a> ({g.items.length})
            </li>
          ))}
        </ul>
      </nav>
      {groups.length === 0 && <p>{t.print.empty}</p>}
      {groups.map((g) => (
        <section key={g.c.id} id={g.c.id} aria-labelledby={`${g.c.id}-h`} className="grid gap-3">
          <h2 id={`${g.c.id}-h`} className="border-b-4 border-ink pb-1 text-2xl font-bold">{t.categories[g.c.id].label}</h2>
          {g.items.map((r) => (
            <article key={r.id} className="print-break grid gap-1 border-b border-line pb-3" data-testid="print-listing">
              <h3 className="text-xl font-bold" lang="en">{r.name}</h3>
              {r.organization !== r.name && <p lang="en">{r.organization}</p>}
              <p lang="en">{r.description}</p>
              <p><strong>{t.card.phone}:</strong> {r.phone ?? t.card.notListed}</p>
              {r.address && <p><strong>{t.card.address}:</strong> {r.address}</p>}
              {r.hours && <p><strong>{t.card.hours}:</strong> {r.hours}</p>}
              <p><strong>{t.card.whoItServes}:</strong> <span lang="en">{r.eligibility_text}</span></p>
              <p className="text-base">
                {t.card.source}: {r.source_name} ({r.source_url}) · {t.status.labels[effectiveStatus(r, now)]} ·{" "}
                {t.card.lastVerified}: {formatDateIn(t, r.last_verified_at)}
              </p>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
