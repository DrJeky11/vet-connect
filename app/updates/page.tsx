import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_IDS, type CategoryId } from "@/lib/schema";
import { getDict } from "@/lib/i18n/server";
import { readConfig } from "@/lib/outreach/config";
import { CHANNELS, CHANNEL_LABELS, CHANNEL_LABELS_ES, consentText } from "@/lib/outreach/rules";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.updates.title, description: t.updates.lead };
}

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const t = await getDict();
  const cfg = readConfig();
  const topic = (await searchParams).topic;
  const preset = (CATEGORY_IDS as string[]).includes(topic ?? "") ? [topic as CategoryId] : [];
  const labels = t.locale === "es" ? CHANNEL_LABELS_ES : CHANNEL_LABELS;
  const channels = CHANNELS.map((c) => ({ id: c, label: labels[c], consent: consentText(c, cfg.senderName, t.locale) }));
  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ href: "/", label: t.nav.home }, { label: t.nav.updates }]} />
      <h1 className="text-3xl font-bold">{t.updates.title}</h1>
      <p className="text-xl">{t.updates.lead}</p>
      {!cfg.live && (
        <p className="rounded-xl border-2 border-warn bg-warn-bg p-3 font-bold text-warn" role="note">
          {t.updates.demoNote}
        </p>
      )}
      {cfg.lineNumber && <p className="font-bold">{t.updates.orCall(cfg.lineNumber)}</p>}
      <SignupForm channels={channels} presetTopics={preset} />
      <p className="text-base text-muted">{t.updates.privacy}</p>
      <p className="flex flex-wrap gap-x-4">
        <Link href="/updates/stop" className="inline-flex min-h-[44px] items-center">{t.updates.stopLink}</Link>
        <Link href="/updates/paper-form" className="inline-flex min-h-[44px] items-center">{t.updates.paperLink}</Link>
      </p>
    </div>
  );
}
