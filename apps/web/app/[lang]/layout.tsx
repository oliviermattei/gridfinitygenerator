import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { accentVars } from "@repo/ui";
import { Analytics } from "@/components/analytics";
import { LOCALES, isLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale";
import "../globals.css";

// /fr/ and /en/ only, generated at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} style={accentVars()}>
      <body className="bg-bg font-sans text-ink antialiased">
        <LocaleProvider locale={lang}>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
