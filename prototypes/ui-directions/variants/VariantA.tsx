"use client";
// PROTOTYPE JETABLE — Direction A « Nuancier ».
// Structure proche d'extrabold (panneau latéral qui défile + aperçu), mais chaque famille de réglages
// porte sa propre couleur, comme les onglets d'un nuancier. Typo : Onest. Fond gris bleuté froid.
import dynamic from "next/dynamic";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Switch } from "@base-ui/react/switch";
import { Slider } from "@base-ui/react/slider";
import { NumberField } from "@base-ui/react/number-field";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Collapsible } from "@base-ui/react/collapsible";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { ChevronDown, Coffee, Download, Link2, MoreHorizontal, RotateCcw, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import { ALIGNS, fromUnit, toUnit, type Ctx } from "@/lib/settings";
import { summaries, copyLink } from "@/lib/summary";
import {
  AdvancedGlyph, AlignGlyph, BrandMark, CellsGlyph, DrawerGlyph, MagnetGlyph, MagnetIcon, NozzleGlyph,
  ProfileGlyph, ProfileIcon, RulerGlyph, ScrewGlyph, ScrewIcon, TargetGlyph,
} from "@/components/illustrations";

const Preview3D = dynamic(() => import("@/components/Preview3D"), { ssr: false });

/* Une couleur par famille. */
const FAM = {
  size: "#2459E0", // cobalt
  align: "#7A3FE0", // violet
  profile: "#0B8F83", // sarcelle
  magnets: "#E0264F", // rouge aimant
  screws: "#C7820A", // laiton
  advanced: "#56627A", // ardoise
  print: "#0C7FB0", // bleu buse
} as const;

const INK = "#171C28";
const MUTED = "#626B7E";
const LINE = "#E3E7EF";

const acc = (c: string) => ({ "--accent": c }) as CSSProperties;

export default function VariantA(ctx: Ctx) {
  const { s, set, reset, layout, t } = ctx;
  const sum = summaries(ctx);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1600);
  };
  const share = () => {
    copyLink();
    flash(t.shared);
  };

  return (
    <div className="font-a flex h-dvh flex-col text-[15px]" style={{ background: "#EDF0F5", color: INK }}>
      {/* ---------- En-tête ---------- */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-4 md:px-5" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <span className="text-[18px] font-semibold tracking-[-0.01em]">Pocketfit</span>
          <span className="hidden h-5 w-px bg-[#DADFE8] lg:block" />
          <span className="hidden text-[15px] lg:block" style={{ color: MUTED }}>{t.generator}</span>
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Segmented value={s.unit} options={[["mm", "mm"], ["in", "in"]]} onChange={(v) => set({ unit: v as "mm" | "in" })} label={t.units} />
          <Segmented value={s.lang} options={[["fr", "FR"], ["en", "EN"]]} onChange={(v) => set({ lang: v as "fr" | "en" })} label={t.language} />
          <PrintProfile ctx={ctx} summary={sum.print} />
          <span className="mx-1 h-6 w-px bg-[#DADFE8]" />
          <GhostButton onClick={share} icon={<Link2 className="size-4" />}>{t.share}</GhostButton>
          <GhostButton onClick={reset} icon={<RotateCcw className="size-4" />}>{t.reset}</GhostButton>
          <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#FFE8A3] px-3 text-[14px] font-medium text-[#5B4300] hover:bg-[#FFDD75]">
            <Coffee className="size-4" /> <span className="hidden xl:inline">{t.donate}</span>
          </a>
          <DownloadButton t={t} />
        </div>
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <DownloadButton t={t} compact />
          <MobileMore ctx={ctx} share={share} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---------- Panneau latéral (desktop) ---------- */}
        <aside className="hidden w-[420px] shrink-0 overflow-y-auto border-r bg-white md:block" style={{ borderColor: LINE }}>
          <SettingsList ctx={ctx} sum={sum} />
        </aside>

        {/* ---------- Aperçu ---------- */}
        <main className="relative min-w-0 flex-1">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#C9D0DC 1px, transparent 1.2px)", backgroundSize: "22px 22px" }} />
          <Preview3D className="absolute inset-0" s={s} layout={layout}
            palette={{ plate: "#AEB8C9", wall: "#F4F6FA", margin: "#E9EDF3", magnet: FAM.magnets, screw: FAM.screws }} />
          <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2 md:top-5 md:left-5">
            <div className="rounded-xl bg-white/90 px-4 py-3 shadow-[0_1px_0_rgba(23,28,40,.06),0_8px_24px_-12px_rgba(23,28,40,.25)] backdrop-blur">
              <div className="tnum text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]">{sum.size}</div>
              <div className="tnum mt-0.5 text-[14px]" style={{ color: MUTED }}>
                {sum.cells}, {t.heightLabel.toLowerCase()} {sum.height} ({t.layers(sum.layers)})
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip color={FAM.profile}>{t.profile}{t.sep}{sum.profile}</Chip>
              {s.magnets && <Chip color={FAM.magnets}>{t.magnets} {sum.magnets}</Chip>}
              {s.screws && <Chip color={FAM.screws}>{t.screws} {sum.screws}</Chip>}
            </div>
          </div>
        </main>
      </div>

      {/* ---------- Mobile : barre + panneau par le bas ---------- */}
      <MobileSheet ctx={ctx} sum={sum} />

      {toast && (
        <div className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-lg px-3 py-2 text-[14px] text-white shadow-lg" style={{ background: INK }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================= Liste des réglages ================= */

function SettingsList({ ctx, sum }: { ctx: Ctx; sum: ReturnType<typeof summaries> }) {
  const { s, set, t } = ctx;
  const locale = s.lang === "fr" ? "fr-FR" : "en-US";
  const lenStep = s.unit === "in" ? 0.05 : 1;

  return (
    <div className="pb-24 md:pb-10">
      <p className="px-5 pt-5 pb-1 text-[15px] leading-snug" style={{ color: MUTED }}>{t.tagline}</p>

      {/* Taille */}
      <Section color={FAM.size} icon={<RulerGlyph className="size-4" />} title={t.size} summary={sum.cells}>
        <Tabs.Root value={s.sizeMode} onValueChange={(v) => set({ sizeMode: v as "drawer" | "cells" })}>
          <Tabs.List className="relative grid grid-cols-2 gap-1 rounded-xl bg-[#F1F3F8] p-1">
            {([["drawer", s.unit === "in" ? t.sizeDrawerIn : t.sizeDrawer, <DrawerGlyph key="d" className="h-6 w-8" />],
              ["cells", t.sizeCells, <CellsGlyph key="c" className="h-6 w-8" />]] as const).map(([v, label, glyph]) => (
              <Tabs.Tab key={v} value={v}
                className="relative z-1 flex h-11 items-center justify-center gap-2 rounded-lg text-[14px] font-medium text-[#626B7E] outline-none data-active:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                {glyph}{label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="absolute top-1 left-0 h-11 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-lg bg-white shadow-[0_1px_2px_rgba(23,28,40,.12),0_0_0_1.5px_var(--accent)] transition-[translate,width] duration-200" />
          </Tabs.List>
          <Tabs.Panel value="drawer" className="mt-4 grid grid-cols-2 gap-3">
            <Num label={t.width} value={toUnit(s.drawerW, s.unit)} unit={s.unit} step={lenStep} locale={locale} onChange={(v) => set({ drawerW: fromUnit(v, s.unit) })} />
            <Num label={t.depth} value={toUnit(s.drawerD, s.unit)} unit={s.unit} step={lenStep} locale={locale} onChange={(v) => set({ drawerD: fromUnit(v, s.unit) })} />
          </Tabs.Panel>
          <Tabs.Panel value="cells" className="mt-4 grid grid-cols-2 gap-3">
            <Num label={t.cols} value={s.cellsX} unit="×" step={1} locale={locale} onChange={(v) => set({ cellsX: Math.max(1, Math.round(v)) })} />
            <Num label={t.rows} value={s.cellsY} unit="×" step={1} locale={locale} onChange={(v) => set({ cellsY: Math.max(1, Math.round(v)) })} />
            <Num label={t.marginX} value={toUnit(s.marginX, s.unit)} unit={s.unit} step={lenStep} locale={locale} onChange={(v) => set({ marginX: fromUnit(v, s.unit) })} />
            <Num label={t.marginY} value={toUnit(s.marginY, s.unit)} unit={s.unit} step={lenStep} locale={locale} onChange={(v) => set({ marginY: fromUnit(v, s.unit) })} />
          </Tabs.Panel>
        </Tabs.Root>
        <p className="tnum mt-3 text-[14px]" style={{ color: MUTED }}>
          {t.margin}{t.sep}{Math.round(ctx.layout.marginLeft + ctx.layout.marginRight)} × {Math.round(ctx.layout.marginBack + ctx.layout.marginFront)} mm
        </p>
      </Section>

      {/* Alignement */}
      <Section color={FAM.align} icon={<TargetGlyph className="size-4" />} title={t.alignment} summary={sum.align}>
        <div className="flex items-start gap-4">
          <ToggleGroup value={[s.align]} onValueChange={(v) => v[0] && set({ align: v[0] as typeof s.align })}
            className="grid shrink-0 grid-cols-3 gap-1.5">
            {ALIGNS.map((a) => (
              <Toggle key={a} value={a} aria-label={t.alignNames[a]}
                className="grid h-11 w-13 place-items-center rounded-lg border border-[#E1E5EE] text-[#8A93A6] outline-none hover:border-[var(--accent)] data-pressed:border-[var(--accent)] data-pressed:bg-[color-mix(in_srgb,var(--accent)_10%,white)] data-pressed:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <AlignGlyph pos={a} className="h-7 w-9" />
              </Toggle>
            ))}
          </ToggleGroup>
          <div className="pt-1">
            <p className="text-[14px] leading-snug" style={{ color: MUTED }}>{t.alignHint}</p>
          </div>
        </div>
      </Section>

      {/* Profil de poche */}
      <Section color={FAM.profile} icon={<ProfileIcon className="size-4" />} title={t.profile} summary={sum.profile}>
        <ToggleGroup value={[s.profile]} onValueChange={(v) => v[0] && set({ profile: v[0] as "hybrid" | "flush" })} className="grid grid-cols-2 gap-2.5">
          {(["hybrid", "flush"] as const).map((p) => (
            <Toggle key={p} value={p}
              className="group flex flex-col items-stretch rounded-xl border-[1.5px] border-[#E1E5EE] p-2.5 text-left outline-none hover:border-[color-mix(in_srgb,var(--accent)_50%,white)] data-pressed:border-[var(--accent)] data-pressed:bg-[color-mix(in_srgb,var(--accent)_7%,white)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <div className="rounded-lg bg-[#F4F6FA] px-2 py-2 text-[#8A93A6] group-data-pressed:bg-white group-data-pressed:text-[#3C4659]">
                <ProfileGlyph kind={p} className="h-auto w-full" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[15px] font-semibold">{p === "hybrid" ? t.hybrid : t.flush}</span>
                {p === "hybrid" && <span className="rounded-full px-1.5 py-px text-[12px] font-medium text-white" style={{ background: FAM.profile }}>{t.recommended}</span>}
              </div>
              <span className="mt-0.5 text-[13px] leading-snug" style={{ color: MUTED }}>{p === "hybrid" ? t.hybridDesc : t.flushDesc}</span>
            </Toggle>
          ))}
        </ToggleGroup>
      </Section>

      {/* Aimants */}
      <Section color={FAM.magnets} icon={<MagnetIcon className="size-4" />} title={t.magnets} summary={sum.magnets}
        toggle={<Toggler checked={s.magnets} onChange={(v) => set({ magnets: v })} label={t.magnets} />}>
        {!s.magnets ? (
          <Explainer glyph={<MagnetGlyph className="h-10 w-14" />} text={t.magnetsDesc} />
        ) : (
          <div className="flex flex-col gap-4">
            <SliderRow label={t.diameter} value={s.magnetD} min={3} max={12} step={0.1} locale={locale} onChange={(v) => set({ magnetD: v })} />
            <SliderRow label={t.thickness} value={s.magnetH} min={1} max={4} step={0.1} locale={locale} onChange={(v) => set({ magnetH: v })} />
            <SwitchRow glyph={<MagnetGlyph release className="h-8 w-11" />} label={t.releaseHoles} desc={t.releaseDesc} checked={s.magnetRelease} onChange={(v) => set({ magnetRelease: v })} />
          </div>
        )}
      </Section>

      {/* Vis */}
      <Section color={FAM.screws} icon={<ScrewIcon className="size-4" />} title={t.screws} summary={sum.screws}
        toggle={<Toggler checked={s.screws} onChange={(v) => set({ screws: v })} label={t.screws} />}>
        {!s.screws ? (
          <Explainer glyph={<ScrewGlyph className="h-10 w-14" />} text={t.screwsDesc} />
        ) : (
          <div className="flex flex-col gap-4">
            <SliderRow label={t.shaft} value={s.screwShaft} min={2} max={6} step={0.1} locale={locale} onChange={(v) => set({ screwShaft: v })} />
            <SliderRow label={t.head} value={s.screwHead} min={2} max={8} step={0.1} locale={locale} onChange={(v) => set({ screwHead: v })} />
          </div>
        )}
      </Section>

      {/* Avancé */}
      <Collapsible.Root className="border-t px-5 py-4" style={{ borderColor: LINE, ...acc(FAM.advanced) }}>
        <Collapsible.Trigger className="group flex w-full items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          <Swatch color={FAM.advanced}><AdvancedGlyph className="size-4" /></Swatch>
          <span className="text-[16px] font-semibold">{t.advanced}</span>
          <ChevronDown className="ml-auto size-5 text-[#8A93A6] transition-transform group-data-panel-open:rotate-180" />
        </Collapsible.Trigger>
        <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0">
          <div className="flex flex-col gap-4 pt-4">
            <p className="flex gap-2 rounded-lg bg-[#FFF4E0] p-3 text-[14px] leading-snug text-[#7A4B00]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {t.advancedWarn}
            </p>
            <SliderRow label={t.cellSize} value={s.cellSize} min={20} max={80} step={0.5} locale={locale} onChange={(v) => set({ cellSize: v })} />
            <SliderRow label={t.tolerance} value={s.tolerance} min={0} max={0.5} step={0.05} locale={locale} onChange={(v) => set({ tolerance: v })} />
            <SliderRow label={t.outerRadius} value={s.outerRadius} min={0} max={10} step={0.5} locale={locale} onChange={(v) => set({ outerRadius: v })} />
            <SliderRow label={t.bottomChamfer} value={s.bottomChamfer} min={0} max={3} step={0.1} locale={locale} onChange={(v) => set({ bottomChamfer: v })} />
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}

/* ================= Briques du système A ================= */

function Section({ color, icon, title, summary, toggle, children }: {
  color: string; icon: ReactNode; title: string; summary: string; toggle?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="relative border-t px-5 pt-4 pb-5 first-of-type:border-t-0" style={{ borderColor: LINE, ...acc(color) }}>
      <div className="mb-3.5 flex items-center gap-3">
        <Swatch color={color}>{icon}</Swatch>
        <h2 className="text-[16px] font-semibold tracking-[-0.005em]">{title}</h2>
        <span className="tnum ml-auto truncate text-[14px] font-medium" style={{ color }}>{toggle ? null : summary}</span>
        {toggle}
      </div>
      {children}
    </section>
  );
}

function Swatch({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg text-white" style={{ background: color }}>
      {children}
    </span>
  );
}

function Toggler({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch.Root checked={checked} onCheckedChange={onChange} aria-label={label}
      className="relative flex h-6 w-11 shrink-0 rounded-full bg-[#D6DBE5] p-0.5 transition-colors outline-none data-checked:bg-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">
      <Switch.Thumb className="size-5 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5" />
    </Switch.Root>
  );
}

function Explainer({ glyph, text }: { glyph: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#F4F6FA] px-3 py-2.5 text-[#8A93A6]">
      {glyph}
      <p className="text-[14px] leading-snug" style={{ color: MUTED }}>{text}</p>
    </div>
  );
}

function SwitchRow({ glyph, label, desc, checked, onChange }: { glyph: ReactNode; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E1E5EE] px-3 py-2.5 text-[#8A93A6]">
      {glyph}
      <span className="flex-1">
        <span className="block text-[15px] font-medium" style={{ color: INK }}>{label}</span>
        <span className="block text-[13px] leading-snug" style={{ color: MUTED }}>{desc}</span>
      </span>
      <Toggler checked={checked} onChange={onChange} label={label} />
    </label>
  );
}

function Num({ label, value, unit, step, locale, onChange }: { label: string; value: number; unit: string; step: number; locale: string; onChange: (v: number) => void }) {
  return (
    <NumberField.Root value={value} step={step} min={0} locale={locale} onValueChange={(v) => v != null && onChange(v)} className="flex flex-col gap-1.5">
      <NumberField.ScrubArea className="cursor-ew-resize">
        <label className="cursor-ew-resize text-[14px] font-medium" style={{ color: MUTED }}>{label}</label>
      </NumberField.ScrubArea>
      <NumberField.Group className="flex h-11 items-center rounded-xl border-[1.5px] border-[#DDE2EB] bg-white pr-3 focus-within:border-[var(--accent)]">
        <NumberField.Input className="tnum h-full w-full min-w-0 rounded-xl bg-transparent px-3 text-[17px] font-medium outline-none" />
        <span className="text-[14px]" style={{ color: MUTED }}>{unit}</span>
      </NumberField.Group>
    </NumberField.Root>
  );
}

function SliderRow({ label, value, min, max, step, locale, onChange }: { label: string; value: number; min: number; max: number; step: number; locale: string; onChange: (v: number) => void }) {
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return (
    <div data-base-ui-swipe-ignore>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[14px] font-medium" style={{ color: MUTED }}>{label}</span>
        <span className="tnum text-[15px] font-semibold">{fmt.format(value)} <span className="font-normal" style={{ color: MUTED }}>mm</span></span>
      </div>
      <Slider.Root value={value} min={min} max={max} step={step} onValueChange={(v) => onChange(v as number)}>
        <Slider.Control className="flex h-6 w-full touch-none items-center select-none">
          <Slider.Track className="h-1.5 w-full rounded-full bg-[#E6E9F0]">
            <Slider.Indicator className="rounded-full bg-[var(--accent)]" />
            <Slider.Thumb aria-label={label} className="size-[18px] rounded-full border-[3px] border-[var(--accent)] bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] outline-none has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}

function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/90 py-1 pr-2.5 pl-2 text-[13px] font-medium shadow-[0_1px_2px_rgba(23,28,40,.1)]">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function Segmented({ value, options, onChange, label }: { value: string; options: [string, string][]; onChange: (v: string) => void; label: string }) {
  return (
    <ToggleGroup aria-label={label} value={[value]} onValueChange={(v) => v[0] && onChange(v[0])} className="flex h-9 rounded-lg bg-[#F1F3F8] p-0.5">
      {options.map(([v, l]) => (
        <Toggle key={v} value={v} className="rounded-md px-2.5 text-[14px] font-medium text-[#626B7E] outline-none data-pressed:bg-white data-pressed:text-[#171C28] data-pressed:shadow-[0_1px_2px_rgba(23,28,40,.15)] focus-visible:ring-2 focus-visible:ring-[#2459E0]">
          {l}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

function GhostButton({ children, icon, onClick }: { children: ReactNode; icon: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[14px] font-medium text-[#3C4659] hover:bg-[#F1F3F8] focus-visible:ring-2 focus-visible:ring-[#2459E0] focus-visible:outline-none">
      {icon}<span className="hidden xl:inline">{children}</span>
    </button>
  );
}

function PrintProfile({ ctx, summary }: { ctx: Ctx; summary: string }) {
  const { s, set, t } = ctx;
  return (
    <Popover.Root>
      <Popover.Trigger className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE2EB] px-2.5 text-[14px] font-medium outline-none hover:bg-[#F7F8FB] focus-visible:ring-2 focus-visible:ring-[#0C7FB0]" style={{ color: FAM.print }}>
        <NozzleGlyph className="size-4" />
        <span className="tnum">{summary}</span>
        <ChevronDown className="size-4 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="font-a w-72 rounded-xl border border-[#E3E7EF] bg-white p-4 text-[#171C28] shadow-[0_16px_40px_-12px_rgba(23,28,40,.3)] outline-none">
            <Popover.Title className="mb-3 text-[15px] font-semibold">{t.printProfile}</Popover.Title>
            <PrintFields ctx={ctx} />
            <p className="mt-3 text-[13px] leading-snug" style={{ color: MUTED }}>
              {t.heightLabel}{t.sep}{Math.round(ctx.layout.height * 100) / 100} mm, {t.layers(Math.round(ctx.layout.height / s.layer))}
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PrintFields({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  return (
    <div className="flex flex-col gap-3" style={acc(FAM.print)}>
      <Pick label={t.nozzle} value={String(s.nozzle)} options={["0.2", "0.4", "0.6", "0.8"]} onChange={(v) => set({ nozzle: +v })} lang={s.lang} />
      <Pick label={t.layer} value={String(s.layer)} options={["0.1", "0.12", "0.16", "0.2", "0.28"]} onChange={(v) => set({ layer: +v })} lang={s.lang} />
    </div>
  );
}

function Pick({ label, value, options, onChange, lang }: { label: string; value: string; options: string[]; onChange: (v: string) => void; lang: string }) {
  return (
    <div>
      <div className="mb-1 text-[13px] font-medium" style={{ color: MUTED }}>{label}</div>
      <ToggleGroup value={[value]} onValueChange={(v) => v[0] && onChange(v[0])} className="flex gap-1">
        {options.map((o) => (
          <Toggle key={o} value={o} className="tnum h-9 flex-1 rounded-lg border border-[#E1E5EE] text-[14px] font-medium outline-none data-pressed:border-[var(--accent)] data-pressed:bg-[color-mix(in_srgb,var(--accent)_10%,white)] data-pressed:text-[var(--accent)]">
            {lang === "fr" ? o.replace(".", ",") : o}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}

function DownloadButton({ t, compact }: { t: Ctx["t"]; compact?: boolean }) {
  return (
    <div className="flex">
      <button className="flex h-9 items-center gap-2 rounded-l-lg pr-3 pl-3 text-[14px] font-semibold text-white" style={{ background: INK }}>
        <Download className="size-4" /> {compact ? "3MF" : `${t.download} 3MF`}
      </button>
      <Menu.Root>
        <Menu.Trigger aria-label={t.download} className="grid h-9 w-8 place-items-center rounded-r-lg border-l border-white/20 text-white outline-none" style={{ background: INK }}>
          <ChevronDown className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end" className="z-50">
            <Menu.Popup className="font-a min-w-48 rounded-xl border border-[#E3E7EF] bg-white p-1 text-[14px] text-[#171C28] shadow-[0_16px_40px_-12px_rgba(23,28,40,.3)] outline-none">
              {["3MF", "STL"].map((f) => (
                <Menu.Item key={f} className="flex h-9 cursor-default items-center gap-2 rounded-lg px-3 outline-none data-highlighted:bg-[#F1F3F8]">
                  <Download className="size-4 opacity-60" /> {t.downloadAs(f)}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

function MobileMore({ ctx, share }: { ctx: Ctx; share: () => void }) {
  const { s, set, reset, t } = ctx;
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={t.more} className="grid size-9 place-items-center rounded-lg border border-[#DDE2EB]">
        <MoreHorizontal className="size-5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="font-a flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border border-[#E3E7EF] bg-white p-4 text-[#171C28] shadow-[0_16px_40px_-12px_rgba(23,28,40,.3)] outline-none">
            <div className="flex gap-2">
              <Segmented value={s.unit} options={[["mm", "mm"], ["in", "in"]]} onChange={(v) => set({ unit: v as "mm" | "in" })} label={t.units} />
              <Segmented value={s.lang} options={[["fr", "FR"], ["en", "EN"]]} onChange={(v) => set({ lang: v as "fr" | "en" })} label={t.language} />
            </div>
            <div className="text-[14px] font-semibold" style={{ color: FAM.print }}>{t.printProfile}</div>
            <PrintFields ctx={ctx} />
            <div className="flex gap-2 border-t border-[#E3E7EF] pt-3">
              <button onClick={share} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F1F3F8] text-[14px] font-medium"><Link2 className="size-4" />{t.share}</button>
              <button onClick={reset} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F1F3F8] text-[14px] font-medium"><RotateCcw className="size-4" />{t.reset}</button>
            </div>
            <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FFE8A3] text-[14px] font-medium text-[#5B4300]"><Coffee className="size-4" />{t.donate}</a>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MobileSheet({ ctx, sum }: { ctx: Ctx; sum: ReturnType<typeof summaries> }) {
  const { t, s } = ctx;
  const dots = [FAM.size, FAM.align, FAM.profile, s.magnets ? FAM.magnets : null, s.screws ? FAM.screws : null].filter(Boolean) as string[];
  return (
    <Drawer.Root>
      <div className="fixed inset-x-3 bottom-12 z-40 md:hidden">
        <Drawer.Trigger className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-[0_10px_30px_-10px_rgba(23,28,40,.4)]">
          <SlidersHorizontal className="size-5" />
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">{t.settings}</span>
            <span className="tnum block text-[13px]" style={{ color: MUTED }}>{sum.cells}, {sum.size}</span>
          </span>
          <span className="flex -space-x-1">
            {dots.map((c) => <span key={c} className="size-3.5 rounded-full ring-2 ring-white" style={{ background: c }} />)}
          </span>
        </Drawer.Trigger>
      </div>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-[#171C28]/30 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className="font-a flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white text-[#171C28] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]">
            <div className="flex shrink-0 items-center px-5 pt-3 pb-2">
              <div className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-[#D6DBE5]" />
              <Drawer.Title className="mt-2 text-[17px] font-semibold">{t.settings}</Drawer.Title>
              <Drawer.Close aria-label={t.close} className="mt-2 ml-auto grid size-9 place-items-center rounded-full bg-[#F1F3F8]"><X className="size-4" /></Drawer.Close>
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <SettingsList ctx={ctx} sum={sum} />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
