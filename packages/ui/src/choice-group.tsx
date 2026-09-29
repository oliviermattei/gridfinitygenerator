"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { focusRing } from "./styles";

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** Illustration; `var(--art)` inside it turns to the accent when the choice is selected. */
  art: ReactNode;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  columns?: number;
}

/** Illustrated buttons for a single choice (a radio group: arrow keys move between them). */
export function ChoiceGroup<T extends string>({ label, value, options, onChange, columns = 2 }: ChoiceGroupProps<T>) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={`group/choice relative flex cursor-pointer flex-col items-stretch rounded-card border border-line bg-surface p-1.5 text-left transition-[border-color,box-shadow] duration-150 hover:border-line-strong data-checked:border-accent data-checked:shadow-[0_0_0_1px_var(--accent)] data-disabled:cursor-not-allowed data-disabled:opacity-60 data-disabled:hover:border-line ${focusRing}`}
        >
          <span className="grid h-[74px] place-items-center rounded-[10px] bg-sunken px-4 text-muted transition-colors group-data-checked/choice:bg-accent-tint group-data-checked/choice:text-ink-soft group-data-checked/choice:[--art:var(--accent)]">
            {option.art}
          </span>
          <span className="flex items-center gap-1.5 px-1.5 pt-2 pb-1">
            <span className="text-[13.5px] font-semibold text-ink">{option.label}</span>
            {option.badge && (
              <span className="rounded-[4px] bg-sunken px-1.5 py-px text-[11px] font-medium text-muted">{option.badge}</span>
            )}
          </span>
          {option.description && (
            <span className="px-1.5 pb-1 text-[12px] leading-snug text-muted">{option.description}</span>
          )}
          <Radio.Indicator className="absolute top-2.5 right-2.5 grid size-[18px] place-items-center rounded-full bg-accent text-accent-ink">
            <Check className="size-3" strokeWidth={3} aria-hidden />
          </Radio.Indicator>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
