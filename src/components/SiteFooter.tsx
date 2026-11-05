import Link from "next/link";
import { getDict } from "@/lib/i18n/server";

export async function SiteFooter() {
  const t = await getDict();
  const groups: { title: string; links: [string, string][] }[] = [
    {
      title: t.nav.findHelp,
      links: [
        ["/intake", t.nav.findHelp],
        ["/topics", t.nav.topics],
        ["/resources", t.nav.directory],
        ["/plan", t.nav.plan],
      ],
    },
    {
      title: t.footer.moreWays,
      links: [
        ["/updates", t.nav.updates],
        ["/updates/stop", t.stop.title],
        ["/print", t.nav.print],
        ["/updates/paper-form", t.updates.paperLink],
      ],
    },
    {
      title: t.nav.help,
      links: [
        ["/help", t.help.title],
        ["/suggest", t.footer.suggest],
        ["/about", t.footer.about],
      ],
    },
  ];
  return (
    <div className="no-print mt-8 border-t border-line bg-wash">
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h2 className="text-lg font-bold">{g.title}</h2>
              <ul className="mt-1 grid">
                {g.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="inline-flex min-h-[44px] items-center">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-base text-muted">{t.footer.disclaimer}</p>
        <p className="text-base text-muted">
          <Link href="/verify">{t.footer.verifier}</Link> · <Link href="/staff">{t.footer.staff}</Link>
        </p>
      </div>
    </div>
  );
}
