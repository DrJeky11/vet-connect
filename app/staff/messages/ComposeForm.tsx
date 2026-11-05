"use client";
import { useActionState, useState } from "react";
import { CATEGORIES, LOCALITIES } from "@/lib/schema";
import { CHANNEL_LABELS, CHANNELS, smsSegments, withSmsFooter } from "@/lib/outreach/rules";
import { createMessage, type FormState } from "../actions";
import { valueReader, type FormValues } from "@/lib/form-values";

export function ComposeForm({ sender }: { sender: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createMessage, null);
  return <ComposeFields key={valueReader(state?.values).key} sender={sender} action={action} pending={pending} error={state?.error} values={state?.values} />;
}

function ComposeFields({
  sender,
  action,
  pending,
  error,
  values,
}: {
  sender: string;
  action: (f: FormData) => void;
  pending: boolean;
  error?: string;
  values?: FormValues;
}) {
  const v = valueReader(values);
  const [sms, setSms] = useState(v.one("sms_body"));
  const full = sms ? withSmsFooter(sms, sender) : "";
  const seg = smsSegments(full);
  return (
    <form action={action} className="grid gap-4" data-testid="compose">
      {error && <p role="alert" className="font-bold text-bad">{error}</p>}
      <div className="grid gap-1">
        <label htmlFor="m-title" className="font-bold">Title (staff only)</label>
        <input id="m-title" name="title" className="field" required defaultValue={v.one("title")} />
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 font-bold">Send by</legend>
        {CHANNELS.map((c) => (
          <label key={c} className="choice !w-auto">
            <input type="checkbox" name="channel" value={c} className="h-6 w-6" defaultChecked={v.has("channel", c)} /> {CHANNEL_LABELS[c]}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1">
        <label htmlFor="m-sms" className="font-bold">Text message</label>
        <textarea id="m-sms" name="sms_body" rows={3} maxLength={480} className="field" value={sms} onChange={(e) => setSms(e.target.value)} aria-describedby="m-sms-count" />
        <p id="m-sms-count" className="text-base text-muted" aria-live="polite">
          {full ? <>Sends as: “{full}” · {seg.length} characters, {seg.segments} text(s){seg.encoding === "UCS-2" ? " (special characters use more texts)" : ""}</> : "Your sender name and “Reply STOP to opt out.” are added for you."}
        </p>
      </div>
      <div className="grid gap-1">
        <label htmlFor="m-voice" className="font-bold">Phone call script (read by a computer voice)</label>
        <textarea id="m-voice" name="voice_script" rows={3} className="field" defaultValue={v.one("voice_script")} />
        <p className="text-base text-muted">The call starts “This is the {sender} with an update for veterans.” and ends with press 1 to repeat, press 9 to stop calls. Write numbers as you want them spoken.</p>
      </div>
      <div className="grid gap-1">
        <label htmlFor="m-mail" className="font-bold">Letter</label>
        <textarea id="m-mail" name="mail_body" rows={6} className="field" defaultValue={v.one("mail_body")} />
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" name="include_listings" value="yes" className="h-6 w-6" defaultChecked={!v.any || v.has("include_listings", "yes")} />
          Add each person&apos;s listings (their topics and place) to their letter
        </label>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-1 font-bold">Only people interested in (none = everyone)</legend>
        {CATEGORIES.map((c) => (
          <label key={c.id} className="flex min-h-[44px] items-center gap-2">
            <input type="checkbox" name="topic" value={c.id} className="h-6 w-6" defaultChecked={v.has("topic", c.id)} /> {c.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-1 font-bold">Only people in (none = everywhere)</legend>
        {LOCALITIES.map((l) => (
          <label key={l.id} className="flex min-h-[44px] items-center gap-2">
            <input type="checkbox" name="locality" value={l.id} className="h-6 w-6" defaultChecked={v.has("locality", l.id)} /> {l.label}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1">
        <label htmlFor="m-lang" className="font-bold">Language</label>
        <select id="m-lang" name="language" className="field max-w-xs" defaultValue={v.one("language")}>
          <option value="">Everyone</option>
          <option value="en">Only English</option>
          <option value="es">Only Spanish (write the message in Spanish)</option>
        </select>
      </div>
      <p><button className="btn btn-primary" disabled={pending}>Save draft and review</button></p>
    </form>
  );
}
