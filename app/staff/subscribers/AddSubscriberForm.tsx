"use client";
import { useActionState } from "react";
import { CATEGORIES, LOCALITIES } from "@/lib/schema";
import type { Channel } from "@/lib/outreach/rules";
import { addSubscriber, type FormState } from "../actions";
import { valueReader } from "@/lib/form-values";

export function AddSubscriberForm({ consents }: { consents: { id: Channel; label: string; text: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addSubscriber, null);
  const v = valueReader(state?.values);
  return (
    <form action={action} className="grid gap-4" data-testid="add-subscriber" key={v.key}>
      {state?.error && <p role="alert" className="font-bold text-bad">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-lg bg-ok-bg p-2 font-bold">{state.ok}</p>}
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 font-bold">How did they ask?</legend>
        <label className="choice !w-auto"><input type="radio" name="method" value="verbal_phone" defaultChecked={!v.has("method", "paper_form")} className="h-6 w-6" /> By phone or in person</label>
        <label className="choice !w-auto"><input type="radio" name="method" value="paper_form" defaultChecked={v.has("method", "paper_form")} className="h-6 w-6" /> Paper form</label>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-bold">Ways they agreed to</legend>
        {consents.map((c) => (
          <label key={c.id} className="choice !items-start">
            <input type="checkbox" name="channel" value={c.id} className="mt-1 h-6 w-6 shrink-0" defaultChecked={v.has("channel", c.id)} />
            <span>
              <span className="block font-bold">{c.label}</span>
              <span className="block text-base">Read aloud: “{c.text}”</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="as-phone" className="font-bold">Phone (texts or calls)</label>
          <input id="as-phone" name="phone" type="tel" className="field" autoComplete="off" defaultValue={v.one("phone")} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="as-name" className="font-bold">Name (letters only)</label>
          <input id="as-name" name="name" className="field" autoComplete="off" defaultValue={v.one("name")} />
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <label htmlFor="as-line1" className="font-bold">Street address (letters only)</label>
          <input id="as-line1" name="line1" className="field" autoComplete="off" defaultValue={v.one("line1")} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="as-line2" className="font-bold">Apt / unit</label>
          <input id="as-line2" name="line2" className="field" autoComplete="off" defaultValue={v.one("line2")} />
        </div>
        <div className="grid grid-cols-[1fr_5rem_7rem] gap-2">
          <div className="grid gap-1">
            <label htmlFor="as-city" className="font-bold">City</label>
            <input id="as-city" name="city" className="field" autoComplete="off" defaultValue={v.one("city")} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="as-state" className="font-bold">State</label>
            <input id="as-state" name="state" className="field" defaultValue={v.one("state", "VA")} maxLength={2} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="as-zip" className="font-bold">ZIP</label>
            <input id="as-zip" name="zip" className="field" inputMode="numeric" defaultValue={v.one("zip")} />
          </div>
        </div>
        <div className="grid gap-1">
          <label htmlFor="as-locality" className="font-bold">Where they live</label>
          <select id="as-locality" name="locality" className="field" defaultValue={v.one("locality")}>
            <option value="">Not given</option>
            {LOCALITIES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="as-language" className="font-bold">Language</label>
          <select id="as-language" name="language" className="field" defaultValue={v.one("language", "en")}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-1 font-bold">Topics (none = everything)</legend>
        {CATEGORIES.map((c) => (
          <label key={c.id} className="flex min-h-[44px] items-center gap-2">
            <input type="checkbox" name="topic" value={c.id} className="h-6 w-6" defaultChecked={v.has("topic", c.id)} /> {c.label}
          </label>
        ))}
      </fieldset>
      <label className="choice">
        <input type="checkbox" name="confirmed" value="yes" className="h-6 w-6 shrink-0" />
        <span>I read the wording above to the person (or it is on their signed form) and they agreed to each way I checked.</span>
      </label>
      <p><button className="btn btn-primary" disabled={pending}>Save subscriber</button></p>
    </form>
  );
}
