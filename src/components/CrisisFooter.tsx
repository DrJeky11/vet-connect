export function CrisisFooter() {
  return (
    <footer
      className="crisis sticky bottom-0 z-40 bg-crisis text-white print:static print:border-t-4 print:border-black print:bg-white print:text-black"
      aria-label="Veterans Crisis Line"
      data-testid="crisis-footer"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <p className="w-full text-sm font-bold sm:w-auto sm:text-base">
          Veterans Crisis Line <span className="font-normal">· free, confidential, 24/7</span>
        </p>
        <div className="flex flex-1 gap-2 sm:flex-none">
          <a
            className="btn flex-1 !min-h-[44px] !border-white !bg-white !px-3 !py-1 text-base font-extrabold whitespace-nowrap !text-crisis sm:flex-none"
            href="tel:988"
          >
            Dial 988, then press 1
          </a>
          <a
            className="btn flex-none !min-h-[44px] !border-white !bg-transparent !px-3 !py-1 text-base whitespace-nowrap !text-white sm:flex-none"
            href="sms:838255"
          >
            Text 838255
          </a>
        </div>
      </div>
    </footer>
  );
}
