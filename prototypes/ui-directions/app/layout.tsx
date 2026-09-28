import type { Metadata, Viewport } from "next";
import { Archivo, Figtree, Onest, Unbounded } from "next/font/google";
import "./globals.css";

const onest = Onest({ subsets: ["latin"], variable: "--font-onest" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Pocketfit — prototype UI",
  description: "PROTOTYPE JETABLE : 3 directions visuelles du générateur de baseplates.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${onest.variable} ${archivo.variable} ${unbounded.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
