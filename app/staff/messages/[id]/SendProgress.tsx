"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { processBatch } from "../../actions";

/** Sends in small batches so no single request runs long, and shows progress. */
export function SendProgress({ id, initialRemaining }: { id: number; initialRemaining: number }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [note, setNote] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const started = useRef(false);

  async function run() {
    setRunning(true);
    setNote(null);
    for (;;) {
      const r = await processBatch(id);
      setRemaining(r.remaining);
      if (r.error) {
        setNote(r.error);
        break;
      }
      if (r.paused === "contact_hours") {
        setNote("Paused: it is outside 8 a.m. to 9 p.m. Eastern. Come back during those hours and press Continue.");
        break;
      }
      if (r.remaining === 0 || r.processed === 0) break;
    }
    setRunning(false);
    router.refresh();
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-2 rounded-xl border-2 border-brand p-4" role="status" aria-live="polite" data-testid="send-progress">
      <p className="font-bold">{running ? `Sending… ${remaining} left` : remaining ? `${remaining} waiting to send` : "All sent."}</p>
      {note && <p>{note}</p>}
      {!running && remaining > 0 && (
        <p><button type="button" className="btn btn-primary" onClick={run}>Continue sending</button></p>
      )}
    </div>
  );
}
