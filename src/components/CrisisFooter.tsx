export function CrisisFooter() {
  return (
    <footer
      className="sticky bottom-0 z-40 border-t-4 border-crisis bg-white print:static"
      aria-label="Veterans Crisis Line"
      data-testid="crisis-footer"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <p className="font-bold text-crisis">In crisis? Veterans Crisis Line:</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-primary !border-crisis !bg-crisis !min-h-[44px] !py-1" href="tel:988">
            Dial 988, then press 1
          </a>
          <a className="btn btn-secondary !border-crisis !text-crisis !min-h-[44px] !py-1" href="sms:838255">
            Text 838255
          </a>
        </div>
      </div>
    </footer>
  );
}
