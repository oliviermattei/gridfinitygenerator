"use client";

import { BIN_SETTINGS, MAX_COMPARTMENTS_PER_CELL, STACKING_LIPS, type Bin, type BinSettings, type StackingLip } from "@repo/geometry";
import { NumberStepper, Segmented, ToggleSwitch } from "@repo/ui";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { Formats } from "@/lib/format";
import { useFormats, useStrings } from "@/lib/locale";
import type { Strings } from "@/lib/strings";
import { AdvancedIcon, CompartmentIcon, FinishIcon, LipIcon, SizeIcon } from "./illustrations";
import { FamilyItem } from "./settings-panel";

/** A bin without its mesh: what the panel reads. */
export type BinSummary = Omit<Bin, "mesh">;

/** Families of settings of the bin panel. */
export type BinFamily = "size" | "compartments" | "finish" | "lip" | "advanced";

/** "83,5 × 41,5 mm", measured on the mesh. */
function footprint(summary: BinSummary, f: Formats): string {
  return f.footprint(summary.stats.dimensions);
}

/**
 * Dimensions at the head of the panel: footprint, cells and U, and the height of the bin
 * shown, "…" until its first computation answers.
 */
export function BinReadout({ summary, settings, live = false }: { summary: BinSummary | null; settings: BinSettings; live?: boolean }) {
  const t = useStrings();
  const f = useFormats();
  return (
    <div className="px-5 pt-5 pb-4" aria-live={live ? "polite" : undefined}>
      <p className="flex items-baseline gap-1.5 text-[28px] leading-tight font-semibold tracking-[-0.04em] tabular-nums">
        <span className="sr-only">{t.dimensionsPrefix}</span>
        <span data-testid="dimensions">{summary ? footprint(summary, f) : "…"}</span>
      </p>
      <p className="mt-1 text-[12.5px] text-muted tabular-nums">
        <span data-testid="cells">{t.bin.cells(settings.columns, settings.rows, settings.units)}</span>
        {summary && (
          <>
            , {t.height} <span data-testid="height">{f.fine.format(summary.stats.dimensions.height)} mm</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Short lines above the dock's buttons (mobile), with a warning when the bin does not fit on the build plate. */
export function BinDockReadout({ summary, settings, fits }: { summary: BinSummary | null; settings: BinSettings; fits: boolean }) {
  const t = useStrings();
  const f = useFormats();
  return (
    <div className="px-2.5 pt-1.5 pb-2.5" aria-live="polite">
      <p className="text-[18px] font-semibold tracking-[-0.03em] tabular-nums" data-testid="dimensions">
        {summary ? footprint(summary, f) : "…"}
      </p>
      <p className="truncate text-[12px] text-muted tabular-nums" data-testid="cells">
        {t.bin.cells(settings.columns, settings.rows, settings.units)}
      </p>
      {!fits && (
        <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-accent-strong">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {t.bin.tooBigShort}
        </p>
      )}
    </div>
  );
}

export interface BinFamiliesProps {
  settings: BinSettings;
  onSettingsChange: (patch: Partial<BinSettings>) => void;
  summary: BinSummary | null;
  /** The most cells each way the build plate takes, along its short and long sides. */
  maxCells: { short: number; long: number };
  open: BinFamily | null;
  onOpenChange: (family: BinFamily | null) => void;
}

/** "Congé, pelle", or "Aucune": the finishes that are on. */
function finishSummary(settings: BinSettings, t: Strings): string {
  const on = [settings.fillet && t.bin.fillet, settings.scoop && t.bin.scoop, settings.labelTab && t.bin.labelTab].filter(Boolean) as string[];
  if (on.length === 0) return t.bin.finishNone;
  return capitalized(on.join(", ").toLowerCase());
}

/** Families of settings of the bin, as an exclusive accordion. */
export function BinFamilies({ settings, onSettingsChange, summary, maxCells, open, onOpenChange }: BinFamiliesProps) {
  const t = useStrings();
  const f = useFormats();
  const bind = (family: BinFamily) => ({
    open: open === family,
    onOpenChange: (isOpen: boolean) => onOpenChange(isOpen ? family : null),
  });
  // A side may take the long side of the plate while the other stays within its short side.
  const maxColumns = settings.rows > maxCells.short ? maxCells.short : maxCells.long;
  const maxRows = settings.columns > maxCells.short ? maxCells.short : maxCells.long;
  const stepper = (
    key: "columns" | "rows" | "units" | "compartmentColumns" | "compartmentRows",
    label: string,
    decrementLabel: string,
    incrementLabel: string,
    max: number,
    unit = "×",
  ) => (
    <NumberStepper
      label={label}
      decrementLabel={decrementLabel}
      incrementLabel={incrementLabel}
      value={settings[key]}
      min={BIN_SETTINGS[key].min}
      max={Math.max(settings[key], max)}
      step={1}
      unit={unit}
      locale={t.locale}
      onChange={(value) => onSettingsChange({ [key]: Math.min(value, Math.max(max, BIN_SETTINGS[key].min)) })}
    />
  );
  const compartment = summary?.stats.compartment;
  const compartmentSize = compartment ? `${f.lengths.format(compartment.width)} × ${f.lengths.format(compartment.depth)} mm` : "…";
  return (
    <div className="flex flex-col gap-1">
      <FamilyItem
        {...bind("size")}
        icon={<SizeIcon className="size-[18px]" />}
        title={t.size}
        summary={`${summary ? `${footprint(summary, f)}, ` : ""}${t.bin.cells(settings.columns, settings.rows, settings.units)}`}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            {stepper("columns", t.bin.width, t.bin.fewerColumns, t.bin.moreColumns, maxColumns)}
            {stepper("rows", t.bin.depth, t.bin.fewerRows, t.bin.moreRows, maxRows)}
          </div>
          {stepper("units", t.bin.units, t.bin.fewerUnits, t.bin.moreUnits, BIN_SETTINGS.units.max, "U")}
          <p className="text-[12px] leading-snug text-muted">{t.bin.sizeHint}</p>
          <p className="text-[12px] leading-snug text-muted" data-testid="plate-limit">
            {t.bin.plateLimit(maxCells.short, maxCells.long)}
          </p>
        </div>
      </FamilyItem>
      <FamilyItem
        {...bind("compartments")}
        icon={<CompartmentIcon className="size-[18px]" />}
        title={t.bin.compartments}
        summary={t.bin.compartmentsSummary(settings.compartmentColumns * settings.compartmentRows, compartmentSize)}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            {stepper(
              "compartmentColumns",
              t.bin.compartmentColumns,
              t.bin.fewerCompartmentColumns,
              t.bin.moreCompartmentColumns,
              settings.columns * MAX_COMPARTMENTS_PER_CELL,
            )}
            {stepper("compartmentRows", t.bin.compartmentRows, t.bin.fewerCompartmentRows, t.bin.moreCompartmentRows, settings.rows * MAX_COMPARTMENTS_PER_CELL)}
          </div>
          <p className="text-[12px] leading-snug text-muted">{t.bin.compartmentsHint}</p>
        </div>
      </FamilyItem>
      <FamilyItem {...bind("finish")} icon={<FinishIcon className="size-[18px]" />} title={t.bin.finish} summary={finishSummary(settings, t)}>
        <div className="flex flex-col gap-3.5">
          <Toggle label={t.bin.fillet} hint={t.bin.filletHint} checked={settings.fillet} onChange={(fillet) => onSettingsChange({ fillet })} />
          <Toggle label={t.bin.scoop} hint={t.bin.scoopHint} checked={settings.scoop} onChange={(scoop) => onSettingsChange({ scoop })} />
          <Toggle label={t.bin.labelTab} hint={t.bin.labelTabHint} checked={settings.labelTab} onChange={(labelTab) => onSettingsChange({ labelTab })} />
        </div>
      </FamilyItem>
      <FamilyItem {...bind("lip")} icon={<LipIcon className="size-[18px]" />} title={t.bin.lip} summary={t.bin.lips[settings.lip]}>
        <div className="flex flex-col gap-2.5">
          <Segmented<StackingLip>
            label={t.bin.lip}
            value={settings.lip}
            onChange={(lip) => onSettingsChange({ lip })}
            options={STACKING_LIPS.map((lip) => ({ value: lip, label: t.bin.lips[lip] }))}
          />
          <p className="text-[12px] leading-snug text-muted">{t.bin.lipHints[settings.lip]}</p>
        </div>
      </FamilyItem>
      <FamilyItem
        {...bind("advanced")}
        icon={<AdvancedIcon className="size-[18px]" />}
        title={t.advanced}
        summary={settings.cellSize === BIN_SETTINGS.cellSize.default ? t.advancedDefaults : capitalized(t.advancedChanges.cellSize(f.fine.format(settings.cellSize)))}
      >
        <div className="flex flex-col gap-2">
          <NumberStepper
            label={t.cellSize}
            decrementLabel={`${t.cellSize} −`}
            incrementLabel={`${t.cellSize} +`}
            value={settings.cellSize}
            min={BIN_SETTINGS.cellSize.min}
            max={BIN_SETTINGS.cellSize.max}
            step={0.5}
            unit="mm"
            locale={t.locale}
            fractionDigits={2}
            onChange={(cellSize) => onSettingsChange({ cellSize })}
          />
          <p className="text-[12px] leading-snug text-muted">{t.bin.cellSizeHint}</p>
        </div>
      </FamilyItem>
    </div>
  );
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A finish that is on or off, with what it does. */
function Toggle({ label, hint, checked, onChange }: { label: string; hint: ReactNode; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">{label}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">{hint}</p>
      </div>
      <ToggleSwitch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}
