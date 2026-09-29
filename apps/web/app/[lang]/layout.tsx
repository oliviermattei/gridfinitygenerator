import type { Viewport } from "next";
import { accentVars } from "@repo/ui";
import { Analytics } from "@/components/analytics";
import { LOCALES } from "@/lib/i18n";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang} style={accentVars()}>
      <body className="bg-bg font-sans text-ink antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
