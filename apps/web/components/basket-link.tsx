"use client";

import { focusRing, glass } from "@repo/ui";
import { ShoppingBasket } from "lucide-react";
import { useBasket } from "@/lib/basket-store";
import { basketPath } from "@/lib/i18n";
import { useLocale, useStrings } from "@/lib/locale";

/** The basket in the header of every page (#41): its icon, its number of articles, and its page. */
export function BasketLink({ className = "" }: { className?: string }) {
  const t = useStrings();
  const locale = useLocale();
  const count = useBasket().articles.length;
  const label = t.basket.open(count);
  return (
    <a
      href={basketPath(locale)}
      aria-label={label}
      title={label}
      className={`relative grid size-11 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:text-ink ${glass} ${focusRing} ${className}`}
    >
      <ShoppingBasket className="size-[18px]" aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          data-testid="basket-count"
          className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-ink tabular-nums"
        >
          {count}
        </span>
      )}
    </a>
  );
}
