import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { Suspense } from "react";
import { getPublicResources } from "@/lib/data";
import { PlanView } from "./PlanView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.nav.plan };
}
export const dynamic = "force-dynamic";

export default function PlanPage() {
  return (
    <Suspense>
      <PlanView resources={getPublicResources()} />
    </Suspense>
  );
}
