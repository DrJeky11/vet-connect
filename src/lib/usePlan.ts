"use client";
import { useCallback, useSyncExternalStore } from "react";
import { addToPlan, emptyPlan, parsePlan, PLAN_KEY, removeFromPlan, toggleDone, type Plan } from "./plan";

// One shared snapshot so every component sees the same plan.
let snapshot: Plan | null = null;
let rawCache: string | null = null;
const listeners = new Set<() => void>();
const SERVER_PLAN = emptyPlan();

function read(): Plan {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PLAN_KEY);
  } catch {}
  if (snapshot && raw === rawCache) return snapshot;
  rawCache = raw;
  snapshot = parsePlan(raw);
  return snapshot;
}

function write(p: Plan) {
  const raw = JSON.stringify(p);
  try {
    localStorage.setItem(PLAN_KEY, raw);
  } catch {}
  rawCache = raw;
  snapshot = p;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === PLAN_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const subscribeReady = () => () => {};

export function usePlan() {
  const plan = useSyncExternalStore(subscribe, read, () => SERVER_PLAN);
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const update = useCallback((fn: (p: Plan) => Plan) => write(fn(read())), []);
  return {
    plan,
    ready,
    has: (id: string) => plan.items.some((i) => i.id === id),
    add: (id: string) => update((p) => addToPlan(p, id)),
    remove: (id: string) => update((p) => removeFromPlan(p, id)),
    toggle: (id: string) => update((p) => toggleDone(p, id)),
    setLocality: (locality: Plan["locality"]) => update((p) => ({ ...p, locality })),
    setForSomeone: (forSomeone: boolean) => update((p) => ({ ...p, forSomeone })),
    clear: () => update(() => emptyPlan()),
    replace: (next: Plan) => update(() => next),
  };
}
