import { CATEGORY_STYLE } from "@/lib/category-style";
import type { CategoryId } from "@/lib/schema";

export function CategoryChip({ id, label }: { id: CategoryId; label: string }) {
  const s = CATEGORY_STYLE[id];
  return (
    <span className={`chip-solid inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-bold text-white ${s.accent}`}>
      <span aria-hidden="true">{s.emoji}</span>
      {label}
    </span>
  );
}
