import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicResources } from "@/lib/data";
import { Directory } from "./Directory";

export const metadata: Metadata = { title: "Directory" };
export const dynamic = "force-dynamic";

export default function ResourcesPage() {
  const resources = getPublicResources();
  return (
    <Suspense>
      <Directory resources={resources} now={new Date().toISOString()} />
    </Suspense>
  );
}
