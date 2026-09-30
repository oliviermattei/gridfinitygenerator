"use client";

import { fitsOnBuildPlate, narrowMargin, type BuildPlate, type Margins } from "@repo/geometry";
import { TriangleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { BaseplateSummary } from "@/lib/engine/protocol";
import type { Formats } from "@/lib/format";
import { useFormats, useStrings } from "@/lib/locale";
import type { Strings } from "@/lib/strings";
import type { Unit } from "@/lib/units";

/**
 * Whether every piece of the baseplate shown fits on the build plate, in either orientation,
 * as measured on its mesh; null until it is known. The engine cuts a baseplate that does not
 * fit: a piece still too large means a cell and its margin are larger than the build plate.
 */
export function fitsOn(summary: BaseplateSummary | null, plate: BuildPlate): boolean | null {
  return summary ? summary.pieces.every((piece) => fitsOnBuildPlate(piece.dimensions, plate)) : null;
}

export interface StatsCardProps {
  /** The baseplate shown, null until its first computation answers. */
  summary: BaseplateSummary | null;
  /** Layer height the summary was computed with, in millimetres. */
  layerHeight: number;
  /** Line width the summary was computed with, in millimetres. */
  lineWidth: number;
  /** Whether the summary comes from the final mesh of the current settings (its volume is then shown). */
  final: boolean;
  buildPlate: BuildPlate;
  /** Whether the summary fits on the build plate (`fitsOn`); null until it is known. */
  fits: boolean | null;
  /** Whether an advanced setting differs from its default: standard bins may no longer fit. */
  advancedChanged: boolean;
  /** Whether the baseplate is a CLICKbase, whose lamellas need PETG, Arachne and a 0.4 mm nozzle. */
  clickbase: boolean;
  /** Unit of the margins, like the drawer they come from. */
  unit: Unit;
  className?: string;
}

/**
 * Statistics of the baseplate, real numbers only: measured on the mesh or computed
 * exactly, never estimated. The volume of material is measured on the final mesh, "…"
 * until it answers for the current settings.
 */
export function StatsCard({ summary, layerHeight, lineWidth, final, buildPlate, fits, advancedChanged, clickbase, unit, className = "" }: StatsCardProps) {
  const t = useStrings();
  const f = useFormats();
  const stats = summary?.stats;
  const narrowest = summary ? narrowMargin(summary.layout.margins, lineWidth) : null;
  const volume = final ? stats?.volume : null;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={className}>
      <h2 id={titleId} className="px-4 pt-3.5 pb-1 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        {t.statistics}
      </h2>
      <dl className="px-4 pb-3 text-[13px]">
        <Stat label={t.dimensions} id="dimensions">
          {stats &&
            `${f.lengths.format(stats.dimensions.width)} × ${f.lengths.format(stats.dimensions.depth)} × ${f.fine.format(stats.dimensions.height)} mm`}
        </Stat>
        <Stat label={t.statCells} id="cells">
          {summary && `${summary.layout.columns} × ${summary.layout.rows}`}
        </Stat>
        <Stat label={t.statMargin} id="margin">
          {summary && marginText(summary.layout.margins, unit, t, f)}
        </Stat>
        <Stat label={t.statHeight} id="layers">
          {stats && t.layers(stats.layers, f.fine.format(layerHeight))}
        </Stat>
        <Stat label={t.statVolume} id="volume">
          {volume != null && `${f.volumes.format(volume / 1000)} cm³`}
        </Stat>
        <Stat label={t.statScrews} id="screws">
          {stats && (stats.screws === 0 ? t.none : String(stats.screws))}
        </Stat>
        <Stat label={t.statMagnets} id="magnets">
          {stats && (stats.magnets === 0 ? t.noMagnet : t.magnetCount(String(stats.magnets)))}
        </Stat>
        <Stat label={t.statPieces} id="pieces">
          {stats && String(stats.pieces)}
        </Stat>
        <Stat label={t.statClips} id="clips">
          {stats && (stats.clips === 0 ? t.noClip : String(stats.clips))}
        </Stat>
        <Stat label={t.buildPlate} id="fit">
          {fits !== null && (
            <span className={fits ? undefined : "font-semibold text-accent-strong"}>{fits ? t.fits : t.doesNotFit}</span>
          )}
        </Stat>
      </dl>
      {fits === false && <Warning>{t.plateTooSmall(f.footprint(buildPlate))}</Warning>}
      {narrowest !== null && <Warning>{t.narrowMargin(f.fine.format(narrowest), f.fine.format(2 * lineWidth))}</Warning>}
      {advancedChanged && <Warning>{t.advancedWarning}</Warning>}
      {clickbase && <Warning>{t.clickbaseWarning}</Warning>}
    </section>
  );
}

/** A non-blocking warning under the statistics. */
function Warning({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mx-3 mb-3 flex gap-2 rounded-ctl bg-accent-tint px-3 py-2.5 text-[12.5px] leading-snug text-ink-soft">
      <TriangleAlert className="mt-px size-4 shrink-0 text-accent-strong" aria-hidden />
      {children}
    </p>
  );
}

/** The margin on each side, in the unit of the drawer. */
function marginText(margins: Margins, unit: Unit, t: Strings, f: Formats): string {
  const { left, right, back, front } = margins;
  if (left === 0 && right === 0 && back === 0 && front === 0) return t.none;
  const length = (mm: number) => f.length(mm, unit);
  return t.margins(length(left), length(right), length(back), length(front), unit);
}

/** One statistic; "…" while its value is being computed. */
function Stat({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  const t = useStrings();
  const pending = children === null || children === undefined || children === false || children === "";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-[5px] last:border-b-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink tabular-nums" data-testid={`stat-${id}`} aria-busy={pending || undefined}>
        {pending ? (
          <>
            <span aria-hidden>…</span>
            <span className="sr-only">{t.computing}</span>
          </>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}
