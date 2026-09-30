import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BinGenerator } from "@/components/bin-generator";
import { isLocale } from "@/lib/i18n";
import { STRINGS } from "@/lib/strings";

export async function generateMetadata({ params }: PageProps<"/[lang]/bin">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = STRINGS[lang].bin;
  return { title: t.generator, description: t.description };
}

// Bin generator (#32), in the Studio interface of the baseplate generator.
export default function BinPage() {
  return <BinGenerator />;
}
