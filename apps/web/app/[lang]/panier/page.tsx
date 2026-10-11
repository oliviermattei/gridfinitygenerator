import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BasketPage } from "@/components/basket-page";
import { isLocale } from "@/lib/i18n";
import { STRINGS } from "@/lib/strings";

export async function generateMetadata({ params }: PageProps<"/[lang]/panier">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = STRINGS[lang].basket;
  return { title: t.title, description: t.description };
}

// The basket (#41, ADR 0024): the same address in every language.
export default function Basket() {
  return <BasketPage />;
}
