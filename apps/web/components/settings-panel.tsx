"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { CELLS_PER_AXIS, type BaseplateSettings } from "@repo/geometry";
import { ChoiceGroup, NumberStepper, focusRing } from "@repo/ui";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { BaseplateSummary } from "@/lib/engine/protocol";
import { strings as t } from "@/lib/strings";
import { ProfileArt, ProfileIcon, SizeIcon } from "./illustrations";

/** Families of settings in the panel. Screws, advanced and print settings join with their tickets. */
export type Family = "size" | "profile";

const lengths = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 });
const heights = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 2 });

/** "168 × 126 mm", measured on the mesh. */
function footprint(summary: BaseplateSummary): string {
  const { width, depth } = summary.stats.dimensions;
  return `${lengths.format(width)} × ${lengths.format(depth)} mm`;
}

function cellCount(summary: BaseplateSummary): string {
  return t.cells(summary.layout.columns, summary.layout.rows);
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
            , {t.height} <span data-testid="height">{heights.format(summary.stats.dimensions.height)} mm</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Short line under the dock's buttons (mobile). */
export function DockReadout({ summary }: { summary: BaseplateSummary | null }) {
  return (
    <div className="px-2.5 pt-1.5 pb-2.5" aria-live="polite">
      <p className="text-[18px] font-semibold tracking-[-0.03em] tabular-nums" data-testid="dimensions">
        {summary ? footprint(summary) : "…"}
      </p>
      <p className="truncate text-[12px] text-muted tabular-nums" data-testid="cells">
        {summary ? cellCount(summary) : "…"}
      </p>
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
}

/** Families of settings as an exclusive accordion: opening one closes the others. */
export function Families({ settings, onSettingsChange, summary, open, onOpenChange }: FamiliesProps) {
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
        <div className="grid grid-cols-2 gap-2.5">
          <NumberStepper
            label={t.columns}
            decrementLabel={t.fewerColumns}
            incrementLabel={t.moreColumns}
            value={settings.columns}
            min={CELLS_PER_AXIS.min}
            max={CELLS_PER_AXIS.max}
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
            min={CELLS_PER_AXIS.min}
            max={CELLS_PER_AXIS.max}
            step={1}
            unit="×"
            locale={t.locale}
            onChange={(rows) => onSettingsChange({ rows: Math.round(rows) })}
          />
        </div>
      </FamilyItem>
      <FamilyItem
        {...bind("profile")}
        icon={<ProfileIcon className="size-[18px]" />}
        title={t.pocketProfile}
        summary={t.hybrid}
      >
        {/* The flush profile arrives with #12: shown, not selectable yet. */}
        <ChoiceGroup
          label={t.pocketProfile}
          value="hybrid"
          onChange={() => {}}
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
              badge: t.soon,
              description: t.flushDescription,
              art: <ProfileArt kind="flush" className="h-auto w-full max-w-[128px]" />,
              disabled: true,
            },
          ]}
        />
      </FamilyItem>
    </div>
  );
}

interface FamilyItemProps {
  icon: ReactNode;
  title: string;
  /** One-line summary, shown whether the family is open or closed. */
  summary: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function FamilyItem({ icon, title, summary, open, onOpenChange, children }: FamilyItemProps) {
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={onOpenChange}
      className={`rounded-2xl transition-colors duration-200 ${open ? "bg-sunken" : "hover:bg-sunken"}`}
    >
      <Collapsible.Trigger
        className={`group flex w-full min-w-0 items-center gap-3 rounded-2xl py-2.5 pr-3 pl-2.5 text-left ${focusRing} focus-visible:ring-offset-0`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-surface text-ink-soft shadow-[0_0_0_1px_var(--color-line)]">
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
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="px-3 pt-1 pb-4">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
