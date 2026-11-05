import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { Suspense } from "react";
import { Intake } from "./Intake";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.intake.steps.need };
}

export default function IntakePage() {
  return (
    <Suspense>
      <Intake />
    </Suspense>
  );
}
