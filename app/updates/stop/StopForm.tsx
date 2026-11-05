"use client";
import { useActionState } from "react";
import { useDict } from "@/lib/i18n/client";
import { stopUpdates, type StopState } from "../actions";

export function StopForm() {
  const t = useDict();
  const [state, action, pending] = useActionState<StopState, FormData>(stopUpdates, { status: "idle" });
  if (state.status === "done") {
    return (
      <p role="status" className="rounded-xl border-2 border-ok bg-ok-bg p-4 font-bold" data-testid="stop-done">
        ✓ {t.stop.done}
      </p>
    );
  }
  return (
    <form action={action} className="grid max-w-md gap-4">
      {state.status === "error" && (
        <p role="alert" className="font-bold text-bad">{state.message}</p>
      )}
      <div className="grid gap-1">
        <label htmlFor="stop-phone" className="font-bold">{t.stop.phone}</label>
        <input id="stop-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="field" required />
      </div>
      <label className="choice">
        <input type="checkbox" name="mail" value="yes" className="h-6 w-6 shrink-0" />
        <span>{t.stop.alsoMail}</span>
      </label>
      <button className="btn btn-primary" disabled={pending}>{t.stop.submit}</button>
    </form>
  );
}
