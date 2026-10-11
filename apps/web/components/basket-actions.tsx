"use client";

import { focusRing } from "@repo/ui";
import { CopyPlus, RefreshCw, ShoppingBasket } from "lucide-react";
import { articleName, updateArticle, type Article, type ArticleModel } from "@/lib/basket";
import { addToBasket, changeBasket } from "@/lib/basket-store";
import { useFormats, useStrings } from "@/lib/locale";
import { notify } from "./notifications";

export interface BasketActionsProps {
  /** What the generator adds: its model on screen. */
  model: ArticleModel;
  /** Query string of the share link of the settings on screen. */
  link: string;
  /** Footprint of a baseplate measured on its mesh, for its name; null until then. */
  footprint?: { width: number; depth: number } | null;
  /**
   * The article of the basket the generator was opened to edit (`useEditedArticle`): its
   * buttons then update it, or add the settings as a new article of its model.
   */
  edited: Article | null;
  /** Whether adding waits: the page hydrates, or the model cannot be downloaded (too large). */
  disabled: boolean;
  /** Why it cannot be added, the message of the download. */
  disabledReason?: string;
}

const secondary = `flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-ctl border border-line-strong bg-surface px-3 text-[13.5px] font-semibold transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

/**
 * « Ajouter au panier », next to the download (#41, ADR 0024): the settings on screen become an
 * article, confirmed by a short notification without leaving the page. Opened from the basket
 * to edit an article, the generator offers to update it, or to add a new article.
 */
export function BasketActions({ model, link, footprint = null, edited, disabled, disabledReason }: BasketActionsProps) {
  const t = useStrings();
  const f = useFormats();
  const nameOf = (article: Pick<Article, "model" | "link">) =>
    articleName({ id: "", quantity: 1, ...article }, t, f.lengths, article.model === "baseplate" ? footprint : null);

  if (edited) {
    const target = { model: edited.model, link };
    return (
      <div className="flex flex-col gap-2">
        <p className="truncate text-[12.5px] font-medium text-muted" data-testid="edited-article">
          {t.basket.editing(nameOf(edited))}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            title={disabledReason}
            onClick={() => {
              changeBasket((basket) => updateArticle(basket, edited.id, link));
              notify(t.basket.updated(nameOf(target)));
            }}
            className={secondary}
          >
            <RefreshCw className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{t.basket.update}</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            title={disabledReason}
            onClick={() => {
              addToBasket({ ...target, quantity: 1 });
              notify(t.basket.added(nameOf(target)));
            }}
            className={secondary}
          >
            <CopyPlus className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{t.basket.addAsNew}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      title={disabledReason}
      onClick={() => {
        addToBasket({ model, link, quantity: 1 });
        notify(t.basket.added(nameOf({ model, link })));
      }}
      className={`${secondary} w-full`}
    >
      <ShoppingBasket className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{t.basket.add}</span>
    </button>
  );
}
