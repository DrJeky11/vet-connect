"use client";
import { useEffect, useState } from "react";
import { useDict } from "@/lib/i18n/client";

const CONTRAST_KEY = "vsn-contrast";
const TEXT_KEY = "vsn-text";

function useHtmlFlag(attr: "contrast" | "text", key: string, on: string) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(document.documentElement.dataset[attr] === on);
  }, [attr, on]);
  function toggle() {
    const next = !active;
    setActive(next);
    document.documentElement.dataset[attr] = next ? on : "normal";
    try {
      localStorage.setItem(key, next ? on : "normal");
    } catch {}
  }
  return [active, toggle] as const;
}

/** Larger text and high contrast, remembered per browser. */
export function DisplaySettings({ className = "" }: { className?: string }) {
  const t = useDict();
  const [large, toggleLarge] = useHtmlFlag("text", TEXT_KEY, "large");
  const [high, toggleHigh] = useHtmlFlag("contrast", CONTRAST_KEY, "high");
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label={t.nav.display}>
      <button type="button" className="btn btn-secondary !min-h-[44px] !px-3" aria-pressed={large} onClick={toggleLarge}>
        <span aria-hidden="true" className="font-bold">A+</span> {t.nav.largerText}
      </button>
      <button type="button" className="btn btn-secondary !min-h-[44px] !px-3" aria-pressed={high} onClick={toggleHigh}>
        <span aria-hidden="true">◐</span> {t.nav.highContrast}
      </button>
    </div>
  );
}

/** Applies saved display settings before first paint. */
export const displayInitScript = `try{var d=document.documentElement;if(localStorage.getItem("${CONTRAST_KEY}")==="high")d.dataset.contrast="high";if(localStorage.getItem("${TEXT_KEY}")==="large")d.dataset.text="large"}catch(e){}`;
