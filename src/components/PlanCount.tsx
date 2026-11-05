"use client";
import { usePlan } from "@/lib/usePlan";
import { useDict } from "@/lib/i18n/client";

export function PlanCount() {
  const { plan, ready } = usePlan();
  const t = useDict();
  if (!ready || plan.items.length === 0) return null;
  return (
    <span className="rounded-full bg-brand px-2 text-base text-white" aria-label={t.nav.saved(plan.items.length)}>
      {plan.items.length}
    </span>
  );
}
