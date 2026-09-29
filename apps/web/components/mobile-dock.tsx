"use client";

import { Drawer } from "@base-ui/react/drawer";
import { focusRing } from "@repo/ui";
import { SlidersHorizontal, X } from "lucide-react";
import type { ReactNode, Ref } from "react";
import type { BaseplateSummary } from "@/lib/engine/protocol";
import { strings as t } from "@/lib/strings";
import { DockReadout, Readout } from "./settings-panel";

/** Distance between the dock and the edges of the screen, in CSS pixels. */
export const DOCK_OFFSET = 12;

export interface MobileDockProps {
  summary: BaseplateSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  download: ReactNode;
  /** The settings families shown in the sheet. */
  children: ReactNode;
  dockRef: Ref<HTMLDivElement>;
  sheetRef: Ref<HTMLDivElement>;
}

/**
 * Mobile controls: a dock at the bottom (dimensions, Réglages, download) and a settings
 * sheet that rises over 58 % of the height. The sheet is not modal and only closes on
 * request, so the preview above it stays visible and can be orbited.
 */
export function MobileDock({ summary, open, onOpenChange, download, children, dockRef, sheetRef }: MobileDockProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
      {/* Hidden under the open sheet, which repeats its dimensions. */}
      <div
        ref={dockRef}
        style={{ left: DOCK_OFFSET, right: DOCK_OFFSET, bottom: DOCK_OFFSET }}
        className={`absolute md:hidden ${open ? "invisible" : ""}`}
      >
        <div className="rounded-[22px] border border-line bg-surface p-2 shadow-[0_18px_40px_-18px_rgb(18_19_25/0.35)]">
          <DockReadout summary={summary} />
          <div className="flex gap-2">
            <Drawer.Trigger
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-sunken text-[14px] font-semibold ${focusRing}`}
            >
              <SlidersHorizontal className="size-4" aria-hidden /> {t.settings}
            </Drawer.Trigger>
            <div className="flex-1">{download}</div>
          </div>
        </div>
      </div>
      <Drawer.Portal>
        <Drawer.Viewport className="pointer-events-none fixed inset-0 z-40 flex items-end md:hidden">
          <Drawer.Popup
            ref={sheetRef}
            className="pointer-events-auto flex h-[58dvh] w-full flex-col rounded-t-[26px] bg-surface shadow-[0_-16px_48px_-20px_rgb(18_19_25/0.35)] outline-none [transform:translateY(var(--drawer-swipe-movement-y,0px))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]"
          >
            <div className="relative flex shrink-0 items-start pr-4">
              <div aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line-strong" />
              <Drawer.Title className="sr-only">{t.settings}</Drawer.Title>
              <div className="min-w-0 flex-1">
                <Readout summary={summary} live />
              </div>
              <Drawer.Close
                aria-label={t.close}
                className={`mt-5 grid size-9 shrink-0 place-items-center rounded-full bg-sunken ${focusRing}`}
              >
                <X className="size-4" aria-hidden />
              </Drawer.Close>
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-6">
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
