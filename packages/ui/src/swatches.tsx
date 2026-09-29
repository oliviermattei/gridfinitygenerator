"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { focusRing } from "./styles";

export interface Swatch<T extends string> {
  value: T;
  /** Accessible name of the colour, also shown as a tooltip. */
  name: string;
  hex: string;
}

export interface SwatchesProps<T extends string> {
  label: string;
  value: T;
  swatches: Swatch<T>[];
  onChange: (value: T) => void;
}

/** Colour chips for a single choice (a radio group: arrow keys move between them). */
export function Swatches<T extends string>({ label, value, swatches, onChange }: SwatchesProps<T>) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="flex items-center gap-1.5"
    >
      {swatches.map((swatch) => (
        <Radio.Root
          key={swatch.value}
          value={swatch.value}
          aria-label={swatch.name}
          title={swatch.name}
          className={`grid cursor-pointer place-items-center rounded-full p-[3px] transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--color-line-strong)] data-checked:shadow-[0_0_0_1.5px_var(--color-ink)] ${focusRing}`}
        >
          <span
            aria-hidden
            className="block size-6 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12),inset_0_-3px_6px_rgb(0_0_0/0.12)]"
            style={{ background: swatch.hex }}
          />
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
