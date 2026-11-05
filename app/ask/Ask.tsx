"use client";
import { useState } from "react";
import Link from "next/link";
import type { Resource } from "@/lib/schema";
import { filtersToParams } from "@/lib/filter";
import { toFilters, type NavigatorAnswer } from "@/lib/navigator";
import { ResourceCard } from "@/components/ResourceCard";

export function Ask({ resources, usesClaude }: { resources: Resource[]; usesClaude: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<NavigatorAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(resources.map((r) => [r.id, r]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/navigator", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Something went wrong.");
    setReply(body);
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-bold">Ask in your own words</h1>
      <p className="rounded-lg bg-wash p-3 text-base">
        This helper only searches the directory. It cannot answer other questions or decide if you qualify.{" "}
        {usesClaude ? "It uses an AI model to read your sentence." : "It matches key words in your sentence."} Do not type
        names or personal details.
      </p>
      <form onSubmit={submit} className="grid gap-2">
        <label htmlFor="ask" className="font-bold">What do you need?</label>
        <input id="ask" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="I need a ride to my dentist in Stafford" />
        <button className="btn btn-primary" disabled={busy || !text.trim()}>{busy ? "Searching…" : "Search"}</button>
      </form>
      {error && <p role="alert" className="text-bad">{error}</p>}
      <div aria-live="polite">
        {reply && (
          <div className="grid gap-3">
            <p className="text-xl" data-testid="navigator-message">{reply.message}</p>
            {reply.filters.category && (
              <p>
                <Link href={`/resources?${filtersToParams(toFilters(reply.filters)).toString()}`}>Open these filters in the directory</Link>
              </p>
            )}
            <ul className="grid gap-4">
              {reply.resource_ids.map((id) => byId.get(id)).filter(Boolean).map((r) => (
                <li key={r!.id}><ResourceCard r={r!} headingLevel={2} /></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
