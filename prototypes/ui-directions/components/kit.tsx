"use client";
// PROTOTYPE JETABLE — briques de contrôle v2, sans couleur propre : tout passe par des jetons CSS
// (--accent, --ink, --line, --r-ctl…) posés sur la racine de chaque direction. Base UI pour
// l'accessibilité clavier (flèches, Tab, Espace), Tailwind pour l'habillage.
import { useEffect, useState, type ReactNode } from "react";
import { Switch } from "@base-ui/react/switch";
import { Slider } from "@base-ui/react/slider";
import { NumberField } from "@base-ui/react/number-field";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Download, Minus, Plus } from "lucide-react";
import { ALIGNS, type Align, type Strings } from "@/lib/settings";
import { AlignArt } from "./illustrations";

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

const fmt = (v: number, locale: string, max = 2) => new Intl.NumberFormat(locale, { maximumFractionDigits: max }).format(v);
const parse = (txt: string) => Number(txt.replace(/\s/g, "").replace(",", "."));

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({ value, options, onChange, label, size = "md", full }: {
  value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string; size?: "sm" | "md"; full?: boolean;
}) {
  return (
    <ToggleGroup aria-label={label} value={[value]} onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className={`flex gap-0.5 rounded-[var(--r-ctl)] bg-[var(--sunken)] p-[3px] ${full ? "w-full" : ""} ${size === "sm" ? "h-8" : "h-9"}`}>
      {options.map((o) => (
        <Toggle key={o.value} value={o.value} aria-label={o.title}
          className={`tnum flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--r-ctl)-2px)] px-2.5 text-[13px] font-medium whitespace-nowrap text-[var(--muted)] transition-[background,color,box-shadow] duration-150 hover:text-[var(--ink)] data-pressed:bg-[var(--surface)] data-pressed:text-[var(--ink)] data-pressed:shadow-[0_1px_2px_rgba(16,18,24,.10),0_0_0_1px_var(--line)] ${focusRing}`}>
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

/* ---------------- Interrupteur ---------------- */
export function Toggler({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch.Root checked={checked} onCheckedChange={onChange} aria-label={label}
      className={`group relative flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-[var(--r-switch)] border border-[var(--line-strong)] bg-[var(--sunken)] p-[2px] transition-colors duration-150 hover:border-[var(--faint)] data-checked:border-[var(--accent)] data-checked:bg-[var(--accent)] ${focusRing}`}>
      <Switch.Thumb className="size-4 rounded-[calc(var(--r-switch)-2px)] bg-white shadow-[0_1px_2px_rgba(16,18,24,.25)] transition-transform duration-200 ease-[cubic-bezier(.3,.7,.2,1)] data-checked:translate-x-4" />
    </Switch.Root>
  );
}

/* ---------------- Champ numérique libre (texte, virgule acceptée) ---------------- */
function FreeNumber({ value, min, max, step, unit, locale, onChange, label, digits = 2, wide }: {
  value: number; min: number; max: number; step: number; unit: string; locale: string; onChange: (v: number) => void; label: string; digits?: number; wide?: boolean;
}) {
  const [txt, setTxt] = useState(fmt(value, locale, digits));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setTxt(fmt(value, locale, digits)); }, [value, locale, digits, editing]);
  const commit = (raw: string) => {
    const n = parse(raw);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    else setTxt(fmt(value, locale, digits));
  };
  return (
    <label className={`group/f flex h-8 shrink-0 items-center rounded-[var(--r-ctl)] border border-[var(--line)] bg-[var(--surface)] pr-2 transition-colors hover:border-[var(--line-strong)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)] ${wide ? "w-[92px]" : "w-[76px]"}`}>
      <input
        aria-label={label}
        inputMode="decimal"
        value={txt}
        onFocus={(e) => { setEditing(true); e.target.select(); }}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={(e) => { setEditing(false); commit(e.target.value); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const n = Math.min(max, Math.max(min, +(value + (e.key === "ArrowUp" ? step : -step)).toFixed(4)));
            onChange(n);
            setTxt(fmt(n, locale, digits));
          }
        }}
        className="tnum h-full w-full min-w-0 bg-transparent pl-2.5 text-right text-[13.5px] font-medium text-[var(--ink)] outline-none"
      />
      <span className="pl-1 text-[12px] text-[var(--faint)]">{unit}</span>
    </label>
  );
}

/* ---------------- Curseur + champ ---------------- */
export function SliderField({ label, hint, value, min, max, step, unit = "mm", locale, onChange, disabled }: {
  label: string; hint?: string; value: number; min: number; max: number; step: number; unit?: string; locale: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 ${disabled ? "pointer-events-none opacity-45" : ""}`} data-base-ui-swipe-ignore>
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-[var(--ink)]">{label}</div>
        {hint && <div className="text-[12px] text-[var(--muted)]">{hint}</div>}
      </div>
      <FreeNumber value={value} min={min} max={max} step={step} unit={unit} locale={locale} onChange={onChange} label={label} />
      <Slider.Root className="col-span-2" value={value} min={min} max={max} step={step} disabled={disabled} onValueChange={(v) => onChange(v as number)}>
        <Slider.Control className="group/s flex h-5 w-full cursor-pointer touch-none items-center select-none">
          <Slider.Track className="h-[4px] w-full rounded-full bg-[var(--track)]">
            <Slider.Indicator className="rounded-full bg-[var(--accent)]" />
            <Slider.Thumb aria-label={label}
              className="size-4 rounded-full border border-[var(--line-strong)] bg-white shadow-[0_1px_3px_rgba(16,18,24,.22)] transition-[transform,box-shadow] duration-150 outline-none group-hover/s:scale-110 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)] data-dragging:scale-110" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}

/* ---------------- Longueur avec pas-à-pas ---------------- */
export function LengthField({ label, value, unit, step, min = 1, max = 3000, locale, onChange }: {
  label: string; value: number; unit: string; step: number; min?: number; max?: number; locale: string; onChange: (v: number) => void;
}) {
  const btn = `grid h-full w-8 shrink-0 place-items-center text-[var(--muted)] transition-colors hover:bg-[var(--sunken)] hover:text-[var(--ink)] disabled:opacity-40 ${focusRing} focus-visible:ring-offset-0`;
  return (
    <NumberField.Root value={value} step={step} min={min} max={max} locale={locale} onValueChange={(v) => v != null && onChange(v)} className="flex min-w-0 flex-col gap-1.5">
      <NumberField.ScrubArea className="w-fit cursor-ew-resize">
        <label className="cursor-ew-resize text-[13px] font-medium text-[var(--muted)]">{label}</label>
      </NumberField.ScrubArea>
      <NumberField.Group className="flex h-10 items-center overflow-hidden rounded-[var(--r-ctl)] border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[var(--line-strong)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)]">
        <NumberField.Decrement className={btn} aria-label={`${label} −`}><Minus className="size-3.5" /></NumberField.Decrement>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <NumberField.Input className="tnum w-full min-w-0 bg-transparent text-right text-[15px] font-semibold text-[var(--ink)] outline-none" />
          <span className="flex-1 text-[12px] text-[var(--faint)]">{unit}</span>
        </div>
        <NumberField.Increment className={btn} aria-label={`${label} +`}><Plus className="size-3.5" /></NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}

/* ---------------- Boutons illustrés ---------------- */
export function ChoiceGroup<T extends string>({ value, options, onChange, label, cols = 2, compact }: {
  value: T; label: string; cols?: number; compact?: boolean;
  options: { value: T; label: string; art: ReactNode; desc?: string; badge?: string }[]; onChange: (v: T) => void;
}) {
  return (
    <ToggleGroup aria-label={label} value={[value]} onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <Toggle key={o.value} value={o.value}
          className={`group/c relative flex flex-col items-stretch rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--surface)] p-1.5 text-left transition-[border-color,box-shadow,background] duration-150 hover:border-[var(--line-strong)] data-pressed:border-[var(--accent)] data-pressed:shadow-[0_0_0_1px_var(--accent)] ${focusRing}`}>
          <span className={`grid place-items-center rounded-[calc(var(--r-card)-4px)] bg-[var(--sunken)] text-[var(--faint)] transition-colors group-hover/c:text-[var(--muted)] group-data-pressed/c:bg-[var(--accent-tint)] group-data-pressed/c:text-[var(--ink-soft)] group-data-pressed/c:[--art:var(--accent)] ${compact ? "h-14 px-3" : "h-[74px] px-4"}`}>
            {o.art}
          </span>
          <span className="flex items-center gap-1.5 px-1.5 pt-2 pb-1">
            <span className="text-[13.5px] font-semibold text-[var(--ink)]">{o.label}</span>
            {o.badge && <span className="rounded-[4px] bg-[var(--sunken)] px-1.5 py-px text-[11px] font-medium text-[var(--muted)]">{o.badge}</span>}
          </span>
          {o.desc && <span className="px-1.5 pb-1 text-[12px] leading-snug text-[var(--muted)]">{o.desc}</span>}
          <span className="absolute top-2.5 right-2.5 grid size-[18px] scale-50 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] opacity-0 transition-[opacity,transform] duration-150 group-data-pressed/c:scale-100 group-data-pressed/c:opacity-100">
            <Check className="size-3" strokeWidth={3} />
          </span>
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

/* ---------------- Pavé d'alignement ---------------- */
export function AlignPad({ value, onChange, names, label }: { value: Align; onChange: (a: Align) => void; names: Record<Align, string>; label: string }) {
  return (
    <ToggleGroup aria-label={label} value={[value]} onValueChange={(v) => v[0] && onChange(v[0] as Align)}
      className="grid w-fit shrink-0 grid-cols-3 gap-1 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--sunken)] p-1">
      {ALIGNS.map((a) => (
        <Toggle key={a} value={a} aria-label={names[a]} title={names[a]}
          className={`grid h-9 w-11 place-items-center rounded-[calc(var(--r-card)-4px)] text-[var(--faint)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--muted)] data-pressed:bg-[var(--surface)] data-pressed:text-[var(--ink)] data-pressed:shadow-[0_0_0_1.5px_var(--accent)] data-pressed:[--art:var(--accent)] ${focusRing}`}>
          <AlignArt pos={a} className="h-[18px] w-[23px]" />
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

/* ---------------- Ligne interrupteur ---------------- */
export function SwitchRow({ label, desc, checked, onChange, art }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; art?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {art && <span className="grid h-10 w-13 shrink-0 place-items-center rounded-[var(--r-ctl)] bg-[var(--sunken)] text-[var(--faint)]">{art}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-[var(--ink)]">{label}</span>
        {desc && <span className="block text-[12px] leading-snug text-[var(--muted)]">{desc}</span>}
      </span>
      <Toggler checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/* ---------------- Pastilles de filament ---------------- */
export function Swatches({ value, colors, onChange, label, size = 22 }: {
  value: number; colors: { hex: string; name: string }[]; onChange: (i: number) => void; label: string; size?: number;
}) {
  return (
    <ToggleGroup aria-label={label} value={[String(value)]} onValueChange={(v) => v[0] && onChange(+v[0])} className="flex items-center gap-1.5">
      {colors.map((c, i) => (
        <Toggle key={c.hex} value={String(i)} aria-label={c.name} title={c.name}
          className={`group/w grid place-items-center rounded-full p-[3px] transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--line-strong)] data-pressed:shadow-[0_0_0_1.5px_var(--ink)] ${focusRing}`}>
          <span className="block rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12),inset_0_-3px_6px_rgba(0,0,0,.12)]" style={{ background: c.hex, width: size, height: size }} />
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

/* ---------------- Téléchargement (bouton + menu de format) ---------------- */
export function DownloadSplit({ t, compact, full, size = "md" }: { t: Strings; compact?: boolean; full?: boolean; size?: "md" | "lg" }) {
  const h = size === "lg" ? "h-12 text-[15px]" : "h-9 text-[13.5px]";
  return (
    <div className={`flex ${full ? "w-full" : ""}`}>
      <button className={`flex flex-1 items-center justify-center gap-2 rounded-l-[var(--r-ctl)] bg-[var(--accent)] pr-3.5 pl-3 font-semibold text-[var(--accent-ink)] transition-[filter] hover:brightness-[1.06] active:brightness-95 ${h} ${focusRing}`}>
        <Download className="size-4" strokeWidth={2.2} /> {compact ? "3MF" : `${t.download} 3MF`}
      </button>
      <Menu.Root>
        <Menu.Trigger aria-label={t.download}
          className={`grid w-9 place-items-center rounded-r-[var(--r-ctl)] border-l border-[color-mix(in_srgb,var(--accent-ink)_22%,transparent)] bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-[1.06] ${h} ${focusRing}`}>
          <ChevronDown className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end" className="z-50">
            <Menu.Popup className="kit-popup min-w-52 p-1 text-[13.5px]">
              {["3MF", "STL"].map((f) => (
                <Menu.Item key={f} className="flex h-9 cursor-default items-center gap-2 rounded-[calc(var(--r-ctl)-2px)] px-2.5 outline-none data-highlighted:bg-[var(--sunken)]">
                  <Download className="size-4 text-[var(--muted)]" /> {t.downloadAs(f)}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

/* ---------------- Bouton discret ---------------- */
export function Ghost({ children, icon, onClick, label, iconOnly }: { children?: ReactNode; icon: ReactNode; onClick?: () => void; label?: string; iconOnly?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={iconOnly ? label : undefined}
      className={`flex h-9 items-center gap-1.5 rounded-[var(--r-ctl)] text-[13.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--sunken)] hover:text-[var(--ink)] ${iconOnly ? "w-9 justify-center" : "px-2.5"} ${focusRing}`}>
      {icon}{!iconOnly && children}
    </button>
  );
}

/* ---------------- Media query ---------------- */
export function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Hauteur masquée par le panneau mobile ouvert (58 dvh) : l'aperçu se recadre au-dessus. */
export function useSheetInset(open: boolean) {
  const [h, setH] = useState(800);
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return open ? Math.round(h * 0.58) : 0;
}

export { fmt };
