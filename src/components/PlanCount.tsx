"use client";
import { usePlan } from "@/lib/usePlan";

export function PlanCount() {
  const { plan, ready } = usePlan();
  if (!ready || plan.items.length === 0) return null;
  return (
    <span className="rounded-full bg-brand px-2 text-base text-white" aria-label={`${plan.items.length} saved`}>
      {plan.items.length}
    </span>
  );
}
