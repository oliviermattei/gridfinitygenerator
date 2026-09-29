"use client";

import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { useId } from "react";
import { decimalInputProps, numberFieldFormat } from "./decimal-input";

export interface SliderFieldProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Number conventions of the interface language (decimal comma in French). */
  locale: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Slider paired with a free text field: drag for a rough value, type for an exact one
 * (comma or point, in every language), arrow keys to step. Both stay within [min, max].
 */
export function SliderField({ label, hint, value, min, max, step, unit, locale, onChange, disabled }: SliderFieldProps) {
  const id = useId();
  const change = (next: number | null) => {
    if (next !== null && Number.isFinite(next)) onChange(next);
  };
  return (
    <div className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 ${disabled ? "opacity-45" : ""}`}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[13.5px] font-medium text-ink">
          {label}
        </label>
        {hint && <p className="text-[12px] text-muted">{hint}</p>}
      </div>
      <NumberField.Root
        id={id}
        value={value}
        min={min}
        max={max}
        step={step}
        locale={locale}
        format={numberFieldFormat()}
        disabled={disabled}
        onValueChange={change}
      >
        <NumberField.Group className="flex h-8 w-[84px] items-center rounded-ctl border border-line bg-surface pr-2 transition-colors hover:border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring">
          <NumberField.Input {...decimalInputProps(locale)} className="h-full w-full min-w-0 bg-transparent pl-2.5 text-right text-[13.5px] font-medium tabular-nums text-ink outline-none" />
          <span aria-hidden className="pl-1 text-[12px] text-muted">
            {unit}
          </span>
        </NumberField.Group>
      </NumberField.Root>
      <Slider.Root
        className="col-span-2"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => change(Array.isArray(next) ? (next[0] ?? null) : next)}
      >
        <Slider.Control className="group/slider flex h-5 w-full cursor-pointer touch-none items-center select-none">
          <Slider.Track className="h-1 w-full rounded-full bg-track">
            <Slider.Indicator className="rounded-full bg-accent" />
            <Slider.Thumb
              aria-label={label}
              className="size-4 rounded-full border border-line-strong bg-white shadow-[0_1px_3px_rgb(16_18_24/0.22)] transition-[scale,box-shadow] duration-150 outline-none group-hover/slider:scale-110 has-focus-visible:ring-4 has-focus-visible:ring-accent-ring data-dragging:scale-110"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
