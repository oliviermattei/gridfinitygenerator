"use client";
// PROTOTYPE JETABLE — contenu de chaque famille de réglages (le « quoi »). Chaque direction décide
// du « comment » : sections ouvertes (A) ou accordéon (B), en-têtes, résumés, emplacement.
import { Tabs } from "@base-ui/react/tabs";
import { TriangleAlert } from "lucide-react";
import { fromUnit, toUnit, type Ctx } from "@/lib/settings";
import { AlignPad, ChoiceGroup, LengthField, Segmented, SliderField, SwitchRow, focusRing } from "./kit";
import { CellsArt, DrawerArt, MagnetArt, ProfileArt, ReleaseArt, ScrewArt } from "./illustrations";

const loc = (ctx: Ctx) => (ctx.s.lang === "fr" ? "fr-FR" : "en-US");

export function SizeBody({ ctx }: { ctx: Ctx }) {
  const { s, set, t, layout } = ctx;
  const locale = loc(ctx);
  const step = s.unit === "in" ? 0.05 : 1;
  const mX = layout.marginLeft + layout.marginRight;
  const mY = layout.marginBack + layout.marginFront;
  const n = (v: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: s.unit === "in" ? 2 : 1 }).format(toUnit(v, s.unit));
  return (
    <Tabs.Root value={s.sizeMode} onValueChange={(v) => set({ sizeMode: v as "drawer" | "cells" })}>
      <Tabs.List className="relative grid grid-cols-2 rounded-[var(--r-ctl)] bg-[var(--sunken)] p-[3px]">
        {([
          ["drawer", s.unit === "in" ? t.sizeDrawerIn : t.sizeDrawer, <DrawerArt key="d" className="h-5 w-6" />],
          ["cells", t.sizeCells, <CellsArt key="c" className="h-5 w-6" />],
        ] as const).map(([v, label, art]) => (
          <Tabs.Tab key={v} value={v}
            className={`relative z-[1] flex h-10 items-center justify-center gap-2 rounded-[calc(var(--r-ctl)-2px)] text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)] data-active:text-[var(--ink)] data-active:[--art:var(--accent)] ${focusRing}`}>
            <span className="opacity-80">{art}</span>{label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute top-[3px] left-0 h-10 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-[calc(var(--r-ctl)-2px)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,18,24,.10),0_0_0_1px_var(--line)] transition-[translate,width] duration-200 ease-out" />
      </Tabs.List>
      <Tabs.Panel value="drawer" className="mt-3.5 grid grid-cols-2 gap-2.5">
        <LengthField label={t.width} value={toUnit(s.drawerW, s.unit)} unit={s.unit} step={step} locale={locale} onChange={(v) => set({ drawerW: fromUnit(v, s.unit) })} />
        <LengthField label={t.depth} value={toUnit(s.drawerD, s.unit)} unit={s.unit} step={step} locale={locale} onChange={(v) => set({ drawerD: fromUnit(v, s.unit) })} />
      </Tabs.Panel>
      <Tabs.Panel value="cells" className="mt-3.5 grid grid-cols-2 gap-2.5">
        <LengthField label={t.cols} value={s.cellsX} unit="×" step={1} min={1} max={60} locale={locale} onChange={(v) => set({ cellsX: Math.max(1, Math.round(v)) })} />
        <LengthField label={t.rows} value={s.cellsY} unit="×" step={1} min={1} max={60} locale={locale} onChange={(v) => set({ cellsY: Math.max(1, Math.round(v)) })} />
        <LengthField label={t.marginX} value={toUnit(s.marginX, s.unit)} unit={s.unit} step={step} min={0} locale={locale} onChange={(v) => set({ marginX: fromUnit(v, s.unit) })} />
        <LengthField label={t.marginY} value={toUnit(s.marginY, s.unit)} unit={s.unit} step={step} min={0} locale={locale} onChange={(v) => set({ marginY: fromUnit(v, s.unit) })} />
      </Tabs.Panel>
      <p className="tnum mt-3 text-[12.5px] text-[var(--muted)]">
        {t.cells(layout.nx, layout.ny)}, {t.margin.toLowerCase()} {n(mX)} × {n(mY)} {s.unit}
      </p>
    </Tabs.Root>
  );
}

export function AlignBody({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  return (
    <div className="flex items-center gap-4">
      <AlignPad value={s.align} onChange={(a) => set({ align: a })} names={t.alignNames} label={t.alignment} />
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-[var(--ink)]">{t.alignNames[s.align]}</div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--muted)]">{t.alignHint}</p>
      </div>
    </div>
  );
}

export function ProfileBody({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  return (
    <ChoiceGroup label={t.profile} value={s.profile} onChange={(v) => set({ profile: v })}
      options={[
        { value: "hybrid", label: t.hybrid, badge: t.recommended, desc: t.hybridDesc, art: <ProfileArt kind="hybrid" className="h-auto w-full max-w-[128px]" /> },
        { value: "flush", label: t.flush, desc: t.flushDesc, art: <ProfileArt kind="flush" className="h-auto w-full max-w-[128px]" /> },
      ]} />
  );
}

export function MagnetsBody({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  const locale = loc(ctx);
  if (!s.magnets) return <OffHint art={<MagnetArt className="h-9 w-12" />} text={t.magnetsOffHint} />;
  return (
    <div className="flex flex-col gap-4">
      <SliderField label={t.diameter} value={s.magnetD} min={3} max={12} step={0.1} locale={locale} onChange={(v) => set({ magnetD: v })} />
      <SliderField label={t.thickness} value={s.magnetH} min={1} max={4} step={0.1} locale={locale} onChange={(v) => set({ magnetH: v })} />
      <ChoiceGroup label={t.releaseHoles} value={s.magnetRelease ? "through" : "solid"} onChange={(v) => set({ magnetRelease: v === "through" })} compact
        options={[
          { value: "solid", label: t.releaseNone, art: <ReleaseArt through={false} className="h-10 w-14" /> },
          { value: "through", label: t.releaseThrough, art: <ReleaseArt through className="h-10 w-14" /> },
        ]} />
    </div>
  );
}

export function ScrewsBody({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  const locale = loc(ctx);
  if (!s.screws) return <OffHint art={<ScrewArt className="h-9 w-12" />} text={t.screwsOffHint} />;
  return (
    <div className="flex flex-col gap-4">
      <SliderField label={t.shaft} value={s.screwShaft} min={2} max={6} step={0.1} locale={locale} onChange={(v) => set({ screwShaft: v })} />
      <SliderField label={t.head} value={s.screwHead} min={2} max={8} step={0.1} locale={locale} onChange={(v) => set({ screwHead: v })} />
    </div>
  );
}

export function AdvancedBody({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  const locale = loc(ctx);
  return (
    <div className="flex flex-col gap-4">
      <p className="flex gap-2 rounded-[var(--r-ctl)] border border-[var(--line)] bg-[var(--sunken)] px-3 py-2.5 text-[12.5px] leading-snug text-[var(--ink-soft)]">
        <TriangleAlert className="mt-px size-4 shrink-0 text-[var(--accent-strong)]" /> {t.advancedWarn}
      </p>
      <SliderField label={t.cellSize} value={s.cellSize} min={20} max={80} step={0.5} locale={locale} onChange={(v) => set({ cellSize: v })} />
      <SliderField label={t.tolerance} value={s.tolerance} min={0} max={0.5} step={0.05} locale={locale} onChange={(v) => set({ tolerance: v })} />
      <SliderField label={t.outerRadius} value={s.outerRadius} min={0} max={10} step={0.5} locale={locale} onChange={(v) => set({ outerRadius: v })} />
      <SliderField label={t.bottomChamfer} value={s.bottomChamfer} min={0} max={3} step={0.1} locale={locale} onChange={(v) => set({ bottomChamfer: v })} />
    </div>
  );
}

export function PrintBody({ ctx }: { ctx: Ctx }) {
  const { s, set, t, layout } = ctx;
  const f = (v: string) => (s.lang === "fr" ? v.replace(".", ",") : v);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-1.5 text-[12.5px] font-medium text-[var(--muted)]">{t.nozzle} (mm)</div>
        <Segmented full label={t.nozzle} value={String(s.nozzle)} onChange={(v) => set({ nozzle: +v })}
          options={["0.2", "0.4", "0.6", "0.8"].map((o) => ({ value: o, label: f(o) }))} />
      </div>
      <div>
        <div className="mb-1.5 text-[12.5px] font-medium text-[var(--muted)]">{t.layer} (mm)</div>
        <Segmented full label={t.layer} value={String(s.layer)} onChange={(v) => set({ layer: +v })}
          options={["0.12", "0.16", "0.2", "0.28"].map((o) => ({ value: o, label: f(o) }))} />
      </div>
      <p className="tnum text-[12.5px] text-[var(--muted)]">
        {t.heightLabel}{t.sep}{f(String(Math.round(layout.height * 100) / 100))} mm, {t.layers(Math.round(layout.height / s.layer))}
      </p>
    </div>
  );
}

function OffHint({ art, text }: { art: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-[var(--faint)]">
      <span className="grid h-11 w-14 shrink-0 place-items-center rounded-[var(--r-ctl)] bg-[var(--sunken)]">{art}</span>
      <p className="text-[12.5px] leading-snug text-[var(--muted)]">{text}</p>
    </div>
  );
}

export { SwitchRow };
