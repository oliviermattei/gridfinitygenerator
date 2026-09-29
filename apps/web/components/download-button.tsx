"use client";

import { Menu } from "@base-ui/react/menu";
import { focusRing } from "@repo/ui";
import { ChevronDown, Download } from "lucide-react";
import type { ExportFormat } from "@/lib/engine/protocol";
import { strings as t } from "@/lib/strings";

export interface DownloadButtonProps {
  onDownload: (format: ExportFormat) => void;
  /** Format being prepared, if any: every download waits for it. */
  exporting: ExportFormat | null;
  /** Dock variant: the format alone as visible text. */
  compact?: boolean;
}

const FORMATS: readonly { format: ExportFormat; description: string }[] = [
  { format: "3mf", description: t.threeMfDescription },
  { format: "stl", description: t.stlDescription },
];

/**
 * Download of the baseplate: the main button downloads a 3MF, the cheapest path to the
 * slicer (named object, share link inside); its menu also offers the STL.
 */
export function DownloadButton({ onDownload, exporting, compact = false }: DownloadButtonProps) {
  const label = exporting ? t.preparing[exporting] : t.download["3mf"];
  const accent = `h-12 bg-accent text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-70 ${focusRing}`;
  return (
    <div className="flex w-full">
      <button
        type="button"
        onClick={() => onDownload("3mf")}
        disabled={exporting !== null}
        aria-label={compact ? label : undefined}
        className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-l-ctl px-3 text-[15px] font-semibold ${accent}`}
      >
        <Download className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
        <span className="truncate">{compact ? (exporting ?? "3mf").toUpperCase() : label}</span>
      </button>
      <Menu.Root>
        <Menu.Trigger
          aria-label={t.otherFormats}
          title={t.otherFormats}
          disabled={exporting !== null}
          className={`grid w-10 shrink-0 place-items-center rounded-r-ctl border-l border-accent-ink/25 ${accent}`}
        >
          <ChevronDown className="size-4" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" align="end" sideOffset={8} collisionPadding={12} className="z-50">
            <Menu.Popup className="popup w-[min(18rem,calc(100vw-1.5rem))] p-1.5">
              {FORMATS.map(({ format, description }) => (
                <Menu.Item
                  key={format}
                  onClick={() => onDownload(format)}
                  className="flex cursor-default items-start gap-3 rounded-[10px] px-2.5 py-2 outline-none data-highlighted:bg-sunken"
                >
                  <Download className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{t.download[format]}</span>
                    <span className="block text-[12px] leading-snug text-muted">{description}</span>
                  </span>
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
