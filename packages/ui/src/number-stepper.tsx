"use client";

import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { decimalInputProps, numberFieldFormat } from "./decimal-input";

export interface NumberStepperProps {
  label: string;
  /** Accessible names of the − and + buttons, e.g. "Une colonne de moins". */
  decrementLabel: string;
  incrementLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Unit shown after the value ("mm", "in", "×"…). */
  unit: string;
  /** Number conventions of the interface language (decimal comma in French). */
  locale: string;
  /** Most decimals shown and kept (3 by default); a typed value is rounded to them. */
  fractionDigits?: number;
  onChange: (value: number) => void;
}

/**
 * Length or count with −/+ buttons. Typing accepts a comma or a point in every language,
 * the arrow keys step, and the value is brought back into [min, max].
 */
export function NumberStepper({
  label,
  decrementLabel,
  incrementLabel,
  value,
  min,
  max,
  step,
  unit,
  locale,
  fractionDigits,
  onChange,
}: NumberStepperProps) {
  const id = useId();
  // Out of the Tab order (Base UI): the arrow keys of the field do the same.
  const button = "grid h-full w-9 shrink-0 place-items-center text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40";
  return (
    <NumberField.Root
      id={id}
      value={value}
      min={min}
      max={max}
      step={step}
      locale={locale}
      format={numberFieldFormat(fractionDigits)}
      onValueChange={(next) => {
        if (next !== null && Number.isFinite(next)) onChange(next);
      }}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <label htmlFor={id} className="w-fit text-[13px] font-medium text-muted">
        {label}
      </label>
      <NumberField.Group className="flex h-10 items-center overflow-hidden rounded-ctl border border-line bg-surface transition-colors hover:border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring">
        <NumberField.Decrement className={button} aria-label={decrementLabel}>
          <Minus className="size-3.5" aria-hidden />
        </NumberField.Decrement>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <NumberField.Input {...decimalInputProps(locale)} className="w-full min-w-0 bg-transparent text-right text-[15px] font-semibold tabular-nums text-ink outline-none" />
          <span aria-hidden className="flex-1 text-[12px] text-muted">
            {unit}
          </span>
        </div>
        <NumberField.Increment className={button} aria-label={incrementLabel}>
          <Plus className="size-3.5" aria-hidden />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
