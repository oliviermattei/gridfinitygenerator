"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import {
  BASEPLATE_SETTINGS,
  changedAdvancedSettings,
  type BaseplateSettings,
  type PocketProfileName,
  type SizeMode,
} from "@repo/geometry";
import { ChoiceGroup, NumberStepper, Segmented, SliderField, ToggleSwitch, focusRing } from "@repo/ui";
import { ChevronDown, Download, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { BaseplateSummary } from "@/lib/engine/protocol";
import { fine, footprint as footprintOf, lengths } from "@/lib/format";
import { strings as t } from "@/lib/strings";
import { AlignmentPad } from "./alignment-pad";
import { AdvancedIcon, AlignIcon, ProfileArt, ProfileIcon, ScrewArt, ScrewIcon, SizeIcon, TestKitArt } from "./illustrations";

/**
 * Families of settings in the panel. The print settings (layer height, line width) live in
 * the gear menu.
 */
export type Family = "size" | "alignment" | "profile" | "screws" | "advanced";

/** "Valeurs par défaut", or the advanced settings changed: "Cellule 30 mm, chanfrein 0,6 mm". */
function advancedSummary(settings: BaseplateSettings): string {
  const changes = changedAdvancedSettings(settings).map((key) => t.advancedChanges[key](fine.format(settings[key])));
  if (changes.length === 0) return t.advancedDefaults;
  const text = changes.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Drops the floating-point noise of a stepped length (0.5 + 0.1 = 0.6000000000000001). */
const toHundredths = (value: number) => Math.round(value * 100) / 100;

/** "168 × 126 mm", measured on the mesh. */
function footprint(summary: BaseplateSummary): string {
  return footprintOf(summary.stats.dimensions);
}

function cellCount(summary: BaseplateSummary): string {
  return t.cells(summary.layout.columns, summary.layout.rows);
}

/** "9 × 6 cellules, marge 21 × 27 mm": what the size settings give, as laid out by the engine. */
function sizeResult(summary: BaseplateSummary): string {
  const { left, right, back, front } = summary.layout.margins;
  const width = left + right;
  const depth = back + front;
  const margin = width === 0 && depth === 0 ? t.withoutMargin : t.withMargin(lengths.format(width), lengths.format(depth));
  return `${cellCount(summary)}, ${margin}`;
}

/**
 * Dimensions at the head of the panel: footprint, cells and height of the baseplate
 * shown, "…" until its first computation answers.
 */
export function Readout({ summary, live = false }: { summary: BaseplateSummary | null; live?: boolean }) {
  return (
    <div className="px-5 pt-5 pb-4" aria-live={live ? "polite" : undefined}>
      <p className="flex items-baseline gap-1.5 text-[28px] leading-tight font-semibold tracking-[-0.04em] tabular-nums">
        <span className="sr-only">{t.dimensions} : </span>
        <span data-testid="dimensions">{summary ? footprint(summary) : "…"}</span>
      </p>
      <p className="mt-1 text-[12.5px] text-muted tabular-nums">
        <span data-testid="cells">{summary ? cellCount(summary) : "…"}</span>
        {summary && (
          <>
            , {t.height} <span data-testid="height">{fine.format(summary.stats.dimensions.height)} mm</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Short lines above the dock's buttons (mobile), with a warning when the build plate is too small. */
export function DockReadout({ summary, fits }: { summary: BaseplateSummary | null; fits: boolean | null }) {
  return (
    <div className="px-2.5 pt-1.5 pb-2.5" aria-live="polite">
      <p className="text-[18px] font-semibold tracking-[-0.03em] tabular-nums" data-testid="dimensions">
        {summary ? footprint(summary) : "…"}
      </p>
      <p className="truncate text-[12px] text-muted tabular-nums" data-testid="cells">
        {summary ? cellCount(summary) : "…"}
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
}

/** Families of settings as an exclusive accordion: opening one closes the others. */
export function Families({
  settings,
  onSettingsChange,
  summary,
  open,
  onOpenChange,
  onDownloadTestKit,
  exportingTestKit,
  downloadBusy,
}: FamiliesProps) {
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
        summary={summary ? `${footprint(summary)}, ${cellCount(summary)}` : "…"}
      >
        <SizeFields settings={settings} onSettingsChange={onSettingsChange} />
        <p className="mt-3 text-[12.5px] text-muted tabular-nums" data-testid="size-result">
          {summary ? sizeResult(summary) : "…"}
        </p>
      </FamilyItem>
      <FamilyItem
        {...bind("alignment")}
        icon={<AlignIcon className="size-[18px]" />}
        title={t.alignment}
        summary={t.alignments[settings.alignment]}
      >
        <AlignmentPad value={settings.alignment} onChange={(alignment) => onSettingsChange({ alignment })} />
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
        summary={settings.screws ? screwsSummary(settings, summary) : t.screwsOff}
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
      <FamilyItem
        {...bind("advanced")}
        icon={<AdvancedIcon className="size-[18px]" />}
        title={t.advanced}
        summary={advancedSummary(settings)}
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
 * The cell size, the outer corner radius and the bottom chamfer. Their warning, that bins
 * may no longer fit, shows with the statistics as long as one of the family is changed.
 */
function AdvancedFields({ settings, onSettingsChange }: FieldsProps) {
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
  return (
    <div className="mt-3 flex items-start gap-3 rounded-card border border-line bg-surface p-3">
      <span className="grid h-10 w-13 shrink-0 place-items-center rounded-ctl bg-sunken text-muted [--art:var(--accent)]">
        <TestKitArt className="h-9 w-12" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold">{t.testKit}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          {t.testKitHint(footprintOf({ width: cellSize, depth: 2 * cellSize }))}
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
function screwsSummary(settings: BaseplateSettings, summary: BaseplateSummary | null): string {
  const count = summary ? String(summary.stats.screws) : "…";
  return t.screwsSummary(count, fine.format(settings.screwShank), fine.format(settings.screwHead));
}

/** The diameters of the screws, or what they are for while they are off. */
function ScrewFields({ settings, onSettingsChange }: FieldsProps) {
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

/** The size mode, then the drawer, or the cells and their margins. */
function SizeFields({ settings, onSettingsChange }: FieldsProps) {
  const length = (key: LengthSetting) => ({
    value: settings[key],
    min: BASEPLATE_SETTINGS[key].min,
    max: BASEPLATE_SETTINGS[key].max,
    step: 1,
    unit: "mm",
    locale: t.locale,
    onChange: (value: number) => onSettingsChange({ [key]: toHundredths(value) }),
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

interface FamilyItemProps {
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

function FamilyItem({ icon, title, summary, control, on = false, open, onOpenChange, children }: FamilyItemProps) {
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
