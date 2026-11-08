import { getDict } from "@/lib/i18n/server";

export async function CrisisFooter() {
  const t = await getDict();
  return (
    <footer
      className="crisis sticky bottom-0 z-40 bg-crisis text-white print:static print:border-t-4 print:border-black print:bg-white print:text-black"
      aria-label={t.crisis.title}
      data-testid="crisis-footer"
    >
      <div className="mx-auto grid max-w-3xl gap-1 px-4 py-1.5 sm:flex sm:items-center sm:gap-3">
        <p className="text-sm font-bold sm:text-base">{t.crisis.title}</p>
        {/* Two equal-ish columns; text wraps inside a button instead of stacking the buttons. */}
        <div className="grid grid-cols-[3fr_2fr] gap-2 sm:flex">
          <a className="btn !min-h-[44px] !border-white !bg-white !px-2 !py-1 text-center text-base font-extrabold leading-tight !text-crisis sm:!px-3" href="tel:988">
            {t.crisis.dial}
          </a>
          <a className="btn !min-h-[44px] !border-white !bg-transparent !px-2 !py-1 text-center text-base leading-tight !text-white sm:!px-3" href="sms:838255">
            {t.crisis.text}
          </a>
        </div>
      </div>
    </footer>
  );
}
