import Link from "next/link";

/** "Home › Topics › Food". The last item is the current page. */
export function Breadcrumbs({ items, label = "Breadcrumb" }: { items: { href?: string; label: string }[]; label?: string }) {
  return (
    <nav aria-label={label} className="no-print">
      <ol className="flex flex-wrap items-center gap-x-2 text-base">
        {items.map((i, n) => (
          <li key={n} className="flex items-center gap-2">
            {n > 0 && <span aria-hidden="true" className="text-muted">›</span>}
            {i.href && n < items.length - 1 ? (
              <Link href={i.href} className="inline-flex min-h-[44px] items-center">{i.label}</Link>
            ) : (
              <span aria-current="page" className="font-bold">{i.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
