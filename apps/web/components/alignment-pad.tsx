"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { ALIGNMENTS, type Alignment } from "@repo/geometry";
import { focusRing } from "@repo/ui";
import { useStrings } from "@/lib/locale";
import { AlignArt } from "./illustrations";

export interface AlignmentPadProps {
  value: Alignment;
  onChange: (alignment: Alignment) => void;
}

/**
 * The 9 alignments of the grid as a keypad, seen from above with the back of the drawer at
 * the top: a radio group, the arrow keys move between them.
 */
export function AlignmentPad({ value, onChange }: AlignmentPadProps) {
  const t = useStrings();
  return (
    <div className="flex items-center gap-4">
      <RadioGroup
        aria-label={t.alignment}
        value={value}
        onValueChange={(next) => onChange(next as Alignment)}
        className="grid w-fit shrink-0 grid-cols-3 gap-1 rounded-card border border-line bg-sunken p-1"
      >
        {ALIGNMENTS.map((alignment) => (
          <Radio.Root
            key={alignment}
            value={alignment}
            aria-label={t.alignments[alignment]}
            title={t.alignments[alignment]}
            className={`grid h-9 w-11 cursor-pointer place-items-center rounded-[10px] text-faint transition-colors hover:bg-surface hover:text-muted data-checked:bg-surface data-checked:text-ink data-checked:shadow-[0_0_0_1.5px_var(--accent)] data-checked:[--art:var(--accent)] ${focusRing}`}
          >
            <AlignArt alignment={alignment} className="h-[18px] w-[23px]" />
          </Radio.Root>
        ))}
      </RadioGroup>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-ink">{t.alignments[value]}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{t.alignmentHint}</p>
      </div>
    </div>
  );
}
