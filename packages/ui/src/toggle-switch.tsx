"use client";

import { Switch } from "@base-ui/react/switch";
import { focusRing } from "./styles";

export interface ToggleSwitchProps {
  /** Accessible name of the switch. */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** On/off switch: the accent when on. Space or Enter toggles it from the keyboard. */
export function ToggleSwitch({ label, checked, onChange }: ToggleSwitchProps) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className={`relative flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-sunken p-[2px] transition-colors duration-150 hover:border-faint data-checked:border-accent data-checked:bg-accent ${focusRing}`}
    >
      <Switch.Thumb className="size-4 rounded-full bg-white shadow-[0_1px_2px_rgb(16_18_24/0.25)] transition-transform duration-200 ease-[cubic-bezier(.3,.7,.2,1)] data-checked:translate-x-4" />
    </Switch.Root>
  );
}
