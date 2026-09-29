"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { focusRing } from "@repo/ui";
import { useRef } from "react";
import { useStrings } from "@/lib/locale";

export interface ResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Confirmation before a reset of the baseplate settings, so that a stray click loses
 * nothing. Focus starts on Cancel, the safe choice.
 */
export function ResetDialog({ open, onOpenChange, onConfirm }: ResetDialogProps) {
  const t = useStrings();
  const cancel = useRef<HTMLButtonElement>(null);
  const button = `flex h-10 items-center justify-center rounded-ctl px-4 text-[14px] font-semibold transition-colors ${focusRing}`;
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-ink/25 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup
          initialFocus={cancel}
          className="popup fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 p-5"
        >
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="text-[16px] font-semibold tracking-[-0.01em]">{t.resetTitle}</AlertDialog.Title>
            <AlertDialog.Description className="text-[13.5px] leading-snug text-muted">{t.resetDescription}</AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close ref={cancel} className={`${button} bg-sunken text-ink hover:bg-track`}>
              {t.cancel}
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={onConfirm}
              className={`${button} bg-accent text-accent-ink hover:bg-accent-strong`}
            >
              {t.reset}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
