import Link from "next/link";
import { ContrastToggle } from "./ContrastToggle";
import { PlanCount } from "./PlanCount";

export function Header() {
  return (
    <header className="no-print border-b border-line bg-white">
      <a href="#main" className="sr-only-focusable btn btn-primary absolute left-2 top-2 z-50">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-2 px-4 py-1">
        <Link href="/" className="text-xl font-bold text-ink no-underline">
          Veteran Services Navigator
          <span className="block text-sm font-normal text-muted">Fredericksburg region</span>
        </Link>
        <nav aria-label="Main" className="-mx-3 flex flex-wrap items-center">
          <Link href="/resources" className="btn btn-secondary !border-transparent !px-3">
            Directory
          </Link>
          <Link href="/plan" className="btn btn-secondary !border-transparent !px-3">
            My Plan <PlanCount />
          </Link>
          <ContrastToggle />
        </nav>
      </div>
    </header>
  );
}
