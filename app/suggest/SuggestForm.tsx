"use client";
import { useActionState } from "react";
import { useDict } from "@/lib/i18n/client";
import { suggest, type SuggestState } from "./actions";
import { valueReader } from "@/lib/form-values";

export function SuggestForm({ listings, preset }: { listings: { id: string; name: string }[]; preset: string }) {
  const t = useDict();
  const s = t.suggest;
  const [state, action, pending] = useActionState<SuggestState, FormData>(suggest, { status: "idle" });
  if (state.status === "done") {
    return (
      <p role="status" className="rounded-xl border-2 border-ok bg-ok-bg p-4 font-bold" data-testid="suggest-done">
        ✓ {s.thanks}
      </p>
    );
  }
  const v = valueReader(state.status === "error" ? state.values : undefined);
  return (
    <form action={action} className="grid gap-5" key={v.key}>
      {state.status === "error" && (
        <p role="alert" className="rounded-xl border-2 border-bad bg-bad-bg p-3 font-bold text-bad">{state.message}</p>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xl font-bold">{s.kindLegend}</legend>
        {(Object.keys(s.kinds) as (keyof typeof s.kinds)[]).map((k) => (
          <label key={k} className="choice !min-h-[48px]">
            <input type="radio" name="kind" value={k} required className="h-6 w-6" defaultChecked={v.any ? v.has("kind", k) : preset ? k === "wrong_info" : false} />
            <span>{s.kinds[k]}</span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1">
        <label htmlFor="sg-listing" className="font-bold">{s.listing}</label>
        <select id="sg-listing" name="listing" className="field" defaultValue={v.any ? v.one("listing") : preset}>
          <option value="">{s.listingNone}</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label htmlFor="sg-details" className="font-bold">{s.details}</label>
        <p id="sg-details-hint" className="text-base text-muted">{s.detailsHint} {s.noPersonal}</p>
        <textarea id="sg-details" name="details" rows={4} required maxLength={2000} className="field" aria-describedby="sg-details-hint" defaultValue={v.one("details")} />
      </div>
      <div className="grid gap-1">
        <label htmlFor="sg-url" className="font-bold">{s.sourceUrl}</label>
        <input id="sg-url" name="source_url" type="url" inputMode="url" className="field" placeholder="https://" defaultValue={v.one("source_url")} />
      </div>
      <div className="grid gap-1">
        <label htmlFor="sg-how" className="font-bold">{s.howKnow}</label>
        <p id="sg-how-hint" className="text-base text-muted">{s.howKnowHint}</p>
        <input id="sg-how" name="how_known" maxLength={500} className="field" aria-describedby="sg-how-hint" defaultValue={v.one("how_known")} />
      </div>
      <p>
        <button className="btn btn-primary" disabled={pending}>{s.submit}</button>
      </p>
    </form>
  );
}
