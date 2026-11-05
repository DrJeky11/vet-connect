import Link from "next/link";
import { CATEGORIES } from "@/lib/schema";
import { chatEnabled } from "@/lib/navigator-llm";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="grid gap-8">
      <section aria-labelledby="hero" className="grid gap-4">
        <h1 id="hero" className="text-3xl font-bold leading-tight">
          Find help for veterans near Fredericksburg
        </h1>
        <p className="text-xl">
          Rides, legal help, dental care, food, benefits and more in Fredericksburg, Spotsylvania, Stafford, King George
          and Caroline. Every listing shows where it came from.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/intake" className="btn btn-primary text-xl !min-h-[56px] !px-6">
            Start: What do you need help with?
          </Link>
          <Link href="/resources" className="btn btn-secondary !min-h-[56px]">
            Browse all listings
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
        <h2 id="cats" className="mb-3 text-2xl font-bold">
          Or pick a topic
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={`/intake?category=${c.id}`} className="choice no-underline text-ink">
                <span>
                  <span className="block text-lg font-bold">{c.label}</span>
                  <span className="block text-base text-muted">{c.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trust" className="rounded-xl bg-wash p-4">
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
