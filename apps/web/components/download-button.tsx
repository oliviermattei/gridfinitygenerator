"use client";

import { focusRing } from "@repo/ui";
import { Download } from "lucide-react";
import { strings as t } from "@/lib/strings";

export interface DownloadButtonProps {
  onDownload: () => void;
  exporting: boolean;
  /** Dock variant: the format alone as visible text. */
  compact?: boolean;
}

/**
 * Download of the baseplate. STL only for now: 3MF becomes the default, with STL in a
 * menu beside it, with #9.
 */
export function DownloadButton({ onDownload, exporting, compact = false }: DownloadButtonProps) {
  const label = exporting ? t.preparingStl : t.downloadStl;
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={exporting}
      aria-label={compact ? label : undefined}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-ctl bg-accent px-3 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-70 ${focusRing}`}
    >
      <Download className="size-4" strokeWidth={2.2} aria-hidden />
      {compact ? "STL" : label}
    </button>
  );
}
