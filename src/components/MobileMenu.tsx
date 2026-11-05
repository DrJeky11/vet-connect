"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDict } from "@/lib/i18n/client";
import { DisplaySettings } from "./DisplaySettings";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * A labeled "Menu" button for phones. Every link in it is also in the page
 * footer, so the site is still navigable if JavaScript does not load.
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="shrink-0 md:hidden">
      <button
        ref={button}
        type="button"
        className="btn btn-secondary !min-h-[48px] whitespace-nowrap"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true" className="text-xl leading-none">{open ? "×" : "☰"}</span>
        {t.nav.menu}
      </button>
      <div id="mobile-menu" hidden={!open} className="absolute inset-x-0 top-full z-50 border-b-4 border-brand bg-white px-4 pb-4 shadow-lg">
        <nav aria-label={t.nav.label}>
          <ul className="grid gap-2 pt-2">
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="choice !min-h-[52px] text-lg font-bold text-ink no-underline"
                  aria-current={pathname === i.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-4 font-bold">{t.nav.display}</p>
        <DisplaySettings className="mt-2" />
      </div>
    </div>
  );
}
