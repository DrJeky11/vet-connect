import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutreach } from "@/lib/outreach/server";
import { getPublicResources } from "@/lib/data";
import { applyFilters } from "@/lib/filter";
import type { Resource } from "@/lib/schema";
import { dict } from "@/lib/i18n";
import { PrintButton } from "@/components/PrintButton";
import { staffOrRedirect } from "../../../guard";

export const metadata = { title: "Letters" };

/** Listings for one person: their topics (or all) in their place, up to six. */
function listingsFor(all: Resource[], topics: string[], locality: Resource["service_area"][number] | null): Resource[] {
  const picked = topics.length
    ? all.filter((r) => r.categories.some((c) => topics.includes(c)))
    : all;
  return applyFilters(picked, { locality: locality === "statewide" ? null : locality }).slice(0, 6);
}

export default async function Letters({ params }: { params: Promise<{ id: string }> }) {
  await staffOrRedirect();
  const { store, cfg } = getOutreach();
  const c = store.campaign(Number((await params).id));
  if (!c || !c.mail_body) notFound();
  const letters = store.letters(c.id);
  const reveal = !cfg.staffPasscodeIsDemo;
  const all = getPublicResources();
  const today = new Date();
  return (
    <div className="grid gap-4">
      <div className="no-print grid gap-2">
        <p><Link href={`/staff/messages/${c.id}`}>← Back to the message</Link></p>
        <h1 className="text-3xl font-bold">{letters.length} letter(s) to print</h1>
        <p className="text-base">Each letter prints on its own page. The address sits where a standard #10 window envelope shows it.</p>
        <PrintButton label="Print letters" />
      </div>
      {letters.map(({ delivery, name, address, language, topics, locality }) => {
        const t = dict(language);
        const es = language === "es";
        const items = c.include_listings ? listingsFor(all, topics, locality) : [];
        return (
          <article key={delivery.id} className="letter grid gap-4 border-b-4 border-dashed border-line pb-8 print:border-0" lang={language} data-testid="letter">
            <div className="text-base">
              {(cfg.returnAddress ?? [cfg.senderName]).map((l) => (
                <span key={l} className="block">{l}</span>
              ))}
            </div>
            <address className="mt-6 not-italic text-xl leading-snug">
              <span className="block">{reveal ? name : es ? "Nombre en el archivo" : "Name on file"}</span>
              {reveal ? (
                <>
                  <span className="block">{address.line1}</span>
                  {address.line2 && <span className="block">{address.line2}</span>}
                  <span className="block">{address.city}, {address.state} {address.zip}</span>
                </>
              ) : (
                <span className="block">{es ? "Dirección oculta en modo demostración" : "Address hidden in demo mode"}</span>
              )}
            </address>
            <p>{today.toLocaleDateString(t.dateLocale, { dateStyle: "long" })}</p>
            <p>{es ? `Estimado/a ${reveal ? name : "veterano/a"}:` : `Dear ${reveal ? name : "veteran"},`}</p>
            <p className="whitespace-pre-wrap">{c.mail_body}</p>
            {items.length > 0 && (
              <section className="grid gap-2">
                <h2 className="text-xl font-bold">{es ? "Servicios para usted" : "Services for you"}</h2>
                <ul className="grid gap-2">
                  {items.map((r) => (
                    <li key={r.id} className="border-l-4 border-ink pl-3">
                      <strong lang="en">{r.name}</strong>
                      <span className="block">{t.card.phone}: {r.phone ?? t.card.notListed}</span>
                      {r.address && <span className="block">{t.card.address}: {r.address}</span>}
                      {r.hours && <span className="block">{t.card.hours}: {r.hours}</span>}
                      <span className="block text-base">{t.card.source}: {r.source_name}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-base">{t.card.whoNote}</p>
              </section>
            )}
            <footer className="grid gap-1 border-t border-ink pt-2 text-base">
              <p className="font-bold">{t.crisis.title}: {t.crisis.dial} · {t.crisis.text}</p>
              <p>
                {es
                  ? `Para dejar de recibir estas cartas, ${cfg.returnAddress ? "escríbanos a la dirección de arriba" : "avise a la oficina que envió esta carta"}${cfg.siteUrl ? ` o visite ${cfg.siteUrl}/updates/stop` : ""}.`
                  : `To stop these letters, ${cfg.returnAddress ? "write to us at the address above" : "tell the office that sent this letter"}${cfg.siteUrl ? ` or visit ${cfg.siteUrl}/updates/stop` : ""}.`}
              </p>
              <p>{es ? "Este es un directorio comunitario. No es el VA." : "This is a community directory. It is not the VA."}</p>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
