import type { Metadata } from "next";
import { CATEGORIES, LOCALITIES } from "@/lib/schema";
import { getDict } from "@/lib/i18n/server";
import { readConfig } from "@/lib/outreach/config";
import { CHANNELS, CHANNEL_LABELS, CHANNEL_LABELS_ES, PERMISSION_TEXT, consentText } from "@/lib/outreach/rules";
import { PrintButton } from "@/components/PrintButton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).paper.title };
}

const Box = () => <span aria-hidden="true" className="inline-block h-6 w-6 shrink-0 border-2 border-ink align-middle" />;
const Line = ({ label }: { label: string }) => (
  <div className="grid gap-1">
    <span className="font-bold">{label}</span>
    <span className="block h-10 border-b-2 border-ink" />
  </div>
);

/** A printable sign-up form for people without a computer. Staff enter it as "paper form". */
export default async function PaperForm() {
  const t = await getDict();
  const p = t.paper;
  const cfg = readConfig();
  const labels = t.locale === "es" ? CHANNEL_LABELS_ES : CHANNEL_LABELS;
  return (
    <div className="grid gap-5 print:text-[1.05em]">
      <PrintButton label={p.print} />
      <h1 className="text-3xl font-bold">{p.title}</h1>
      <p>{p.intro}</p>
      <div className="grid gap-4">
        <Line label={p.name} />
        <Line label={p.phone} />
        <Line label={p.address} />
        <Line label={p.cityStateZip} />
      </div>
      <div className="grid gap-2">
        <span className="font-bold">{p.place}</span>
        <ul className="grid gap-2 sm:grid-cols-2">
          {LOCALITIES.map((l) => (
            <li key={l.id} className="flex items-center gap-2"><Box /> {t.localities[l.id]}</li>
          ))}
        </ul>
      </div>
      <div className="grid gap-2">
        <span className="font-bold">{p.topics}</span>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="flex items-center gap-2"><Box /> {t.categories[c.id].label}</li>
          ))}
        </ul>
      </div>
      <p className="flex flex-wrap items-center gap-4">
        <span className="font-bold">{p.language}</span>
        <span className="flex items-center gap-2"><Box /> English</span>
        <span className="flex items-center gap-2"><Box /> Español</span>
      </p>
      <div className="grid gap-3">
        <span className="text-xl font-bold">{t.updates.howLegend}</span>
        {CHANNELS.map((c) => (
          <div key={c} className="flex items-start gap-3">
            <Box />
            <p>
              <strong>{labels[c]}.</strong> {consentText(c, cfg.senderName, t.locale).replace(/above/g, "on this form").replace(/de arriba/g, "de este formulario")}
            </p>
          </div>
        ))}
        <div className="flex items-start gap-3">
          <Box />
          <p>{t.locale === "es" ? t.updates.permission : PERMISSION_TEXT}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Line label={p.signature} />
        <Line label={p.date} />
      </div>
      <div className="rounded-lg border-2 border-ink p-3">
        <p className="font-bold">{p.returnTo}</p>
        {cfg.returnAddress ? (
          <address className="not-italic">
            {cfg.returnAddress.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </address>
        ) : (
          <p>{p.returnFallback}</p>
        )}
      </div>
      <p className="text-base">{t.updates.privacy}</p>
      <div className="mt-2 border-t-2 border-dashed border-ink pt-2 text-base">
        <Line label={p.office} />
      </div>
    </div>
  );
}
