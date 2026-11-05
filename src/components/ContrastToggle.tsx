"use client";
import { useEffect, useState } from "react";

const KEY = "vsn-contrast";

export function ContrastToggle() {
  const [high, setHigh] = useState(false);
  useEffect(() => {
    setHigh(document.documentElement.dataset.contrast === "high");
  }, []);
  function toggle() {
    const next = !high;
    setHigh(next);
    document.documentElement.dataset.contrast = next ? "high" : "normal";
    try {
      localStorage.setItem(KEY, next ? "high" : "normal");
    } catch {}
  }
  return (
    <button type="button" className="btn btn-secondary !border-transparent" aria-pressed={high} onClick={toggle}>
      High contrast
    </button>
  );
}

/** Inline script that applies the saved contrast setting before first paint. */
export const contrastInitScript = `try{if(localStorage.getItem("${KEY}")==="high")document.documentElement.dataset.contrast="high"}catch(e){}`;
