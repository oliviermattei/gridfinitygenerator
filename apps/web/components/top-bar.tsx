"use client";

import { Popover } from "@base-ui/react/popover";
import { BASEPLATE_SETTINGS, type BaseplateSettings } from "@repo/geometry";
import { NumberStepper, Segmented, Swatches, focusRing, glass } from "@repo/ui";
import { ChevronDown, Coffee, Link2, RotateCcw, Settings } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { LANGUAGE_NAMES, LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { DONATION_URL } from "@/lib/links";
import { useFormats, useLocale, useStrings } from "@/lib/locale";
import { BUILD_PLATE_RANGE, NOZZLES, PREVIEW_COLORS, type Nozzle, type Preferences, type PreviewColor } from "@/lib/preferences";
import type { Strings } from "@/lib/strings";
import { UNITS, type Unit } from "@/lib/units";
import { FilamentSettings } from "./filament-settings";

interface Action {
  key: string;
  label: string;
  icon: ReactNode;
  /** Runs the action; an action with neither this nor a link is shown inactive. */
  onSelect?: () => void;
  /** Link opened in a new tab. */
  href?: string | null;
}

/** Handlers of the top bar actions. */
export interface TopBarActions {
  onShare: () => void;
  onReset: () => void;
}

// The donation link is configured at build time.
function actionsOf({ onShare, onReset }: TopBarActions, t: Strings): Action[] {
  return [
    { key: "share", label: t.share, icon: <Link2 className="size-4" aria-hidden />, onSelect: onShare },
    { key: "reset", label: t.reset, icon: <RotateCcw className="size-4" aria-hidden />, onSelect: onReset },
    { key: "donate", label: t.donate, icon: <Coffee className="size-4" aria-hidden />, href: DONATION_URL },
  ];
}

function ActionControl({ action, className }: { action: Action; className: string }) {
  const t = useStrings();
  if (action.href) {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" className={className}>
        {action.icon}
        {action.label}
        <span className="sr-only"> ({t.newTab})</span>
      </a>
    );
  }
  if (action.onSelect) {
    return (
      <button type="button" onClick={action.onSelect} className={className}>
        {action.icon}
        {action.label}
      </button>
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
export function TopActions(handlers: TopBarActions) {
  const t = useStrings();
  const pill = `flex h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink ${glass} ${focusRing}`;
  return (
    <div className="hidden items-center gap-2 md:flex">
      {actionsOf(handlers, t).map((action) => (
        <ActionControl key={action.key} action={action} className={pill} />
      ))}
    </div>
  );
}

/** Print settings of the baseplate that the menu shows (they belong to the share link). */
export type PrintSettings = Pick<BaseplateSettings, "layerHeight" | "lineWidth">;

export interface SettingsMenuProps {
  preferences: Preferences;
  onPreferencesChange: (patch: Partial<Preferences>) => void;
  settings: PrintSettings;
  onSettingsChange: (patch: Partial<PrintSettings>) => void;
  /** Mobile: the menu also holds the top bar actions, run with these handlers. */
  actions: TopBarActions | null;
  /** Shows the generator in another language, keeping the settings on screen. */
  onLanguageChange: (language: Locale) => void;
}

/** Drops the floating-point noise of a stepped value (0.2 + 0.04 = 0.24000000000000002). */
const toThousandths = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Gear menu. On desktop it holds parameters only; on mobile it also holds the actions.
 * The parameters are the language, the units, the print (nozzle, layer height, line width),
 * the build plate, the filament (#31) and the preview colour. Layer height and line width are baseplate
 * settings, shared in the link; the others are preferences of this browser.
 */
export function SettingsMenu({ preferences, onPreferencesChange, settings, onSettingsChange, actions, onLanguageChange }: SettingsMenuProps) {
  const t = useStrings();
  const f = useFormats();
  const locale = useLocale();
  const languageId = useId();
  const [open, setOpen] = useState(false);
  const { unit, previewColor, nozzle, buildPlate } = preferences;
  const withActions = actions !== null;
  // An action closes the menu first: the reset confirmation or the notification replaces it.
  const closingMenu = (run: () => void) => () => {
    setOpen(false);
    run();
  };
  const label = withActions ? t.menu : t.parameters;
  const row = `flex h-10 w-full items-center gap-3 rounded-[10px] px-2.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink ${focusRing} focus-visible:ring-offset-0`;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
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

            <section className="grid grid-cols-2 gap-2.5 px-4 py-3.5">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor={languageId} className="w-fit text-[13px] font-medium text-muted">
                  {t.language}
                </label>
                <div className="relative">
                  <select
                    id={languageId}
                    value={locale}
                    onChange={(event) => {
                      if (isLocale(event.target.value)) onLanguageChange(event.target.value);
                    }}
                    className={`h-10 w-full cursor-pointer appearance-none rounded-ctl border border-line bg-surface pr-8 pl-3 text-[14px] font-semibold text-ink transition-colors hover:border-line-strong ${focusRing} focus-visible:ring-offset-0`}
                  >
                    {LOCALES.map((language) => (
                      <option key={language} value={language} lang={language}>
                        {LANGUAGE_NAMES[language]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted">{t.units}</span>
                <Segmented<Unit>
                  label={t.units}
                  value={unit}
                  onChange={(next) => onPreferencesChange({ unit: next })}
                  options={UNITS.map((value) => ({ value, label: t.unitNames[value] }))}
                />
              </div>
              <p className="col-span-2 text-[12px] leading-snug text-muted">{t.unitsHint}</p>
            </section>

            <section className="flex flex-col gap-3 border-t border-line px-4 py-3.5" aria-labelledby="print-title">
              <h3 id="print-title" className="text-[13.5px] font-semibold">
                {t.print}
              </h3>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted">{t.nozzle} (mm)</span>
                <Segmented
                  label={t.nozzle}
                  value={String(nozzle)}
                  onChange={(value) => {
                    const next = Number(value) as Nozzle;
                    onPreferencesChange({ nozzle: next });
                    onSettingsChange({ lineWidth: next });
                  }}
                  options={NOZZLES.map((value) => ({ value: String(value), label: f.nozzles.format(value) }))}
                />
                <p className="text-[12px] leading-snug text-muted">{t.nozzleHint}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <NumberStepper
                  label={t.layerHeight}
                  decrementLabel={t.thinnerLayer}
                  incrementLabel={t.thickerLayer}
                  value={settings.layerHeight}
                  min={BASEPLATE_SETTINGS.layerHeight.min}
                  max={BASEPLATE_SETTINGS.layerHeight.max}
                  step={0.04}
                  unit="mm"
                  locale={t.locale}
                  onChange={(layerHeight) => onSettingsChange({ layerHeight: toThousandths(layerHeight) })}
                />
                <NumberStepper
                  label={t.lineWidth}
                  decrementLabel={t.narrowerLine}
                  incrementLabel={t.widerLine}
                  value={settings.lineWidth}
                  min={BASEPLATE_SETTINGS.lineWidth.min}
                  max={BASEPLATE_SETTINGS.lineWidth.max}
                  step={0.05}
                  unit="mm"
                  locale={t.locale}
                  onChange={(lineWidth) => onSettingsChange({ lineWidth: toThousandths(lineWidth) })}
                />
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-line px-4 py-3.5" aria-labelledby="build-plate-title">
              <div>
                <h3 id="build-plate-title" className="text-[13.5px] font-semibold">
                  {t.buildPlate}
                </h3>
                <p className="mt-0.5 text-[12px] leading-snug text-muted">{t.buildPlateHint}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <NumberStepper
                  label={t.buildPlateWidth}
                  decrementLabel={t.narrowerPlate}
                  incrementLabel={t.widerPlate}
                  value={buildPlate.width}
                  min={BUILD_PLATE_RANGE.min}
                  max={BUILD_PLATE_RANGE.max}
                  step={1}
                  unit="mm"
                  locale={t.locale}
                  onChange={(width) => onPreferencesChange({ buildPlate: { ...buildPlate, width } })}
                />
                <NumberStepper
                  label={t.buildPlateDepth}
                  decrementLabel={t.shallowerPlate}
                  incrementLabel={t.deeperPlate}
                  value={buildPlate.depth}
                  min={BUILD_PLATE_RANGE.min}
                  max={BUILD_PLATE_RANGE.max}
                  step={1}
                  unit="mm"
                  locale={t.locale}
                  onChange={(depth) => onPreferencesChange({ buildPlate: { ...buildPlate, depth } })}
                />
              </div>
            </section>

            <FilamentSettings value={preferences.filament} onChange={(filament) => onPreferencesChange({ filament })} />

            <section className="border-t border-line px-4 py-3.5" aria-labelledby="preview-color-title">
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
                  onChange={(color) => onPreferencesChange({ previewColor: color })}
                  swatches={(Object.keys(PREVIEW_COLORS) as PreviewColor[]).map((key) => ({
                    value: key,
                    name: t.previewColors[key],
                    hex: PREVIEW_COLORS[key],
                  }))}
                />
              </div>
            </section>

            {actions && (
              <section aria-label={t.actions} className="flex flex-col border-t border-line p-1.5">
                {actionsOf({ onShare: closingMenu(actions.onShare), onReset: closingMenu(actions.onReset) }, t).map((action) => (
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
