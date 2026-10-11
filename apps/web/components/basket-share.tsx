"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { focusRing } from "@repo/ui";
import { Link2 } from "lucide-react";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Article } from "@/lib/basket";
import { basketShareQuery, readBasketShareLink, type OpenedBasketLink } from "@/lib/basket-share-link";
import { openInBasket, useBasket } from "@/lib/basket-store";
import { basketPath } from "@/lib/i18n";
import { useLocale, useStrings } from "@/lib/locale";
import type { Strings } from "@/lib/strings";
import { notify } from "./notifications";

/** « Copier le lien du panier » (#44): the whole basket in one link, to send or to open elsewhere. */
export function CopyBasketLinkButton({ articles }: { articles: readonly Article[] }) {
  const t = useStrings();
  const locale = useLocale();

  async function copy() {
    const link = `${window.location.origin}${basketPath(locale)}?${basketShareQuery(articles)}`;
    try {
      await navigator.clipboard.writeText(link);
      notify(t.linkCopied);
    } catch (reason) {
      console.error(reason);
      notify(t.copyFailed, link);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex h-10 items-center gap-2 rounded-ctl border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold transition-colors hover:bg-sunken ${focusRing}`}
    >
      <Link2 className="size-4" aria-hidden />
      {t.basket.copyLink}
    </button>
  );
}

/** Listeners of the page address, told when the basket link leaves it. */
const addressListeners = new Set<() => void>();

function subscribeToAddress(listener: () => void) {
  addressListeners.add(listener);
  return () => {
    addressListeners.delete(listener);
  };
}

/** Takes the basket link out of the page address, so that a reload opens nothing. */
function forgetBasketLink() {
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  addressListeners.forEach((listener) => listener());
}

/** Says what a link opened, with its articles left out: one notification, which stays when some are. */
function tellOpened(t: Strings, { articles, unreadable }: OpenedBasketLink) {
  const leftOut = unreadable > 0 ? t.basket.articlesUnreadable(unreadable) : undefined;
  if (articles.length === 0) notify(leftOut ?? t.basket.linkOpened(0));
  else notify(t.basket.linkOpened(articles.length), leftOut);
}

/**
 * Opens the basket link in the page address, once the page is hydrated: into an empty basket
 * at once, otherwise after asking whether it replaces the basket or adds to it. Its unreadable
 * articles are left out and said; the link then leaves the address.
 */
export function OpenBasketLink() {
  const t = useStrings();
  const { articles } = useBasket();
  const search = useSyncExternalStore(subscribeToAddress, () => window.location.search, () => "");
  const opened = useMemo(() => readBasketShareLink(search), [search]);
  const told = useRef<typeof opened>(null);

  useEffect(() => {
    if (opened === null || told.current === opened) return;
    told.current = opened;
    if (opened === "unreadable") {
      notify(t.basket.linkUnreadable);
      forgetBasketLink();
      return;
    }
    if (opened.articles.length > 0 && articles.length > 0) return; // asked below
    if (opened.articles.length > 0) openInBasket(opened.articles, "replace");
    tellOpened(t, opened);
    forgetBasketLink();
  }, [opened, articles, t]);

  // Asked only when the link brings articles to a basket that has some.
  const asked = opened !== null && opened !== "unreadable" && opened.articles.length > 0 && articles.length > 0 ? opened : null;

  const open = (how: "add" | "replace") => {
    if (!asked) return;
    openInBasket(asked.articles, how);
    tellOpened(t, asked);
  };

  const cancel = useRef<HTMLButtonElement>(null);
  const button = `flex h-10 items-center justify-center rounded-ctl px-4 text-[14px] font-semibold transition-colors ${focusRing}`;
  return (
    <AlertDialog.Root open={asked !== null} onOpenChange={(isOpen) => !isOpen && forgetBasketLink()}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-ink/25 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup
          initialFocus={cancel}
          className="popup fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 p-5"
        >
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="text-[16px] font-semibold tracking-[-0.01em]">{t.basket.openLinkTitle}</AlertDialog.Title>
            <AlertDialog.Description className="text-[13.5px] leading-snug text-muted">
              {t.basket.openLinkDescription(asked?.articles.length ?? 0, articles.length)}
            </AlertDialog.Description>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Close ref={cancel} className={`${button} bg-sunken text-ink hover:bg-track`}>
              {t.cancel}
            </AlertDialog.Close>
            <AlertDialog.Close onClick={() => open("add")} className={`${button} bg-sunken text-ink hover:bg-track`}>
              {t.basket.addToBasket}
            </AlertDialog.Close>
            <AlertDialog.Close onClick={() => open("replace")} className={`${button} bg-accent text-accent-ink hover:bg-accent-strong`}>
              {t.basket.replaceBasket}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
