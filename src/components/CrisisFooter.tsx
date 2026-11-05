import { getDict } from "@/lib/i18n/server";

export async function CrisisFooter() {
  const t = await getDict();
  return (
    <footer
      className="sticky bottom-0 z-40 border-t-4 border-crisis bg-white print:static"
      aria-label={t.crisis.title}
      data-testid="crisis-footer"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
        <p className="w-full text-sm font-bold text-crisis sm:w-auto sm:text-base">{t.crisis.title}</p>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <a className="btn min-w-0 flex-[2_1_auto] !min-h-[44px] !border-crisis !bg-crisis !px-2 !py-1 text-center text-base leading-tight text-white sm:flex-none sm:!px-3" href="tel:988">
            {t.crisis.dial}
          </a>
          <a className="btn min-w-0 flex-[1_1_auto] !min-h-[44px] !border-crisis bg-white !px-2 !py-1 text-center text-base leading-tight text-crisis sm:flex-none sm:!px-3" href="sms:838255">
            {t.crisis.text}
          </a>
        </div>
      </div>
    </footer>
  );
}
