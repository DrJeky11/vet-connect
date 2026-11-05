"use client";
import { useEffect, useState } from "react";
import { useDict } from "@/lib/i18n/client";

/** Reads text aloud with the browser's built-in voice. Hidden where unsupported. */
export function ReadAloud({ text, label }: { text: string; label?: string }) {
  const t = useDict();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;
  function toggle() {
    const s = window.speechSynthesis;
    if (speaking) {
      s.cancel();
      setSpeaking(false);
      return;
    }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = t.htmlLang === "es" ? "es-US" : "en-US";
    u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    s.speak(u);
    setSpeaking(true);
  }
  return (
    <button type="button" className="btn btn-secondary no-print" aria-pressed={speaking} onClick={toggle} data-testid="read-aloud">
      <span aria-hidden="true">{speaking ? "■" : "🔊"}</span> {speaking ? t.card.stopListening : t.card.listen}
      {label && <span className="sr-only"> {label}</span>}
    </button>
  );
}
