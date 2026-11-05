"use client";
import { usePlan } from "@/lib/usePlan";

export function SaveButton({ id, name }: { id: string; name: string }) {
  const { has, add, remove, ready } = usePlan();
  const saved = ready && has(id);
  return (
    <button
      type="button"
      className={`btn ${saved ? "btn-primary" : "btn-secondary"} no-print`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from My Plan` : `Save ${name} to My Plan`}
      onClick={() => (saved ? remove(id) : add(id))}
    >
      {saved ? "✓ Saved to My Plan" : "+ Save to My Plan"}
    </button>
  );
}
