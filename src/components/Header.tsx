import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { DisplaySettings } from "./DisplaySettings";
import { LanguageLink } from "./LanguageLink";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { PlanCount } from "./PlanCount";

export async function Header() {
  const t = await getDict();
  const items = [
    { href: "/intake", label: t.nav.findHelp },
    { href: "/topics", label: t.nav.topics },
    { href: "/resources", label: t.nav.directory },
    { href: "/updates", label: t.nav.updates },
    { href: "/help", label: t.nav.help },
  ];
  const mobileItems = [{ href: "/", label: t.nav.home }, ...items, { href: "/plan", label: t.nav.plan }, { href: "/print", label: t.nav.print }];
  // My Plan sits in the top bar on every screen size, so it is never more than one tap away.
  return (
    <header className="no-print relative border-b border-line bg-white">
      <a href="#main" className="sr-only-focusable btn btn-primary absolute left-2 top-2 z-50">
        {t.skip}
      </a>
      <div className="border-b border-line bg-wash">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1">
          <Link href="/plan" className="btn btn-secondary !min-h-[44px] !border-transparent !bg-transparent !px-2 whitespace-nowrap">
            <span aria-hidden="true">📋</span> {t.nav.plan} <PlanCount />
          </Link>
          <div className="flex flex-wrap items-center gap-x-4">
            <DisplaySettings className="hidden md:flex" />
            <LanguageLink className="btn btn-secondary !min-h-[44px] !border-transparent !bg-transparent !px-2 whitespace-nowrap" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between gap-3 py-2">
          <Link href="/" className="min-w-0 text-lg font-bold leading-tight text-ink no-underline sm:text-xl">
            {t.brand}
            <span className="block text-sm font-normal text-muted">{t.region}</span>
          </Link>
          <MobileMenu items={mobileItems} />
        </div>
        <NavLinks items={items} label={t.nav.label} />
      </div>
    </header>
  );
}
