import type { CategoryId } from "./schema";

/**
 * Visual identity for each topic, from the GF-VRN prototype: an emoji and an
 * accent color, used on home tiles, intake choices, directory chips and card
 * chips. Accents all pass 4.5:1 with white text. Red is left out on purpose:
 * it is reserved for the crisis line.
 */
export const CATEGORY_STYLE: Record<CategoryId, { emoji: string; accent: string; topBorder: string }> = {
  transportation: { emoji: "🚐", accent: "bg-blue-700", topBorder: "border-t-blue-700" },
  legal: { emoji: "⚖️", accent: "bg-slate-700", topBorder: "border-t-slate-700" },
  health: { emoji: "🩺", accent: "bg-teal-700", topBorder: "border-t-teal-700" },
  mental_health: { emoji: "💬", accent: "bg-indigo-700", topBorder: "border-t-indigo-700" },
  housing: { emoji: "🏠", accent: "bg-emerald-700", topBorder: "border-t-emerald-700" },
  food: { emoji: "🍎", accent: "bg-amber-800", topBorder: "border-t-amber-800" },
  benefits: { emoji: "📄", accent: "bg-sky-800", topBorder: "border-t-sky-800" },
  employment: { emoji: "💼", accent: "bg-purple-800", topBorder: "border-t-purple-800" },
  public_services: { emoji: "🏛️", accent: "bg-stone-700", topBorder: "border-t-stone-700" },
};
