import type { Metadata } from "next";
import { BaseplateGenerator } from "@/components/baseplate-generator";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { STRINGS } from "@/lib/strings";

export async function generateMetadata({ params }: PageProps<"/[lang]/baseplate">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = STRINGS[lang];
  return { title: t.generator, description: t.description };
}

// Studio interface (#6): full-screen 3D preview, floating settings panel, top bar.
export default function BaseplatePage() {
  return <BaseplateGenerator />;
}
