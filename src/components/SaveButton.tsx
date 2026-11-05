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
      aria-label={saved ? t.card.removeLabel(name) : t.card.saveLabel(name)}
      onClick={() => (saved ? remove(id) : add(id))}
    >
      {saved ? t.card.saved : t.card.save}
    </button>
  );
}
