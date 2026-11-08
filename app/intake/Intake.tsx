"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, LOCALITIES, resolveLocality, type CategoryId, type LocalityId } from "@/lib/schema";
import { filtersToParams } from "@/lib/filter";
import { usePlan } from "@/lib/usePlan";
import { useDict } from "@/lib/i18n/client";
import { CATEGORY_STYLE } from "@/lib/category-style";

const STEPS = ["need", "where", "who", "filters"] as const;

export function Intake() {
  const router = useRouter();
  const params = useSearchParams();
  const { setLocality, setForSomeone } = usePlan();
  const t = useDict();
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
      setZipError(t.intake.zipError);
      return;
    }
    setZipError(null);
    setLoc(loc);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="text-muted" aria-live="polite">
          {t.intake.stepOf(step + 1, STEPS.length)}
        </p>
        <div className="flex gap-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
      </div>
      <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold outline-none">
        {t.intake.steps[current]}
      </h1>

      {current === "need" && (
        <fieldset className="grid gap-3">
          <legend className="sr-only">{t.intake.chooseTopic}</legend>
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
              <span aria-hidden="true" className="text-3xl">
                {CATEGORY_STYLE[c.id].emoji}
              </span>
              <span>
                <span className="block text-lg font-bold">{t.categories[c.id].label}</span>
                <span className="block text-base text-muted">{t.categories[c.id].hint}</span>
              </span>
            </button>
          ))}
        </fieldset>
      )}

      {current === "where" && (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="zip" className="font-bold">
              {t.intake.zipLabel}
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
                {t.intake.useZip}
              </button>
            </div>
            {zipError && (
              <p id="zip-error" role="alert" className="text-bad">
                {zipError}
              </p>
            )}
            <p className="text-base text-muted">{t.intake.zipNote}</p>
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-2 font-bold">{t.intake.pickPlace}</legend>
            {LOCALITIES.map((l) => (
              <button key={l.id} type="button" className="choice" aria-pressed={locality === l.id} onClick={() => setLoc(l.id)}>
                <span className="text-lg font-bold">{t.localities[l.id]}</span>
              </button>
            ))}
          </fieldset>
        </div>
      )}

      {current === "who" && (
        <fieldset className="grid gap-3">
          <legend className="sr-only">{t.intake.steps.who}</legend>
          <button type="button" className="choice" aria-pressed={forSomeone === false} onClick={() => { setFor(false); setStep(3); }}>
            <span className="text-lg font-bold">{t.intake.forMe}</span>
          </button>
          <button type="button" className="choice" aria-pressed={forSomeone === true} onClick={() => { setFor(true); setStep(3); }}>
            <span>
              <span className="block text-lg font-bold">{t.intake.forSomeone}</span>
              <span className="block text-base text-muted">{t.intake.forSomeoneHint}</span>
            </span>
          </button>
          <p className="text-base text-muted">{t.intake.whoNote}</p>
        </fieldset>
      )}

      {current === "filters" && (
        <fieldset className="grid gap-3">
          <legend className="mb-2">{t.intake.filtersLegend}</legend>
          <label className="choice">
            <input type="checkbox" className="h-6 w-6" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
            <span className="text-lg">{t.intake.freeOnly}</span>
          </label>
          <label className="choice">
            <input type="checkbox" className="h-6 w-6" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} />
            <span className="text-lg">{t.intake.wheelchair}</span>
          </label>
          <label className="choice">
            <input type="checkbox" className="h-6 w-6" checked={spanish} onChange={(e) => setSpanish(e.target.checked)} />
            <span className="text-lg">{t.intake.spanish}</span>
          </label>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
        <button type="button" className="btn btn-secondary" onClick={back}>
          {t.intake.back}
        </button>
        {current !== "need" && (
          <button type="button" className="btn btn-primary" onClick={next}>
            {step === STEPS.length - 1 ? t.intake.show : t.intake.next}
          </button>
        )}
        <button type="button" className="btn btn-secondary !border-transparent" onClick={step === STEPS.length - 1 ? finish : () => setStep(step + 1)}>
          {t.intake.skip}
        </button>
      </div>
    </div>
  );
}
