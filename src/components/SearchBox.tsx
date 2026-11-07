/**
 * Big plain-language search box. A plain GET form to the directory, so it works
 * without JavaScript and the query lands in the URL like every other filter.
 */
export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form role="search" action="/resources" method="get" className="relative">
      <label htmlFor="home-q" className="sr-only">
        Search veteran services
      </label>
      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
        🔍
      </span>
      <input
        id="home-q"
        name="q"
        type="search"
        inputMode="search"
        autoComplete="off"
        defaultValue={defaultValue}
        placeholder="ride, dentist, rent help…"
        className="field search-field !min-h-[64px] !rounded-xl !pl-14 !pr-28 text-xl shadow-sm"
      />
      <button type="submit" className="btn btn-primary absolute right-2 top-1/2 -translate-y-1/2">
        Search
      </button>
    </form>
  );
}
