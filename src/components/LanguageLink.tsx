"use client";
import { usePathname, useRouter } from "next/navigation";
import { useDict } from "@/lib/i18n/client";
import { LOCALE_COOKIE } from "@/lib/i18n";

/**
 * Switch between English and Spanish. Works without JavaScript through
 * /lang; with JavaScript it keeps the current page and filters.
 */
export function LanguageLink({ className = "" }: { className?: string }) {
  const t = useDict();
  const router = useRouter();
  const pathname = usePathname();
  const to = t.otherLanguage.code;
  return (
    <a
      href={`/lang?to=${to}&next=${encodeURIComponent(pathname || "/")}`}
      hrefLang={to}
      lang={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        document.cookie = `${LOCALE_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      <span aria-hidden="true">🌐 </span>
      {t.otherLanguage.label}
    </a>
  );
}
