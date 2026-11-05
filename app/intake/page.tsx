import type { Metadata } from "next";
import { Suspense } from "react";
import { Intake } from "./Intake";

export const metadata: Metadata = { title: "What do you need help with?" };

export default function IntakePage() {
  return (
    <Suspense>
      <Intake />
    </Suspense>
  );
}
