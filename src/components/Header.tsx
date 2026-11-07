import Link from "next/link";
import { ContrastToggle } from "./ContrastToggle";
import { PlanCount } from "./PlanCount";

export function Header() {
  return (
    <header className="no-print border-b-2 border-line border-t-4 border-t-brand bg-white">
      <a href="#main" className="sr-only-focusable btn btn-primary absolute left-2 top-2 z-50">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-2 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-ink no-underline">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-lg font-extrabold text-white"
          >
            ★
          </span>
          <span>
            Veteran Services Navigator
            <span className="block text-sm font-normal text-muted">Greater Fredericksburg region</span>
          </span>
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
