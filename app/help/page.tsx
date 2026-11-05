import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { readConfig } from "@/lib/outreach/config";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).help.title };
}

export default async function HelpPage() {
  const t = await getDict();
  const line = readConfig().lineNumber;
  const faqs = t.help.faqs.map((f, i) => ({ ...f, id: `q${i + 1}` }));
  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ href: "/", label: t.nav.home }, { label: t.nav.help }]} />
      <h1 className="text-3xl font-bold">{t.help.title}</h1>
      <p className="text-xl">{t.help.lead}</p>
      <nav aria-label={t.help.title} className="rounded-xl bg-wash p-4">
        <ol className="ml-5 list-decimal">
          {faqs.map((f) => (
            <li key={f.id}>
              <a href={`#${f.id}`} className="inline-flex min-h-[44px] items-center">{f.q}</a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="grid gap-5">
        {faqs.map((f, i) => (
          <section key={f.id} id={f.id} aria-labelledby={`${f.id}-h`} className="scroll-mt-4">
            <h2 id={`${f.id}-h`} className="text-2xl font-bold">{f.q}</h2>
            <p className="mt-1">{f.a}</p>
            {i === 2 && line && <p className="mt-1 font-bold">{t.help.lineAnswer(line)}</p>}
            {i === 2 && (
              <p className="mt-2 flex flex-wrap gap-2">
                <Link href="/updates" className="btn btn-secondary">{t.nav.updates}</Link>
                <Link href="/print" className="btn btn-secondary">{t.nav.print}</Link>
                <Link href="/updates/paper-form" className="btn btn-secondary">{t.updates.paperLink}</Link>
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
