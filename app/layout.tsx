import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { CrisisFooter } from "@/components/CrisisFooter";
import { contrastInitScript } from "@/components/ContrastToggle";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Veteran Services Navigator", template: "%s | Veteran Services Navigator" },
  description:
    "Find local services for veterans in Fredericksburg, Spotsylvania, Stafford, King George and Caroline. Every listing shows its source.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d4e89" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: contrastInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <div className="no-print border-t border-line bg-wash">
          <div className="mx-auto max-w-5xl px-4 py-4 text-base text-muted">
            <p>
              This directory does not decide who qualifies. Each provider sets its own rules. Always call to confirm.{" "}
              <Link href="/about">What is real and what is simulated</Link> ·{" "}
              <Link href="/verify">Verifier sign-in</Link>
            </p>
          </div>
        </div>
        <CrisisFooter />
      </body>
    </html>
  );
}
