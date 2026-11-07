import Link from "next/link";
import { CATEGORIES } from "@/lib/schema";
import { CATEGORY_STYLE } from "@/lib/category-style";
import { chatEnabled } from "@/lib/navigator-llm";
import { getPublicResources } from "@/lib/data";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default function Home() {
  const resources = getPublicResources();
  const counts = new Map<string, number>();
  for (const r of resources) for (const c of r.categories) counts.set(c, (counts.get(c) ?? 0) + 1);

  return (
    <div className="grid gap-10">
      <section aria-labelledby="hero" className="grid gap-5">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">
          Fredericksburg · Spotsylvania · Stafford · King George · Caroline
        </p>
        <h1 id="hero" className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Find help for veterans near Fredericksburg
        </h1>
        <p className="max-w-2xl text-xl">
          Rides, legal help, dental care, food, housing, benefits and more. No sign-in, no jargon, and every listing
          shows where it came from.
        </p>
        <SearchBox />
        <div className="flex flex-wrap gap-3">
          <Link href="/intake" className="btn btn-primary text-xl !min-h-[56px] !px-6">
            Start: What do you need help with?
          </Link>
          <Link href="/resources" className="btn btn-secondary !min-h-[56px]">
            Browse all {resources.length} listings
          </Link>
          {chatEnabled() && (
            <Link href="/ask" className="btn btn-secondary !min-h-[56px]">
              Ask in your own words
            </Link>
          )}
        </div>
        <p className="text-muted">
          No account. No names. Anything you save stays on this device. Helping someone else? That works too.
        </p>
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-4 text-2xl font-bold">
          Or pick a topic
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const s = CATEGORY_STYLE[c.id];
            const n = counts.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/intake?category=${c.id}`}
                  className={`tile group flex h-full min-h-[8rem] flex-col gap-1 rounded-xl border-2 border-line border-t-8 ${s.ring} bg-white p-4 text-ink no-underline shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <span className="text-4xl" aria-hidden="true">
                    {s.emoji}
                  </span>
                  <span className="text-xl font-bold leading-snug group-hover:underline">{c.label}</span>
                  <span className="text-base text-muted">{c.hint}</span>
                  <span className="mt-auto pt-1 text-sm font-bold text-muted">
                    {n} {n === 1 ? "listing" : "listings"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="trust" className="rounded-xl border-2 border-line bg-wash p-5">
        <h2 id="trust" className="text-xl font-bold">
          How to read a listing
        </h2>
        <ul className="ml-5 mt-2 list-disc">
          <li>
            <strong>Verified</strong> means a person checked it in the last 90 days.
          </li>
          <li>
            <strong>Unverified</strong> means no one has checked it yet. <strong>Stale</strong> means the check is old.
          </li>
          <li>Each provider decides who it serves. This site cannot tell you if you qualify. Call to confirm.</li>
        </ul>
      </section>
    </div>
  );
}
