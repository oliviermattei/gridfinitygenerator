"use client";

import { focusRing, glass } from "@repo/ui";
import { indexPath } from "@/lib/i18n";
import { useLocale, useStrings } from "@/lib/locale";
import { PocketMark } from "./illustrations";

/** Top left of a generator: its name, and the mark that leads back to the index (ADR 0017). */
export function GeneratorHeader({ title }: { title: string }) {
  const t = useStrings();
  const locale = useLocale();
  return (
    <header className={`absolute top-3 left-3 flex h-11 items-center gap-2.5 rounded-full pr-4 pl-2 md:top-4 md:left-4 ${glass}`}>
      <a href={indexPath(locale)} aria-label={t.home.backToIndex} title={t.home.backToIndex} className={`rounded-full ${focusRing}`}>
        <PocketMark className="size-7 text-ink" />
      </a>
      <h1 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h1>
    </header>
  );
}
