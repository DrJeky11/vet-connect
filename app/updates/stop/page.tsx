import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StopForm } from "./StopForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).stop.title };
}

export default async function StopPage() {
  const t = await getDict();
  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ href: "/", label: t.nav.home }, { href: "/updates", label: t.nav.updates }, { label: t.stop.title }]} />
      <h1 className="text-3xl font-bold">{t.stop.title}</h1>
      <p className="text-xl">{t.stop.lead}</p>
      <StopForm />
      <p>{t.stop.textStop}</p>
    </div>
  );
}
