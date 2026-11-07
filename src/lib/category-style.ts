import type { CategoryId } from "./schema";

/**
 * Visual identity for each topic: an emoji and an accent color, used on the
 * home tiles, intake choices and card chips. Accents all pass 4.5:1 with white
 * text. Red is left out on purpose: it is reserved for the crisis line.
 */
export const CATEGORY_STYLE: Record<CategoryId, { emoji: string; accent: string; ring: string }> = {
  transportation: { emoji: "🚗", accent: "bg-blue-700", ring: "border-t-blue-700" },
  legal: { emoji: "⚖️", accent: "bg-slate-700", ring: "border-t-slate-700" },
  health: { emoji: "🦷", accent: "bg-teal-700", ring: "border-t-teal-700" },
  mental_health: { emoji: "🧠", accent: "bg-indigo-700", ring: "border-t-indigo-700" },
  housing: { emoji: "🏠", accent: "bg-emerald-700", ring: "border-t-emerald-700" },
  food: { emoji: "🥫", accent: "bg-amber-800", ring: "border-t-amber-800" },
  benefits: { emoji: "📜", accent: "bg-sky-800", ring: "border-t-sky-800" },
  employment: { emoji: "💼", accent: "bg-purple-800", ring: "border-t-purple-800" },
  public_services: { emoji: "🤝", accent: "bg-stone-700", ring: "border-t-stone-700" },
};

export function categoryStyle(id: string) {
  return CATEGORY_STYLE[id as CategoryId] ?? { emoji: "•", accent: "bg-slate-700", ring: "border-t-slate-700" };
}
