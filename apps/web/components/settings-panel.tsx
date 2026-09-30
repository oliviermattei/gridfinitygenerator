"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import {
  BASEPLATE_SETTINGS,
  BASEPLATE_TYPES,
  MARGIN_SHAPES,
  POCKET_PROFILES,
  changedAdvancedSettings,
  clickbaseOf,
  skeletonOf,
  stackPlanOf,
  stackRuleOf,
  trayFloorOf,
  type BaseplateSettings,
  type BaseplateType,
  type MarginShape,
  type PocketProfileName,
  type SizeMode,
} from "@repo/geometry";
import { ChoiceGroup, NumberStepper, Segmented, SliderField, ToggleSwitch, focusRing } from "@repo/ui";
import { ChevronDown, Download, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { BaseplateSummary } from "@/lib/engine/protocol";
import type { Formats } from "@/lib/format";
import { gramsText, massOf, type FilamentPreference, type Material } from "@/lib/mass";
import type { StackPreference } from "@/lib/preferences";
import { useFormats, useStrings } from "@/lib/locale";
import type { Strings } from "@/lib/strings";
import { LENGTH_DECIMALS, LENGTH_STEP, fromMillimetres, toMillimetres, type Unit } from "@/lib/units";
import { AlignmentPad } from "./alignment-pad";
import {
  AdvancedIcon,
  AlignIcon,
  MarginArt,
  MarginIcon,
  ProfileArt,
  ProfileIcon,
  ScrewArt,
  ScrewIcon,
  SizeIcon,
  StackIcon,
  TestKitArt,
  TypeArt,
  TypeIcon,
} from "./illustrations";

/**
 * Families of settings in the panel. The print settings (layer height, line width) live in
 * the gear menu.
 */
export type Family = "size" | "type" | "alignment" | "margin" | "profile" | "screws" | "stack" | "advanced";

/** "Valeurs par défaut", or the advanced settings changed: "Cellule 30 mm, chanfrein 0,6 mm". */
function advancedSummary(settings: BaseplateSettings, t: Strings, f: Formats): string {
  const changes = changedAdvancedSettings(settings).map((key) => t.advancedChanges[key](f.fine.format(settings[key])));
  if (changes.length === 0) return t.advancedDefaults;
  const text = changes.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Drops the floating-point noise of a stepped length (0.5 + 0.1 = 0.6000000000000001). */
const toHundredths = (value: number) => Math.round(value * 100) / 100;

/** "168 × 126 mm", measured on the mesh. */
function footprint(summary: BaseplateSummary, f: Formats): string {
  return f.footprint(summary.stats.dimensions);
}

function cellCount(summary: BaseplateSummary, t: Strings): string {
  return t.cells(summary.layout.columns, summary.layout.rows);
}

/**
 * "9 × 6 cellules, marge 21 × 27 mm": what the size settings give, as laid out by the
 * engine, with the margin in the unit of the drawer.
 */
function sizeResult(summary: BaseplateSummary, unit: Unit, t: Strings, f: Formats): string {
  const { left, right, back, front } = summary.layout.margins;
  const width = left + right;
  const depth = back + front;
  const margin = width === 0 && depth === 0 ? t.withoutMargin : t.withMargin(f.length(width, unit), f.length(depth, unit), unit);
  return `${cellCount(summary, t)}, ${margin}`;
}

/**
 * Dimensions at the head of the panel: footprint, cells and height of the baseplate
 * shown, "…" until its first computation answers.
 */
export function Readout({ summary, live = false }: { summary: BaseplateSummary | null; live?: boolean }) {
  const t = useStrings();
  const f = useFormats();
  return (
    <div className="px-5 pt-5 pb-4" aria-live={live ? "polite" : undefined}>
      <p className="flex items-baseline gap-1.5 text-[28px] leading-tight font-semibold tracking-[-0.04em] tabular-nums">
        <span className="sr-only">{t.dimensionsPrefix}</span>
        <span data-testid="dimensions">{summary ? footprint(summary, f) : "…"}</span>
      </p>
      <p className="mt-1 text-[12.5px] text-muted tabular-nums">
        <span data-testid="cells">{summary ? cellCount(summary, t) : "…"}</span>
        {summary && (
          <>
            , {t.height} <span data-testid="height">{f.fine.format(summary.stats.dimensions.height)} mm</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Short lines above the dock's buttons (mobile), with a warning when the build plate is too small. */
export function DockReadout({ summary, fits }: { summary: BaseplateSummary | null; fits: boolean | null }) {
  const t = useStrings();
  const f = useFormats();
  return (
    <div className="px-2.5 pt-1.5 pb-2.5" aria-live="polite">
      <p className="text-[18px] font-semibold tracking-[-0.03em] tabular-nums" data-testid="dimensions">
        {summary ? footprint(summary, f) : "…"}
      </p>
      <p className="truncate text-[12px] text-muted tabular-nums" data-testid="cells">
        {summary ? cellCount(summary, t) : "…"}
      </p>
      {fits === false && (
        <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-accent-strong">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {t.plateTooSmallShort}
        </p>
      )}
    </div>
  );
}

export interface FamiliesProps {
  settings: BaseplateSettings;
  onSettingsChange: (patch: Partial<BaseplateSettings>) => void;
  /** Unit of the drawer and the margins, typed and read. */
  unit: Unit;
  summary: BaseplateSummary | null;
  /** The only open family (exclusive accordion), or null when all are closed. */
  open: Family | null;
  onOpenChange: (family: Family | null) => void;
  /** Downloads the test kit, one cell of each pocket profile. */
  onDownloadTestKit: () => void;
  /** Whether the test kit is being prepared. */
  exportingTestKit: boolean;
  /** Whether a download is being prepared: every download waits for it. */
  downloadBusy: boolean;
  /**
   * Material each shape of margin adds, the other settings as they are (the minimal margin
   * included), in mm³: the volume of the baseplate with it less that of its grid alone, both
   * measured on final meshes (#29); missing while they are being measured.
   */
  marginSurpluses: Partial<Record<MarginShape, Material>>;
  /**
   * Material of the baseplate of each type, the other settings as they are, in mm³, measured on
   * the final mesh; missing while it is being measured.
   */
  typeVolumes: Partial<Record<BaseplateType, Material>>;
  /** Filament of the prints (a preference): the mass of each shape of margin and of each type (#31). */
  filament: FilamentPreference;
  /** Stacked print of the pieces (#28): a preference of this browser, not a setting. */
  stack: StackPreference;
  onStackChange: (patch: Partial<StackPreference>) => void;
}

/** Families of settings as an exclusive accordion: opening one closes the others. */
export function Families({
  settings,
  onSettingsChange,
  unit,
  summary,
  open,
  onOpenChange,
  onDownloadTestKit,
  exportingTestKit,
  downloadBusy,
  marginSurpluses,
  typeVolumes,
  filament,
  stack,
  onStackChange,
}: FamiliesProps) {
  const t = useStrings();
  const f = useFormats();
  const bind = (family: Family) => ({
    open: open === family,
    onOpenChange: (isOpen: boolean) => onOpenChange(isOpen ? family : null),
  });
  return (
    <div className="flex flex-col gap-1">
      <FamilyItem
        {...bind("size")}
        icon={<SizeIcon className="size-[18px]" />}
        title={t.size}
        summary={summary ? `${footprint(summary, f)}, ${cellCount(summary, t)}` : "…"}
      >
        <SizeFields settings={settings} onSettingsChange={onSettingsChange} unit={unit} />
        <p className="mt-3 text-[12.5px] text-muted tabular-nums" data-testid="size-result">
          {summary ? sizeResult(summary, unit, t, f) : "…"}
        </p>
      </FamilyItem>
      <FamilyItem
        {...bind("type")}
        icon={<TypeIcon className="size-[18px]" />}
        title={t.baseplateType}
        summary={t.baseplateTypeNames[settings.baseplateType]}
      >
        <TypeFields settings={settings} onSettingsChange={onSettingsChange} volumes={typeVolumes} filament={filament} />
      </FamilyItem>
      {hasMargin(summary) && (
        <FamilyItem
          {...bind("alignment")}
          icon={<AlignIcon className="size-[18px]" />}
          title={t.alignment}
          summary={t.alignments[settings.alignment]}
        >
          <AlignmentPad value={settings.alignment} onChange={(alignment) => onSettingsChange({ alignment })} />
        </FamilyItem>
      )}
      <FamilyItem
        {...bind("margin")}
        icon={<MarginIcon className="size-[18px]" />}
        title={t.margin}
        summary={`${t.marginShapeNames[settings.marginShape]}${settings.minimalMargin ? t.minimalMarginShort : ""}`}
      >
        <MarginFields settings={settings} onSettingsChange={onSettingsChange} summary={summary} surpluses={marginSurpluses} filament={filament} />
      </FamilyItem>
      <FamilyItem
        {...bind("profile")}
        icon={<ProfileIcon className="size-[18px]" />}
        title={t.pocketProfile}
        summary={settings.pocketProfile === "flush" ? t.flush : t.hybrid}
      >
        <ChoiceGroup<PocketProfileName>
          label={t.pocketProfile}
          value={settings.pocketProfile}
          onChange={(pocketProfile) => onSettingsChange({ pocketProfile })}
          options={[
            {
              value: "hybrid",
              label: t.hybrid,
              badge: t.recommended,
              description: t.hybridDescription,
              art: <ProfileArt kind="hybrid" className="h-auto w-full max-w-[128px]" />,
            },
            {
              value: "flush",
              label: t.flush,
              description: t.flushDescription,
              art: <ProfileArt kind="flush" className="h-auto w-full max-w-[128px]" />,
            },
          ]}
        />
        <TestKit
          cellSize={settings.cellSize}
          onDownload={onDownloadTestKit}
          exporting={exportingTestKit}
          disabled={downloadBusy}
        />
      </FamilyItem>
      <FamilyItem
        {...bind("screws")}
        icon={<ScrewIcon className="size-[18px]" />}
        title={t.screws}
        summary={settings.screws ? screwsSummary(settings, summary, t, f) : t.screwsOff}
        on={settings.screws}
        control={
          <ToggleSwitch
            label={t.screws}
            checked={settings.screws}
            onChange={(screws) => {
              onSettingsChange({ screws });
              // Turning the screws on opens their family: what they offer is in sight at once.
              if (screws) onOpenChange("screws");
            }}
          />
        }
      >
        <ScrewFields settings={settings} onSettingsChange={onSettingsChange} />
      </FamilyItem>
      {summary && summary.stats.pieces > 1 && (
        <StackFamily
          {...bind("stack")}
          settings={settings}
          onSettingsChange={onSettingsChange}
          summary={summary}
          stack={stack}
          onStackChange={onStackChange}
        />
      )}
      <FamilyItem
        {...bind("advanced")}
        icon={<AdvancedIcon className="size-[18px]" />}
        title={t.advanced}
        summary={advancedSummary(settings, t, f)}
      >
        <AdvancedFields settings={settings} onSettingsChange={onSettingsChange} />
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <NumberStepper
            label={t.drawerGap}
            decrementLabel={t.lessGap}
            incrementLabel={t.moreGap}
            value={settings.drawerGap}
            min={BASEPLATE_SETTINGS.drawerGap.min}
            max={BASEPLATE_SETTINGS.drawerGap.max}
            step={0.5}
            unit="mm"
            locale={t.locale}
            onChange={(drawerGap) => onSettingsChange({ drawerGap: toHundredths(drawerGap) })}
          />
          <NumberStepper
            label={t.holeGap}
            decrementLabel={t.lessHoleGap}
            incrementLabel={t.moreHoleGap}
            value={settings.holeGap}
            min={BASEPLATE_SETTINGS.holeGap.min}
            max={BASEPLATE_SETTINGS.holeGap.max}
            step={0.1}
            unit="mm"
            locale={t.locale}
            onChange={(holeGap) => onSettingsChange({ holeGap: toHundredths(holeGap) })}
          />
        </div>
        <p className="mt-2 text-[12px] leading-snug text-muted">{t.drawerGapHint}</p>
        <p className="mt-1 text-[12px] leading-snug text-muted">{t.holeGapHint}</p>
      </FamilyItem>
    </div>
  );
}

/**
 * The shape of the margin, each with the material it adds to the grid alone, measured on the
 * final meshes ("…" while it is), and its mass in the filament chosen (#31), what the chosen
 * one is, and the minimal margin (#29), which applies to every shape. Without a margin, the
 * shape changes nothing, and no volume is shown.
 */
function MarginFields({
  settings,
  onSettingsChange,
  summary,
  surpluses,
  filament,
}: FieldsProps & { summary: BaseplateSummary | null; surpluses: Partial<Record<MarginShape, Material>>; filament: FilamentPreference }) {
  const t = useStrings();
  const f = useFormats();
  const withMargin = hasMargin(summary);
  const surplus = (shape: MarginShape) => {
    const measured = surpluses[shape];
    if (measured === undefined) return "…";
    const volume = f.volumes.format(Math.abs(measured.volume) / 1000);
    const grams = gramsText(massOf(measured, filament).total, f.grams, t.belowOneGram);
    return measured.volume < 0 ? t.marginSaving(volume, grams) : t.marginSurplus(volume, grams);
  };
  return (
    <>
      <ChoiceGroup<MarginShape>
        label={t.margin}
        value={settings.marginShape}
        onChange={(marginShape) => onSettingsChange({ marginShape })}
        columns={3}
        options={MARGIN_SHAPES.map((shape) => ({
          value: shape,
          label: t.marginShapes[shape],
          description: withMargin ? surplus(shape) : undefined,
          art: <MarginArt kind={shape} className="h-auto w-full max-w-[64px]" />,
        }))}
      />
      <p className="mt-3 text-[12.5px] leading-snug text-muted">{withMargin ? t.marginShapeHints[settings.marginShape] : t.noMarginHint}</p>
      <div className="mt-3">
        <SwitchOption
          label={t.minimalMargin}
          hint={t.minimalMarginHint}
          checked={settings.minimalMargin}
          onChange={(minimalMargin) => onSettingsChange({ minimalMargin })}
        />
      </div>
      {withMargin && <p className="mt-2 text-[12px] leading-snug text-muted">{t.marginVolumesHint}</p>}
    </>
  );
}

/**
 * The type of baseplate, each with the volume of the baseplate it gives, measured on its
 * final mesh ("…" while it is), and its mass in the filament chosen, clips included (#31), and
 * what the chosen one is.
 */
function TypeFields({
  settings,
  onSettingsChange,
  volumes,
  filament,
}: FieldsProps & { volumes: Partial<Record<BaseplateType, Material>>; filament: FilamentPreference }) {
  const t = useStrings();
  const f = useFormats();
  const volume = (type: BaseplateType) => {
    const measured = volumes[type];
    if (measured === undefined) return "…";
    const mass = t.mass(gramsText(massOf(measured, filament).total, f.grams, t.belowOneGram));
    return t.typeMaterial(f.volumes.format(measured.volume / 1000), mass);
  };
  const floor = trayFloorOf(settings.layerHeight);
  const { grip } = clickbaseOf(settings.cellSize, POCKET_PROFILES[settings.pocketProfile], settings.layerHeight);
  const hints: Record<BaseplateType, string> = {
    normal: t.normalHint,
    tray: t.trayHint(f.fine.format(floor.thickness), f.fine.format(floor.gap)),
    skeleton: t.skeletonHint(f.fine.format(skeletonOf(settings.layerHeight).band)),
    clickbase: t.clickbaseHint(f.fine.format(grip)),
  };
  return (
    <>
      <ChoiceGroup<BaseplateType>
        label={t.baseplateType}
        value={settings.baseplateType}
        onChange={(baseplateType) => onSettingsChange({ baseplateType })}
        columns={2}
        options={BASEPLATE_TYPES.map((type) => ({
          value: type,
          label: t.baseplateTypes[type],
          description: volume(type),
          art: <TypeArt kind={type} className="h-auto w-full max-w-[128px]" />,
        }))}
      />
      <p className="mt-3 text-[12.5px] leading-snug text-muted">
        {hints[settings.baseplateType]}
      </p>
      {settings.baseplateType === "clickbase" && (
        <p className="mt-2 flex gap-2 rounded-ctl bg-accent-tint px-3 py-2.5 text-[12.5px] leading-snug text-ink-soft" data-testid="clickbase-warning">
          <TriangleAlert className="mt-px size-4 shrink-0 text-accent-strong" aria-hidden />
          {t.clickbaseWarning}
        </p>
      )}
      <p className="mt-1 text-[12px] leading-snug text-muted">{t.typeVolumesHint}</p>
    </>
  );
}

/**
 * The cell size, the outer corner radius and the bottom chamfer. Their warning, that bins
 * may no longer fit, shows with the statistics as long as one of the family is changed.
 */
function AdvancedFields({ settings, onSettingsChange }: FieldsProps) {
  const t = useStrings();
  const field = (key: "cellSize" | "outerRadius" | "bottomChamfer", step: number) => ({
    value: settings[key],
    min: BASEPLATE_SETTINGS[key].min,
    max: BASEPLATE_SETTINGS[key].max,
    step,
    unit: "mm",
    locale: t.locale,
    onChange: (value: number) => onSettingsChange({ [key]: toHundredths(value) }),
  });
  return (
    <div className="flex flex-col gap-4">
      <SliderField label={t.cellSize} hint={t.cellSizeHint} {...field("cellSize", 1)} />
      <SliderField label={t.outerRadius} hint={t.outerRadiusHint} {...field("outerRadius", 0.5)} />
      <SliderField label={t.bottomChamfer} hint={t.bottomChamferHint} {...field("bottomChamfer", 0.1)} />
    </div>
  );
}

/**
 * The test kit, under the two profiles it compares: a 1 × 2 baseplate with one cell of
 * each, to print before a large baseplate. Always a single 3MF, with the cells of the
 * cell size.
 */
function TestKit({
  cellSize,
  onDownload,
  exporting,
  disabled,
}: {
  cellSize: number;
  onDownload: () => void;
  exporting: boolean;
  disabled: boolean;
}) {
  const t = useStrings();
  const f = useFormats();
  return (
    <div className="mt-3 flex items-start gap-3 rounded-card border border-line bg-surface p-3">
      <span className="grid h-10 w-13 shrink-0 place-items-center rounded-ctl bg-sunken text-muted [--art:var(--accent)]">
        <TestKitArt className="h-9 w-12" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold">{t.testKit}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          {t.testKitHint(f.footprint({ width: cellSize, depth: 2 * cellSize }))}
        </p>
        <button
          type="button"
          onClick={onDownload}
          disabled={disabled}
          className={`mt-2.5 flex h-10 items-center gap-2 rounded-ctl border border-line-strong bg-surface px-3 text-[13px] font-semibold transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
        >
          <Download className="size-4 shrink-0" aria-hidden />
          {exporting ? t.preparingTestKit : t.downloadTestKit}
        </button>
      </div>
    </div>
  );
}

/** "40 vis, tige 3 mm, tête 6 mm": the count as laid out by the engine, "…" until it answers. */
function screwsSummary(settings: BaseplateSettings, summary: BaseplateSummary | null, t: Strings, f: Formats): string {
  const count = summary ? String(summary.stats.screws) : "…";
  return t.screwsSummary(count, f.fine.format(settings.screwShank), f.fine.format(settings.screwHead));
}

/**
 * Whether the baseplate, as last laid out, has a margin on any side: the alignment only places
 * the grid in what the margin leaves (#30). Shown until the engine first answers.
 */
function hasMargin(summary: BaseplateSummary | null): boolean {
  if (!summary) return true;
  const { left, right, back, front } = summary.layout.margins;
  return left > 0 || right > 0 || back > 0 || front > 0;
}

/**
 * Stacked print of the pieces of a cut baseplate (#28, ADR 0016), shown only with several
 * pieces: the switch, its stacks as the engine lays them out from the pieces, what to know
 * before printing, and the ears and pins. The switch is off, and says why, when the
 * baseplate cannot be stacked. A preference of this browser, not a setting of the baseplate.
 */
function StackFamily({
  settings,
  onSettingsChange,
  summary,
  stack,
  onStackChange,
  open,
  onOpenChange,
}: FieldsProps & {
  summary: BaseplateSummary;
  stack: StackPreference;
  onStackChange: (patch: Partial<StackPreference>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useStrings();
  const f = useFormats();
  const { blockers, warnings } = stackRuleOf(settings, summary.layout);
  const [blocker] = blockers;
  const height = summary.stats.dimensions.height;
  const plan = stackPlanOf(summary.layout, height, settings.layerHeight);
  const on = stack.on && !blocker;
  const summaryText = blocker ? t.stackBlockedShort[blocker] : on ? t.stackSummary(summary.stats.pieces, plan.stacks.length) : t.stackOff;
  const warning = (text: string, key: string) => (
    <p key={key} className="mt-2 flex gap-2 rounded-ctl bg-accent-tint px-3 py-2.5 text-[12.5px] leading-snug text-ink-soft" data-testid={`stack-warning-${key}`}>
      <TriangleAlert className="mt-px size-4 shrink-0 text-accent-strong" aria-hidden />
      {text}
    </p>
  );
  return (
    <FamilyItem
      open={open}
      onOpenChange={onOpenChange}
      icon={<StackIcon className="size-[18px]" />}
      title={t.stack}
      summary={summaryText}
      on={on}
      control={
        <ToggleSwitch
          label={t.stack}
          checked={on}
          disabled={Boolean(blocker)}
          onChange={(checked) => {
            onStackChange({ on: checked });
            // Turning the stack on opens its family: its stacks and options are in sight at once.
            if (checked) onOpenChange(true);
          }}
        />
      }
    >
      {blocker ? (
        <>
          <p className="text-[12.5px] leading-snug text-muted">{t.stackBlocked[blocker]}</p>
          {blocker === "low-margin" && (
            <button
              type="button"
              onClick={() => onSettingsChange({ marginShape: "cells" })}
              className={`mt-2.5 flex h-10 items-center rounded-ctl border border-line-strong bg-surface px-3 text-[13px] font-semibold transition-colors hover:bg-sunken ${focusRing}`}
            >
              {t.stackUseCells}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-[12.5px] leading-snug text-muted">{t.stackHint(f.fine.format(plan.pitch))}</p>
          <ul className="mt-2 flex flex-col gap-0.5 text-[12.5px] text-ink-soft tabular-nums" data-testid="stack-plan">
            {plan.stacks.map((pieces, index) => (
              <li key={index}>
                {t.stackPlan(index + 1, pieces.map(({ number }) => number).join(", "), f.fine.format((pieces.length - 1) * plan.pitch + height))}
              </li>
            ))}
          </ul>
          {plan.stacks.length > 1 && <p className="mt-1 text-[12px] leading-snug text-muted">{t.stackApart}</p>}
          {warnings.map((kind) => (kind === "layer-height" ? warning(t.stackLayerWarning(f.fine.format(settings.layerHeight)), kind) : warning(t.stackSkeletonWarning, kind)))}
          {on && (
            <div className="mt-3 flex flex-col gap-2.5">
              <SwitchOption label={t.stackEars} hint={t.stackEarsHint} checked={stack.ears || stack.pins} disabled={stack.pins} onChange={(ears) => onStackChange({ ears })} />
              <SwitchOption label={t.stackPins} hint={t.stackPinsHint} checked={stack.pins} onChange={(pins) => onStackChange({ pins })} />
            </div>
          )}
          <p className="mt-3 text-[12px] leading-snug text-muted">{t.stackTips}</p>
        </>
      )}
      <p className="mt-1 text-[12px] leading-snug text-muted">{t.stackPreference}</p>
    </FamilyItem>
  );
}

/** An option switched on or off: its switch, its name and what it does. */
function SwitchOption({ label, hint, checked, disabled = false, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="text-[12px] leading-snug text-muted">{hint}</p>
      </div>
      <ToggleSwitch label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/** The diameters of the screws, or what they are for while they are off. */
function ScrewFields({ settings, onSettingsChange }: FieldsProps) {
  const t = useStrings();
  if (!settings.screws) {
    return (
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-13 shrink-0 place-items-center rounded-ctl bg-surface text-faint">
          <ScrewArt className="h-9 w-12" />
        </span>
        <p className="text-[12.5px] leading-snug text-muted">{t.screwsOffHint}</p>
      </div>
    );
  }
  const { screwShank, screwHead } = BASEPLATE_SETTINGS;
  return (
    <div className="flex flex-col gap-4">
      <SliderField
        label={t.screwShank}
        value={settings.screwShank}
        min={screwShank.min}
        max={screwShank.max}
        step={0.1}
        unit="mm"
        locale={t.locale}
        // A head narrower than its shank would not hold: the head follows a wider shank.
        onChange={(value) => {
          const shank = toHundredths(value);
          onSettingsChange({ screwShank: shank, screwHead: Math.max(settings.screwHead, shank) });
        }}
      />
      <SliderField
        label={t.screwHead}
        value={settings.screwHead}
        min={Math.max(screwHead.min, settings.screwShank)}
        max={screwHead.max}
        step={0.1}
        unit="mm"
        locale={t.locale}
        onChange={(value) => onSettingsChange({ screwHead: toHundredths(value) })}
      />
      <p className="text-[12px] leading-snug text-muted">{t.screwsHint}</p>
    </div>
  );
}

interface FieldsProps {
  settings: BaseplateSettings;
  onSettingsChange: (patch: Partial<BaseplateSettings>) => void;
}

type LengthSetting = "drawerWidth" | "drawerDepth" | "marginWidth" | "marginDepth";

/**
 * The size mode, then the drawer, or the cells and their margins. Their lengths are typed and
 * shown in the unit chosen, and kept in millimetres (lib/units.ts).
 */
function SizeFields({ settings, onSettingsChange, unit }: FieldsProps & { unit: Unit }) {
  const t = useStrings();
  const length = (key: LengthSetting) => ({
    value: fromMillimetres(settings[key], unit),
    min: fromMillimetres(BASEPLATE_SETTINGS[key].min, unit),
    max: fromMillimetres(BASEPLATE_SETTINGS[key].max, unit),
    step: LENGTH_STEP[unit],
    unit,
    locale: t.locale,
    fractionDigits: LENGTH_DECIMALS[unit],
    onChange: (value: number) => {
      const mm = toMillimetres(value, unit);
      // The same length once rounded (a field left as it was): nothing changes.
      if (mm !== settings[key]) onSettingsChange({ [key]: mm });
    },
  });
  return (
    <div className="flex flex-col gap-3.5">
      <Segmented<SizeMode>
        label={t.sizeMode}
        value={settings.sizeMode}
        onChange={(sizeMode) => onSettingsChange({ sizeMode })}
        options={[
          { value: "drawer", label: t.sizeDrawer },
          { value: "cells", label: t.sizeCells },
        ]}
      />
      {settings.sizeMode === "drawer" ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2.5">
            <NumberStepper label={t.drawerWidth} decrementLabel={t.narrowerDrawer} incrementLabel={t.widerDrawer} {...length("drawerWidth")} />
            <NumberStepper label={t.drawerDepth} decrementLabel={t.shallowerDrawer} incrementLabel={t.deeperDrawer} {...length("drawerDepth")} />
          </div>
          <p className="text-[12px] leading-snug text-muted">{t.drawerHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <NumberStepper
            label={t.columns}
            decrementLabel={t.fewerColumns}
            incrementLabel={t.moreColumns}
            value={settings.columns}
            min={BASEPLATE_SETTINGS.columns.min}
            max={BASEPLATE_SETTINGS.columns.max}
            step={1}
            unit="×"
            locale={t.locale}
            onChange={(columns) => onSettingsChange({ columns: Math.round(columns) })}
          />
          <NumberStepper
            label={t.rows}
            decrementLabel={t.fewerRows}
            incrementLabel={t.moreRows}
            value={settings.rows}
            min={BASEPLATE_SETTINGS.rows.min}
            max={BASEPLATE_SETTINGS.rows.max}
            step={1}
            unit="×"
            locale={t.locale}
            onChange={(rows) => onSettingsChange({ rows: Math.round(rows) })}
          />
          <NumberStepper label={t.marginWidth} decrementLabel={t.lessMarginWidth} incrementLabel={t.moreMarginWidth} {...length("marginWidth")} />
          <NumberStepper label={t.marginDepth} decrementLabel={t.lessMarginDepth} incrementLabel={t.moreMarginDepth} {...length("marginDepth")} />
        </div>
      )}
    </div>
  );
}

export interface FamilyItemProps {
  icon: ReactNode;
  title: string;
  /** One-line summary, shown whether the family is open or closed. */
  summary: string;
  /** Control beside the header, outside the trigger: the switch of an optional family. */
  control?: ReactNode;
  /** Whether the optional family is on: its icon takes the accent. */
  on?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function FamilyItem({ icon, title, summary, control, on = false, open, onOpenChange, children }: FamilyItemProps) {
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={onOpenChange}
      className={`rounded-2xl transition-colors duration-200 ${open ? "bg-sunken" : "hover:bg-sunken"}`}
    >
      <div className={`flex items-center gap-2 ${control ? "pr-3" : ""}`}>
        <Collapsible.Trigger
          className={`group flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-2.5 pl-2.5 text-left ${control ? "" : "pr-3"} ${focusRing} focus-visible:ring-offset-0`}
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-[11px] transition-colors ${
              on ? "bg-accent text-accent-ink" : "bg-surface text-ink-soft shadow-[0_0_0_1px_var(--color-line)]"
            }`}
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold tracking-[-0.01em]">{title}</span>
            <span className="block truncate text-[12px] text-muted tabular-nums">{summary}</span>
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 text-muted transition-transform duration-200 group-data-panel-open:rotate-180"
          />
        </Collapsible.Trigger>
        {control}
      </div>
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="px-3 pt-1 pb-4">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
