"use client";
import { useActionState } from "react";
import { staffLogin, type FormState } from "./actions";

export function StaffLoginForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(staffLogin, null);
  return (
    <form action={action} className="grid max-w-md gap-4">
      <h1 className="text-3xl font-bold">Staff sign-in: outreach</h1>
      <p>For staff who sign veterans up for updates and send texts, calls and letters.</p>
      <div className="grid gap-1">
        <label htmlFor="st-initials" className="font-bold">Your initials</label>
        <input id="st-initials" name="initials" className="field" maxLength={4} autoComplete="off" required />
        <p className="text-base text-muted">2 to 4 letters. Recorded with everything you do.</p>
      </div>
      <div className="grid gap-1">
        <label htmlFor="st-pass" className="font-bold">Staff passcode</label>
        <input id="st-pass" name="passcode" type="password" className="field" required autoComplete="current-password" />
        {demo && (
          <p className="text-base text-muted">
            Demo passcode: <code>demo-outreach</code>. Set <code>OUTREACH_PASSCODE</code> before real use.
          </p>
        )}
      </div>
      {state?.error && <p role="alert" className="font-bold text-bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>Sign in</button>
    </form>
  );
}
