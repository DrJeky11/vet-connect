"use client";
import { useState } from "react";
import { tryText } from "../actions";

interface Msg {
  from: "them" | "us";
  text: string;
  effects?: string[];
}

export function TextSimulator() {
  const [phone, setPhone] = useState("540-555-0134");
  const [text, setText] = useState("RIDE 22553");
  const [log, setLog] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const body = text;
    setLog((l) => [...l, { from: "them", text: body }]);
    setText("");
    const r = await tryText(phone, body);
    setLog((l) => [...l, { from: "us", text: r.reply ?? "", effects: r.effects }]);
    setBusy(false);
  }
  return (
    <section aria-labelledby="tt-h" className="grid gap-3 rounded-xl border-2 border-line p-4">
      <h2 id="tt-h" className="text-2xl font-bold">Text line</h2>
      <p className="text-base">Try: <code>HELP</code>, <code>FOOD 22401</code>, <code>I need a lawyer in Stafford</code>, <code>JOIN 22553</code>, <code>STOP</code>.</p>
      <ol className="grid gap-2" aria-live="polite" data-testid="text-log">
        {log.map((m, i) => (
          <li key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl p-3 ${m.from === "them" ? "justify-self-end bg-brand text-white" : "bg-wash"}`}>
            <span className="sr-only">{m.from === "them" ? "You texted: " : "Reply: "}</span>
            {m.text}
            {m.effects && m.effects.length > 0 && (
              <ul className="mt-2 border-t border-line pt-1 text-base">
                {m.effects.map((e) => <li key={e}>⚙ {e}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <form onSubmit={send} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <div className="grid gap-1">
          <label htmlFor="tt-from" className="font-bold">From number</label>
          <input id="tt-from" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="tt-msg" className="font-bold">Message</label>
          <input id="tt-msg" className="field" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={busy}>Send text</button>
      </form>
    </section>
  );
}
