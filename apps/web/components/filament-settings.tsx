"use client";

import { NumberField } from "@base-ui/react/number-field";
import { NumberStepper, decimalInputProps, focusRing, numberFieldFormat } from "@repo/ui";
import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { useFormats, useStrings } from "@/lib/locale";
import { DENSITY_RANGE, FILAMENTS, FILAMENT_DENSITIES, PRICE_RANGE, isFilament, type FilamentPreference } from "@/lib/mass";

export interface FilamentSettingsProps {
  value: FilamentPreference;
  onChange: (next: FilamentPreference) => void;
}

/**
 * The filament of the prints, in the gear menu (#31): its kind, the density of another one,
 * and its price, optional. A preference of this browser, out of the share link: it only sets
 * the mass and the cost shown. The CLICKbase type does not change it by itself.
 */
export function FilamentSettings({ value, onChange }: FilamentSettingsProps) {
  const t = useStrings();
  const f = useFormats();
  const filamentId = useId();
  const priceId = useId();
  const { filament, density, price } = value;
  const field = `h-10 w-full rounded-ctl border border-line bg-surface text-[14px] font-semibold text-ink transition-colors hover:border-line-strong ${focusRing} focus-visible:ring-offset-0`;
  return (
    <section className="flex flex-col gap-3 border-t border-line px-4 py-3.5" aria-labelledby="filament-title">
      <div>
        <h3 id="filament-title" className="text-[13.5px] font-semibold">
          {t.filament}
        </h3>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">{t.filamentHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={filamentId} className="w-fit text-[13px] font-medium text-muted">
            {t.filament}
          </label>
          <div className="relative">
            <select
              id={filamentId}
              value={filament}
              onChange={(event) => {
                if (isFilament(event.target.value)) onChange({ ...value, filament: event.target.value });
              }}
              className={`${field} cursor-pointer appearance-none pr-8 pl-3`}
            >
              {FILAMENTS.map((kind) => (
                <option key={kind} value={kind}>
                  {t.filamentNames[kind]}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
          </div>
        </div>
        <NumberField.Root
          id={priceId}
          value={price}
          min={PRICE_RANGE.min}
          max={PRICE_RANGE.max}
          step={1}
          locale={t.locale}
          format={numberFieldFormat(2)}
          // Emptied, the field gives null: no price, no cost.
          onValueChange={(next) => onChange({ ...value, price: next !== null && Number.isFinite(next) ? next : null })}
          className="flex min-w-0 flex-col gap-1.5"
        >
          <label htmlFor={priceId} className="w-fit text-[13px] font-medium text-muted">
            {t.filamentPrice}
          </label>
          <NumberField.Group className="flex h-10 items-baseline gap-1 overflow-hidden rounded-ctl border border-line bg-surface px-3 transition-colors hover:border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring">
            <NumberField.Input
              {...decimalInputProps(t.locale)}
              className="h-full w-full min-w-0 bg-transparent text-right text-[15px] font-semibold tabular-nums text-ink outline-none"
            />
            <span aria-hidden className="shrink-0 text-[12px] text-muted">
              €/kg
            </span>
          </NumberField.Group>
        </NumberField.Root>
      </div>
      <p className="text-[12px] leading-snug text-muted">{t.filamentPriceHint}</p>
      {filament === "other" ? (
        <NumberStepper
          label={t.density}
          decrementLabel={t.lowerDensity}
          incrementLabel={t.higherDensity}
          value={density}
          min={DENSITY_RANGE.min}
          max={DENSITY_RANGE.max}
          step={0.01}
          fractionDigits={2}
          unit="g/cm³"
          locale={t.locale}
          onChange={(next) => onChange({ ...value, density: Math.round(next * 100) / 100 })}
        />
      ) : (
        <p className="text-[12px] leading-snug text-muted" data-testid="filament-density">
          {t.densityOf(f.densities.format(FILAMENT_DENSITIES[filament]))}
        </p>
      )}
    </section>
  );
}
