"use client";

import { Popover } from "@base-ui/react/popover";
import { Swatches, focusRing, glass } from "@repo/ui";
import { Coffee, Link2, RotateCcw, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { DONATION_URL } from "@/lib/links";
import { PREVIEW_COLORS, type PreviewColor } from "@/lib/preferences";
import { strings as t } from "@/lib/strings";

interface Action {
  key: string;
  label: string;
  icon: ReactNode;
  /** Link target; an action without one is shown inactive until its ticket lands. */
  href: string | null;
}

// Share and reset arrive with #8; the donation link is configured at build time.
const ACTIONS: Action[] = [
  { key: "share", label: t.share, icon: <Link2 className="size-4" aria-hidden />, href: null },
  { key: "reset", label: t.reset, icon: <RotateCcw className="size-4" aria-hidden />, href: null },
  { key: "donate", label: t.donate, icon: <Coffee className="size-4" aria-hidden />, href: DONATION_URL },
];

function ActionControl({ action, className }: { action: Action; className: string }) {
  if (action.href) {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" className={className}>
        {action.icon}
        {action.label}
        <span className="sr-only"> ({t.newTab})</span>
      </a>
    );
  }
  return (
    <button type="button" disabled title={t.comingSoon} className={`${className} disabled:cursor-not-allowed disabled:opacity-55`}>
      {action.icon}
      {action.label}
      <span className="sr-only"> ({t.comingSoon.toLowerCase()})</span>
    </button>
  );
}

/** Desktop actions of the top bar: share, reset, donate. On mobile they live in the menu. */
export function TopActions() {
  const pill = `flex h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink ${glass} ${focusRing}`;
  return (
    <div className="hidden items-center gap-2 md:flex">
      {ACTIONS.map((action) => (
        <ActionControl key={action.key} action={action} className={pill} />
      ))}
    </div>
  );
}

export interface SettingsMenuProps {
  previewColor: PreviewColor;
  onPreviewColorChange: (color: PreviewColor) => void;
  /** Mobile: the menu also holds the top bar actions. */
  withActions: boolean;
}

/**
 * Gear menu. On desktop it holds parameters only (preferences of this browser); on
 * mobile it also holds the actions. Language, units, printer and build plate join the
 * parameters with #7 and #14.
 */
export function SettingsMenu({ previewColor, onPreviewColorChange, withActions }: SettingsMenuProps) {
  const label = withActions ? t.menu : t.parameters;
  const row = `flex h-10 w-full items-center gap-3 rounded-[10px] px-2.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink ${focusRing} focus-visible:ring-offset-0`;
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={label}
        title={label}
        className={`grid size-11 place-items-center rounded-full text-ink-soft transition-colors hover:text-ink data-popup-open:text-ink ${glass} ${focusRing}`}
      >
        <Settings className="size-[18px]" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" collisionPadding={12} className="z-50">
          <Popover.Popup className="popup flex max-h-[calc(100dvh-5rem)] w-[min(20.5rem,calc(100vw-1.5rem))] flex-col overflow-y-auto">
            <Popover.Title className="px-4 pt-4 pb-1 text-[15px] font-semibold tracking-[-0.01em]">{label}</Popover.Title>

            <section className="px-4 py-3.5" aria-labelledby="preview-color-title">
              <div className="flex items-center justify-between gap-4">
                <h3 id="preview-color-title" className="text-[13.5px] font-semibold">
                  {t.previewColor}
                </h3>
                <span className="text-[12.5px] text-muted">{t.previewColors[previewColor]}</span>
              </div>
              <div className="mt-2 -ml-[3px]">
                <Swatches
                  label={t.previewColor}
                  value={previewColor}
                  onChange={onPreviewColorChange}
                  swatches={(Object.keys(PREVIEW_COLORS) as PreviewColor[]).map((key) => ({
                    value: key,
                    name: t.previewColors[key],
                    hex: PREVIEW_COLORS[key],
                  }))}
                />
              </div>
            </section>

            {withActions && (
              <section aria-label={t.actions} className="flex flex-col border-t border-line p-1.5">
                {ACTIONS.map((action) => (
                  <ActionControl key={action.key} action={action} className={row} />
                ))}
              </section>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
