"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./MobileMenu";

/** Desktop navigation; marks the current section. */
export function NavLinks({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="hidden md:block">
      <ul className="-mx-3 flex flex-wrap">
        {items.map((i) => {
          const current = pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href + "/"));
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={current ? "page" : undefined}
                className={`btn btn-secondary !border-transparent !px-3 ${current ? "!border-b-brand underline decoration-4 underline-offset-8" : ""}`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
