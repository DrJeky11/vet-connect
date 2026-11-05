import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { Suspense } from "react";
import { getPublicResources } from "@/lib/data";
import { Directory } from "./Directory";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.nav.directory };
}
export const dynamic = "force-dynamic";

export default function ResourcesPage() {
  const resources = getPublicResources();
  return (
    <Suspense>
      <Directory resources={resources} now={new Date().toISOString()} />
    </Suspense>
  );
}
