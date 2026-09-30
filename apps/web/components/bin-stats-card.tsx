"use client";

import type { BuildPlate } from "@repo/geometry";
import { TriangleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useFormats, useStrings } from "@/lib/locale";
import type { BinSummary } from "./bin-panel";

export interface BinStatsCardProps {
  /** The bin shown, null until its first computation answers. */
  summary: BinSummary | null;
  layerHeight: number;
  /** Whether the summary comes from the final mesh of the current settings (its volumes are then shown). */
  final: boolean;
  buildPlate: BuildPlate;
  /** Whether the bin of the settings fits on the build plate. */
  fits: boolean;
  /** Whether the cell size differs from the standard. */
  advancedChanged: boolean;
  className?: string;
}

/**
 * Statistics of the bin, real numbers only: measured on the mesh or computed exactly on the
 * solids, never estimated. The volumes come from the final mesh, "…" until it answers.
 */
export function BinStatsCard({ summary, layerHeight, final, buildPlate, fits, advancedChanged, className = "" }: BinStatsCardProps) {
  const t = useStrings();
  const f = useFormats();
  const stats = summary?.stats;
  const titleId = useId();
  const cm3 = (mm3: number | null | undefined) => (mm3 != null ? `${f.volumes.format(mm3 / 1000)} cm³` : null);
  return (
    <section aria-labelledby={titleId} className={className}>
      <h2 id={titleId} className="px-4 pt-3.5 pb-1 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        {t.statistics}
      </h2>
      <dl className="px-4 pb-3 text-[13px]">
        <Stat label={t.dimensions} id="dimensions">
          {stats && `${f.lengths.format(stats.dimensions.width)} × ${f.lengths.format(stats.dimensions.depth)} × ${f.fine.format(stats.dimensions.height)} mm`}
        </Stat>
        <Stat label={t.bin.statHeight} id="height">
          {stats &&
            (stats.heightWithoutLip === stats.dimensions.height
              ? `${f.fine.format(stats.dimensions.height)} mm`
              : t.bin.heightWithLip(f.fine.format(stats.dimensions.height), f.fine.format(stats.heightWithoutLip)))}
        </Stat>
        <Stat label={t.bin.statCompartments} id="compartments">
          {stats && String(stats.compartments)}
        </Stat>
        <Stat label={t.bin.statCompartment} id="compartment">
          {stats &&
            `${f.lengths.format(stats.compartment.width)} × ${f.lengths.format(stats.compartment.depth)} × ${f.lengths.format(stats.compartment.height)} mm`}
        </Stat>
        <Stat label={t.bin.statUseful} id="useful">
          {final && cm3(stats?.usefulVolume)}
        </Stat>
        <Stat label={t.statVolume} id="volume">
          {final && cm3(stats?.volume)}
        </Stat>
        <Stat label={t.bin.statLayers} id="layers">
          {stats && t.layers(stats.layers, f.fine.format(layerHeight))}
        </Stat>
        <Stat label={t.buildPlate} id="fit">
          <span className={fits ? undefined : "font-semibold text-accent-strong"}>{fits ? t.fits : t.doesNotFit}</span>
        </Stat>
      </dl>
      {!fits && <Warning>{t.bin.tooBig(f.footprint(buildPlate))}</Warning>}
      {advancedChanged && <Warning>{t.bin.advancedWarning}</Warning>}
    </section>
  );
}

/** A warning under the statistics. */
function Warning({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mx-3 mb-3 flex gap-2 rounded-ctl bg-accent-tint px-3 py-2.5 text-[12.5px] leading-snug text-ink-soft">
      <TriangleAlert className="mt-px size-4 shrink-0 text-accent-strong" aria-hidden />
      {children}
    </p>
  );
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
