import type { Metadata } from "next";
import { currentVerifier } from "@/lib/session";
import { loadSeed } from "@/lib/seed";
import { getStore, getSuggestions } from "@/lib/store";
import { LoginForm } from "./LoginForm";
import { Dashboard } from "./Dashboard";

export const metadata: Metadata = { title: "Verifier dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const initials = await currentVerifier();
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border-2 border-warn bg-warn-bg p-3" role="note">
        <p className="font-bold text-warn">Simulated login</p>
        <p>
          This demo uses a shared passcode and your initials. It is not real security. Do not enter names or personal
          details.
        </p>
      </div>
      {initials ? (
        <Dashboard
          initials={initials}
          queue={getStore().queue(loadSeed())}
          log={getStore().log()}
          suggestions={getSuggestions().list("open")}
          now={new Date().toISOString()}
        />
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
