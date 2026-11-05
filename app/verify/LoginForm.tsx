"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [initials, setInitials] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/verify/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ initials, passcode: code }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Sign-in failed.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid max-w-md gap-4">
      <h1 className="text-3xl font-bold">Verifier sign-in</h1>
      <div className="grid gap-1">
        <label htmlFor="initials" className="font-bold">Your initials</label>
        <input id="initials" className="field" value={initials} onChange={(e) => setInitials(e.target.value)} maxLength={4} autoComplete="off" required />
        <p className="text-base text-muted">2 to 4 letters. Logged with every change you make.</p>
      </div>
      <div className="grid gap-1">
        <label htmlFor="passcode" className="font-bold">Demo passcode</label>
        <input id="passcode" type="password" className="field" value={code} onChange={(e) => setCode(e.target.value)} required />
        <p className="text-base text-muted">
          The default demo passcode is <code>demo-verifier</code> unless the host set another one.
        </p>
      </div>
      {error && <p role="alert" className="font-bold text-bad">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>Sign in</button>
    </form>
  );
}
