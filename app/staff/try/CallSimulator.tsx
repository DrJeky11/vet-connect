"use client";
import { useState } from "react";
import type { VoiceNode } from "@/lib/outreach/lines";
import { tryCall } from "../actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function paramsFrom(action: string): Record<string, string> {
  const q = new URL(action, "http://x").searchParams;
  return Object.fromEntries(q.entries());
}

export function CallSimulator() {
  const [phone, setPhone] = useState("540-555-0134");
  const [node, setNode] = useState<VoiceNode | null>(null);
  const [effects, setEffects] = useState<string[]>([]);
  const [digits, setDigits] = useState("");
  const [ended, setEnded] = useState(false);
  const [showXml, setShowXml] = useState(false);
  const [xml, setXml] = useState("");

  async function go(params: Record<string, string | null>) {
    const r = await tryCall(params, phone);
    setNode(r.node ?? null);
    setXml(r.twiml ?? "");
    setEffects(r.effects);
    setDigits("");
    setEnded(Boolean(r.node && !r.node.gather && r.node.hangup));
  }

  function press(k: string) {
    if (!node?.gather) return;
    const want = node.gather.numDigits ?? 1;
    if (k === "#" && node.gather.finishOnKey === "#") return void go({ ...paramsFrom(node.gather.action), digits });
    const next = digits + k;
    if (next.length >= want) void go({ ...paramsFrom(node.gather.action), digits: next });
    else setDigits(next);
  }

  return (
    <section aria-labelledby="tc-h" className="grid gap-3 rounded-xl border-2 border-line p-4">
      <h2 id="tc-h" className="text-2xl font-bold">Phone line</h2>
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <label htmlFor="tc-from" className="font-bold">Calling from</label>
          <input id="tc-from" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => go({ step: null })}>
          {node ? "Hang up and call again" : "Call the line"}
        </button>
      </div>
      {node && (
        <div className="grid gap-3" data-testid="call-screen">
          <div className="rounded-lg bg-wash p-3" aria-live="polite">
            <p className="font-bold">🔊 The caller hears:</p>
            <ul className="ml-5 list-disc">
              {node.say.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            {ended && <p className="mt-2 font-bold">The call ends.</p>}
          </div>
          {effects.length > 0 && (
            <ul className="text-base">{effects.map((e) => <li key={e}>⚙ {e}</li>)}</ul>
          )}
          {node.gather && (
            <div className="grid gap-2">
              <p className="font-bold">
                Keypad {node.gather.numDigits && node.gather.numDigits > 1 ? `(enter ${node.gather.numDigits} digits${node.gather.finishOnKey === "#" ? " or press #" : ""})` : ""}
                {digits && <> · typed: {digits}</>}
              </p>
              <div className="grid max-w-xs grid-cols-3 gap-2" role="group" aria-label="Keypad">
                {KEYS.map((k) => (
                  <button key={k} type="button" className="btn btn-secondary text-xl" onClick={() => press(k)} aria-label={k === "*" ? "star" : k === "#" ? "pound" : k}>
                    {k}
                  </button>
                ))}
              </div>
              <p>
                <button type="button" className="btn btn-secondary !border-transparent" onClick={() => node.redirect && go(paramsFrom(node.redirect))}>
                  Press nothing (time out)
                </button>
              </p>
            </div>
          )}
          <p>
            <button type="button" className="btn btn-secondary !border-transparent" onClick={() => setShowXml(!showXml)} aria-expanded={showXml}>
              {showXml ? "Hide" : "Show"} the TwiML sent to Twilio
            </button>
          </p>
          {showXml && <pre className="overflow-x-auto rounded-lg bg-ink p-3 text-sm text-white">{xml}</pre>}
        </div>
      )}
    </section>
  );
}
