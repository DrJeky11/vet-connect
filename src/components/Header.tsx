import Link from "next/link";
import { ContrastToggle } from "./ContrastToggle";
import { PlanCount } from "./PlanCount";

export function Header() {
  return (
    <header className="no-print border-b border-line bg-white">
      <a href="#main" className="sr-only-focusable btn btn-primary absolute left-2 top-2 z-50">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="text-xl font-bold text-ink no-underline">
          Veteran Services Navigator
          <span className="block text-sm font-normal text-muted">Fredericksburg region</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          <Link href="/resources" className="btn btn-secondary !border-transparent">
            Directory
          </Link>
          <Link href="/plan" className="btn btn-secondary !border-transparent">
            My Plan <PlanCount />
          </Link>
          <ContrastToggle />
        </nav>
      </div>
    </header>
  );
}
