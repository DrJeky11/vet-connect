"use client";
import { useActionState, useEffect, useRef } from "react";
import { CATEGORIES, LOCALITIES, type CategoryId } from "@/lib/schema";
import type { Channel } from "@/lib/outreach/rules";
import { useDict } from "@/lib/i18n/client";
import { signup, type SignupState } from "./actions";

export function SignupForm({
  channels,
  presetTopics,
}: {
  channels: { id: Channel; label: string; consent: string }[];
  presetTopics: CategoryId[];
}) {
  const t = useDict();
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, { status: "idle" });
  const errRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "error") errRef.current?.focus();
    if (state.status === "done") doneRef.current?.focus();
  }, [state]);

  if (state.status === "done") {
    return (
      <div ref={doneRef} tabIndex={-1} className="grid gap-2 rounded-xl border-2 border-ok bg-ok-bg p-4 outline-none" role="status" data-testid="signup-done">
        <h2 className="text-2xl font-bold text-ok">✓ {t.updates.successTitle}</h2>
        {state.needsSmsConfirm && <p className="font-bold">{t.updates.successSms}</p>}
        {state.channels.includes("voice") && <p>{t.updates.successVoice}</p>}
        {state.channels.includes("mail") && <p>{t.updates.successMail}</p>}
        {state.simulated && <p className="text-base">{t.updates.successSimulated}</p>}
        <p>
          <a href="/updates" className="btn btn-secondary">{t.updates.another}</a>
        </p>
      </div>
    );
  }

  const v = state.status === "error" ? state.values : {};
  const has = (k: string, x: string) => Array.isArray(v[k]) && (v[k] as string[]).includes(x);
  const val = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : "");
  const formKey = state.status === "error" ? JSON.stringify(v) : "fresh";

  return (
    <form action={action} className="grid gap-6" key={formKey} noValidate>
      {state.status === "error" && (
        <div ref={errRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-bad bg-bad-bg p-3 outline-none">
          <p className="font-bold text-bad">{t.updates.fixBelow}</p>
          <p>{state.message}</p>
        </div>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xl font-bold">{t.updates.topicsLegend}</legend>
        <p className="text-base text-muted">{t.updates.topicsHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label key={c.id} className="choice !min-h-[48px]">
              <input type="checkbox" name="topic" value={c.id} className="h-6 w-6" defaultChecked={has("topic", c.id) || presetTopics.includes(c.id)} />
              <span>{t.categories[c.id].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="su-locality" className="font-bold">{t.updates.placeLabel}</label>
          <select id="su-locality" name="locality" className="field" defaultValue={val("locality")}>
            <option value="">{t.updates.placeNone}</option>
            {LOCALITIES.map((l) => (
              <option key={l.id} value={l.id}>{t.localities[l.id]}</option>
            ))}
          </select>
        </div>
        <fieldset className="grid gap-1">
          <legend className="font-bold">{t.updates.languageLegend}</legend>
          <div className="flex flex-wrap gap-2">
            {(["en", "es"] as const).map((l) => (
              <label key={l} className="choice !w-auto !min-h-[48px]">
                <input type="radio" name="language" value={l} className="h-6 w-6" defaultChecked={(val("language") || t.locale) === l} />
                <span lang={l}>{l === "en" ? "English" : "Español"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-1">
        <label htmlFor="su-phone" className="text-xl font-bold">{t.updates.phoneLabel}</label>
        <p id="su-phone-hint" className="text-base text-muted">{t.updates.phoneHint}</p>
        <input id="su-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="field max-w-xs" defaultValue={val("phone")} aria-describedby="su-phone-hint" />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-xl font-bold">{t.updates.addressLegend}</legend>
        <div className="grid gap-1">
          <label htmlFor="su-name" className="font-bold">{t.updates.nameLabel}</label>
          <input id="su-name" name="name" autoComplete="name" className="field" defaultValue={val("name")} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="su-line1" className="font-bold">{t.updates.line1}</label>
          <input id="su-line1" name="line1" autoComplete="address-line1" className="field" defaultValue={val("line1")} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="su-line2" className="font-bold">{t.updates.line2}</label>
          <input id="su-line2" name="line2" autoComplete="address-line2" className="field" defaultValue={val("line2")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_6rem_9rem]">
          <div className="grid gap-1">
            <label htmlFor="su-city" className="font-bold">{t.updates.city}</label>
            <input id="su-city" name="city" autoComplete="address-level2" className="field" defaultValue={val("city")} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="su-state" className="font-bold">{t.updates.state}</label>
            <input id="su-state" name="state" autoComplete="address-level1" maxLength={2} className="field" defaultValue={val("state") || "VA"} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="su-zip" className="font-bold">{t.updates.zip}</label>
            <input id="su-zip" name="zip" inputMode="numeric" autoComplete="postal-code" className="field" defaultValue={val("zip")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-xl font-bold">{t.updates.howLegend}</legend>
        {channels.map((c) => (
          <label key={c.id} className="choice !items-start">
            <input type="checkbox" name="channel" value={c.id} className="mt-1 h-6 w-6 shrink-0" defaultChecked={has("channel", c.id)} />
            <span>
              <span className="block text-lg font-bold">{c.label}</span>
              <span className="block text-base">{c.consent}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xl font-bold">{t.updates.consentLegend}</legend>
        <label className="choice">
          <input type="checkbox" name="permission" value="yes" className="h-6 w-6 shrink-0" defaultChecked={val("permission") === "yes"} />
          <span>{t.updates.permission}</span>
        </label>
      </fieldset>

      <p>
        <button className="btn btn-primary text-xl !min-h-[56px] !px-8" disabled={pending}>
          {t.updates.submit}
        </button>
      </p>
    </form>
  );
}
