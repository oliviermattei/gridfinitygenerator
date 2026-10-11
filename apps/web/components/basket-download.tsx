"use client";

import type { BuildPlate, PackingMode } from "@repo/geometry";
import { focusRing } from "@repo/ui";
import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { articleShareLink, type Article } from "@/lib/basket";
import { basketDownloadPlan } from "@/lib/basket-packing";
import { basketShareQuery } from "@/lib/basket-share-link";
import type { StackChoice } from "@/lib/engine/article-measure";
import { createBasketEngineClient, type BasketEngineClient } from "@/lib/engine/basket-client";
import type { ExportFormat } from "@/lib/engine/protocol";
import { MEDIA_TYPES, download } from "@/lib/export-file";
import { basketPath } from "@/lib/i18n";
import { useLocale, useStrings } from "@/lib/locale";
import type { BambuTarget } from "@/lib/printers/bambu";
import type { BasketPackingState } from "./basket-packing";
import { DownloadButton } from "./download-button";
import { notify } from "./notifications";

/** A download being written: its format, and how many articles are computed of how many. */
interface Writing {
  format: ExportFormat;
  done: number;
  total: number;
}

/**
 * The download of the basket (#43, ADR 0024): the best rangement found so far, without waiting
 * for the end of its search; a Bambu Studio project with a Bambu Lab printer, a ZIP of a 3MF per
 * plate otherwise, or a ZIP of an STL per plate. Each article is computed once, in a worker of
 * its own, which « Annuler » ends.
 */
export function BasketDownload({
  articles,
  packing,
  mode,
  nameOf,
  buildPlate,
  stack,
  bambu,
  excluded,
}: {
  articles: readonly Article[];
  packing: BasketPackingState;
  mode: PackingMode;
  nameOf: (articleId: string) => string;
  buildPlate: BuildPlate;
  stack: StackChoice | null;
  bambu: BambuTarget | null;
  /** Articles left out: they do not fit on the plate, or their computation failed. */
  excluded: number;
}) {
  const t = useStrings();
  const locale = useLocale();
  const names = t.basket.download;
  const [writing, setWriting] = useState<Writing | null>(null);
  const running = useRef<BasketEngineClient | null>(null);

  useEffect(() => () => running.current?.dispose(), []);

  const plates = packing.progress?.packing.plates ?? [];
  // The download itself says it leaves articles out.
  const labelOf = (label: string) => (excluded > 0 ? names.withExcluded(label, excluded) : label);
  const ready = packing.basket !== null && plates.length > 0;

  async function start(format: ExportFormat) {
    if (!packing.basket || plates.length === 0 || running.current) return;
    const origin = window.location.origin;
    const plan = basketDownloadPlan(articles, packing.basket, plates, mode, {
      nameOf,
      linkOf: (article) => articleShareLink(article, origin, locale),
      t,
      basketLink: `${origin}${basketPath(locale)}?${basketShareQuery(articles)}`,
    });
    const client = createBasketEngineClient();
    running.current = client;
    setWriting({ format, done: 0, total: plan.articles.length });
    try {
      const file = await client.download(plan, { buildPlate, stack, format, bambu }, (done, total) =>
        setWriting((known) => (known && running.current === client ? { ...known, done, total } : known)),
      );
      if (running.current !== client) return;
      download(file.bytes as Uint8Array<ArrayBuffer>, `${file.name}.${file.extension}`, MEDIA_TYPES[file.extension]);
    } catch (reason) {
      if (running.current !== client) return; // cancelled
      console.error(reason);
      notify(t.exportFailed);
    } finally {
      if (running.current === client) {
        running.current = null;
        setWriting(null);
      }
      client.dispose();
    }
  }

  function cancel() {
    const client = running.current;
    running.current = null;
    setWriting(null);
    client?.dispose();
  }

  return (
    <div className="mt-4">
      <div className="max-w-sm">
        <DownloadButton
          onDownload={start}
          exporting={writing?.format ?? null}
          disabled={!ready || writing !== null}
          labels={{ "3mf": labelOf(bambu ? names.bambu : names.threeMf), stl: labelOf(names.stl) }}
          threeMfDescription={bambu ? names.bambuDescription : names.threeMfDescription}
          stlDescription={names.stlDescription}
        />
      </div>
      {writing && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]" role="status" data-testid="download-progress">
          <span className="font-medium tabular-nums">{names.progress(writing.done, writing.total)}</span>
          <button
            type="button"
            onClick={cancel}
            className={`h-8 rounded-ctl border border-line-strong px-3 text-[13px] font-semibold transition-colors hover:bg-sunken ${focusRing}`}
          >
            {names.cancel}
          </button>
        </p>
      )}
      {excluded > 0 && (
        <p className="mt-2 flex gap-2 text-[13px] leading-snug font-medium text-red-700" data-testid="download-excluded">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
          {names.excluded(excluded)}
        </p>
      )}
    </div>
  );
}
