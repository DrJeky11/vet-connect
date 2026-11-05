import type { Metadata } from "next";
import Link from "next/link";
import { currentStaff } from "@/lib/outreach/staff-session";
import { readConfig } from "@/lib/outreach/config";
import { staffLogout } from "./actions";

export const metadata: Metadata = { title: { default: "Staff: outreach", template: "%s | Staff" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const who = await currentStaff();
  const cfg = readConfig();
  return (
    <div className="grid gap-4" lang="en">
      {cfg.live ? (
        <p className="rounded-xl border-2 border-ok bg-ok-bg p-3 font-bold text-ok" role="note" data-testid="mode-banner">
          LIVE: texts and calls go to real phones.
        </p>
      ) : (
        <div className="rounded-xl border-2 border-warn bg-warn-bg p-3" role="note" data-testid="mode-banner">
          <p className="font-bold text-warn">Simulated mode: nothing is sent to anyone.</p>
          <p className="text-base">
            Texts and calls are recorded as “simulated”.
            {cfg.staffPasscodeIsDemo && " Demo passcode in use, so names, phone numbers and addresses are hidden on every staff screen."}
          </p>
        </div>
      )}
      {who && (
        <nav aria-label="Staff" className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
          <Link href="/staff" className="btn btn-secondary !min-h-[44px]">Overview</Link>
          <Link href="/staff/subscribers" className="btn btn-secondary !min-h-[44px]">Subscribers</Link>
          <Link href="/staff/messages" className="btn btn-secondary !min-h-[44px]">Messages</Link>
          <Link href="/staff/try" className="btn btn-secondary !min-h-[44px]">Try the text &amp; phone line</Link>
          <span className="ml-auto text-base">
            Signed in as <strong>{who}</strong>
          </span>
          <form action={staffLogout}>
            <button className="btn btn-secondary !min-h-[44px]">Sign out</button>
          </form>
        </nav>
      )}
      {children}
    </div>
  );
}
