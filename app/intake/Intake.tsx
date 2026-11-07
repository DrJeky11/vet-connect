"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, LOCALITIES, resolveLocality, type CategoryId, type LocalityId } from "@/lib/schema";
import { filtersToParams } from "@/lib/filter";
import { usePlan } from "@/lib/usePlan";
import { CATEGORY_STYLE } from "@/lib/category-style";

const STEPS = ["need", "where", "who", "filters"] as const;
type Step = (typeof STEPS)[number];
const TITLES: Record<Step, string> = {
  need: "What do you need help with?",
  where: "Where does the veteran live?",
  who: "Who is this for?",
  filters: "Anything else that matters?",
};

export function Intake() {
  const router = useRouter();
  const params = useSearchParams();
  const { setLocality, setForSomeone } = usePlan();
  const initialCategory = (params.get("category") as CategoryId) || null;

  const [step, setStep] = useState<number>(initialCategory ? 1 : 0);
  const [category, setCategory] = useState<CategoryId | null>(initialCategory);
  const [locality, setLoc] = useState<LocalityId | null>(null);
  const [zip, setZip] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [forSomeone, setFor] = useState<boolean | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [wheelchair, setWheelchair] = useState(false);
  const [spanish, setSpanish] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const current = STEPS[step];
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());
  const back = () => (step > 0 ? setStep(step - 1) : router.push("/"));

  function finish() {
    setLocality(locality);
    if (forSomeone !== null) setForSomeone(forSomeone);
    const p = filtersToParams({
      category,
      locality,
      freeOnly,
      accessibility: wheelchair ? "wheelchair" : null,
      language: spanish ? "Spanish" : null,
    });
    router.push(`/resources?${p.toString()}`);
  }

  function applyZip() {
    const loc = resolveLocality(zip);
    if (!loc) {
      setZipError("We could not match that ZIP or place. Pick your city or county below.");
      return;
    }
    setZipError(null);
    setLoc(loc);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div className="grid gap-2">
        <p className="text-muted" aria-live="polite">
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="flex gap-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
      </div>
      <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold outline-none">
        {TITLES[current]}
      </h1>

      {current === "need" && (
        <fieldset className="grid gap-3">
          <legend className="sr-only">Choose one topic</legend>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="choice"
              aria-pressed={category === c.id}
              onClick={() => {
                setCategory(c.id);
                setStep(1);
              }}
            >
              <span className="text-3xl" aria-hidden="true">
                {CATEGORY_STYLE[c.id].emoji}
              </span>
              <span>
                <span className="block text-lg font-bold">{c.label}</span>
                <span className="block text-base text-muted">{c.hint}</span>
              </span>
            </button>
          ))}
        </fieldset>
      )}

      {current === "where" && (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="zip" className="font-bold">
              ZIP code (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="zip"
                className="field max-w-[12rem]"
                inputMode="numeric"
                autoComplete="off"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyZip()}
                aria-describedby={zipError ? "zip-error" : undefined}
              />
              <button type="button" className="btn btn-secondary" onClick={applyZip}>
                Use ZIP
              </button>
            </div>
            {zipError && (
              <p id="zip-error" role="alert" className="text-bad">
                {zipError}
              </p>
            )}
            <p className="text-base text-muted">Some ZIP codes cross county lines. Check the choice below.</p>
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-2 font-bold">Or pick a city or county</legend>
            {LOCALITIES.map((l) => (
              <button key={l.id} type="button" className="choice" aria-pressed={locality === l.id} onClick={() => setLoc(l.id)}>
                <span className="text-lg font-bold">{l.label}</span>
              </button>
            ))}
          </fieldset>
        </div>
      )}

      {current === "who" && (
        <fieldset className="grid gap-3">
          <legend className="sr-only">Who is this for?</legend>
          <button type="button" className="choice" aria-pressed={forSomeone === false} onClick={() => { setFor(false); setStep(3); }}>
            <span className="text-lg font-bold">For me — I am a veteran</span>
          </button>
          <button type="button" className="choice" aria-pressed={forSomeone === true} onClick={() => { setFor(true); setStep(3); }}>
            <span>
              <span className="block text-lg font-bold">For someone else</span>
              <span className="block text-base text-muted">A spouse, parent, friend or client</span>
            </span>
          </button>
          <p className="text-base text-muted">We use this only to word your call script. It is not saved anywhere but this device.</p>
        </fieldset>
      )}

      {current === "filters" && (
        <fieldset className="grid gap-3">
          <legend className="mb-2">Check any that apply. You can skip this.</legend>
          <label className="choice">
            <input type="checkbox" className="h-6 w-6" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
            <span className="text-lg">Free only</span>
          </label>
          <label className="choice">
            <input type="checkbox" className="h-6 w-6" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} />
            <span className="text-lg">Wheelchair accessible</span>
          </label>
          <label className="choice">
            <input type="checkbox" className="h-6 w-6" checked={spanish} onChange={(e) => setSpanish(e.target.checked)} />
            <span className="text-lg">Spanish spoken</span>
          </label>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
        <button type="button" className="btn btn-secondary" onClick={back}>
          ← Back
        </button>
        {current !== "need" && (
          <button type="button" className="btn btn-primary" onClick={next}>
            {step === STEPS.length - 1 ? "Show results" : "Next"}
          </button>
        )}
        <button type="button" className="btn btn-secondary !border-transparent" onClick={step === STEPS.length - 1 ? finish : () => setStep(step + 1)}>
          Skip
        </button>
      </div>
    </div>
  );
}
