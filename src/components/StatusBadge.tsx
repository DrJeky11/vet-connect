import type { Status } from "@/lib/schema";
import { STATUS_HELP, STATUS_LABELS } from "@/lib/status";

const STYLES: Record<Status, string> = {
  verified: "bg-ok-bg text-ok border-ok",
  unverified: "bg-warn-bg text-warn border-warn",
  stale: "bg-bad-bg text-bad border-bad",
  archived: "bg-wash text-muted border-line",
};
const ICONS: Record<Status, string> = { verified: "✓", unverified: "?", stale: "!", archived: "×" };

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`badge inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-base font-bold ${STYLES[status]}`}
      title={STATUS_HELP[status]}
      data-testid="status-badge"
    >
      <span aria-hidden="true">{ICONS[status]}</span>
      {STATUS_LABELS[status]}
      <span className="sr-only">: {STATUS_HELP[status]}</span>
    </span>
  );
}
