export function CrisisFooter() {
  return (
    <footer
      className="sticky bottom-0 z-40 border-t-4 border-crisis bg-white print:static"
      aria-label="Veterans Crisis Line"
      data-testid="crisis-footer"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
        <p className="w-full text-sm font-bold text-crisis sm:w-auto sm:text-base">Veterans Crisis Line</p>
        <div className="flex flex-1 gap-2">
          <a className="btn flex-1 !min-h-[44px] !border-crisis !bg-crisis !px-1 !py-1 text-base whitespace-nowrap text-white sm:flex-none" href="tel:988">
            Dial 988, then press 1
          </a>
          <a className="btn flex-none !min-h-[44px] !border-crisis bg-white !px-3 !py-1 text-base whitespace-nowrap text-crisis sm:flex-none" href="sms:838255">
            Text 838255
          </a>
        </div>
      </div>
    </footer>
  );
}
