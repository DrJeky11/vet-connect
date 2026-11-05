"use client";
import { usePlan } from "@/lib/usePlan";
import { useDict } from "@/lib/i18n/client";

export function SaveButton({ id, name }: { id: string; name: string }) {
  const { has, add, remove, ready } = usePlan();
  const t = useDict();
  const saved = ready && has(id);
  return (
    <button
      type="button"
      className={`btn ${saved ? "btn-primary" : "btn-secondary"} no-print`}
      aria-pressed={saved}
      onClick={() => (saved ? remove(id) : add(id))}
    >
      {/* The visible words come first in the accessible name, so voice control ("click Save to My Plan") works. */}
      {saved ? t.card.saved : t.card.save}
      <span className="sr-only">: {name}</span>
    </button>
  );
}
