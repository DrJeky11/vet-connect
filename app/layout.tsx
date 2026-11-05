import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { CrisisFooter } from "@/components/CrisisFooter";
import { SiteFooter } from "@/components/SiteFooter";
import { displayInitScript } from "@/components/DisplaySettings";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = dict(await getLocale());
  return {
    title: { default: t.brand, template: `%s | ${t.brand}` },
    description: t.home.lead,
    metadataBase: process.env.PUBLIC_SITE_URL ? new URL(process.env.PUBLIC_SITE_URL) : undefined,
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d4e89" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={dict(locale).htmlLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: displayInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <I18nProvider locale={locale}>
          <Header />
          <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
            {children}
          </main>
          <SiteFooter />
          <CrisisFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
