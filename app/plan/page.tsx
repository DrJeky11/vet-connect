import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicResources } from "@/lib/data";
import { PlanView } from "./PlanView";

export const metadata: Metadata = { title: "My Plan" };
export const dynamic = "force-dynamic";

export default function PlanPage() {
  return (
    <Suspense>
      <PlanView resources={getPublicResources()} />
    </Suspense>
  );
}
