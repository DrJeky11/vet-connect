import { categoryLabel } from "@/lib/schema";
import { categoryStyle } from "@/lib/category-style";

export function CategoryChip({ id }: { id: string }) {
  const s = categoryStyle(id);
  return (
    <span className={`chip chip-solid inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-bold text-white ${s.accent}`}>
      <span aria-hidden="true">{s.emoji}</span>
      {categoryLabel(id)}
    </span>
  );
}
