"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { focusRing } from "./styles";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}

/** A short single choice as joined segments (a radio group: arrow keys move between them). */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="flex h-10 gap-0.5 rounded-ctl bg-sunken p-0.5"
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className={`flex flex-1 cursor-pointer items-center justify-center rounded-[8px] text-[13.5px] font-semibold text-muted tabular-nums transition-colors hover:text-ink data-checked:bg-surface data-checked:text-ink data-checked:shadow-[0_1px_2px_rgb(18_19_25/0.08),0_0_0_1px_var(--color-line)] ${focusRing} focus-visible:ring-offset-0`}
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
