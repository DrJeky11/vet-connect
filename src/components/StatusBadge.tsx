"use client";
import type { Status } from "@/lib/schema";
import { useDict } from "@/lib/i18n/client";

const STYLES: Record<Status, string> = {
  verified: "bg-ok-bg text-ok border-ok",
  unverified: "bg-warn-bg text-warn border-warn",
  stale: "bg-bad-bg text-bad border-bad",
  archived: "bg-wash text-muted border-line",
};
const ICONS: Record<Status, string> = { verified: "✓", unverified: "?", stale: "!", archived: "×" };

export function StatusBadge({ status }: { status: Status }) {
  const t = useDict();
  return (
    <span
      className={`badge inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-base font-bold ${STYLES[status]}`}
      title={t.status.help[status]}
      data-testid="status-badge"
    >
      <span aria-hidden="true">{ICONS[status]}</span>
      {t.status.labels[status]}
      <span className="sr-only">: {t.status.help[status]}</span>
    </span>
  );
}
