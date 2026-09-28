"use client";
// PROTOTYPE JETABLE — Direction C « Blocs ».
// Chaque famille est un bloc de couleur franche, replié sur une ligne de résumé ; un seul ouvert à la fois.
// Contrôles gros et ronds, lisibles au doigt. Typo : Unbounded (titres) + Figtree (texte).
import dynamic from "next/dynamic";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { Tabs } from "@base-ui/react/tabs";
import { Switch } from "@base-ui/react/switch";
import { Slider } from "@base-ui/react/slider";
import { NumberField } from "@base-ui/react/number-field";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { Check, ChevronDown, Coffee, Download, Link2, Plus, RotateCcw, TriangleAlert, X } from "lucide-react";
import { ALIGNS, fromUnit, toUnit, type Ctx } from "@/lib/settings";
import { summaries, copyLink } from "@/lib/summary";
import {
  AdvancedGlyph, AlignGlyph, BrandMark, CellsGlyph, DrawerGlyph, MagnetGlyph, MagnetIcon, NozzleGlyph,
  ProfileGlyph, ProfileIcon, RulerGlyph, ScrewGlyph, ScrewIcon, TargetGlyph,
} from "@/components/illustrations";

const Preview3D = dynamic(() => import("@/components/Preview3D"), { ssr: false });

type Fam = "size" | "align" | "profile" | "magnets" | "screws" | "advanced";
/* bg = couleur du bloc ; fg = texte posé dessus ; soft = fond clair de la même famille. */
const FAM: Record<Fam | "print", { bg: string; fg: string; soft: string }> = {
  size: { bg: "#3B55F6", fg: "#fff", soft: "#E8ECFF" },
  align: { bg: "#8B3FEA", fg: "#fff", soft: "#F2E9FE" },
  profile: { bg: "#00A375", fg: "#fff", soft: "#DDF6EC" },
  magnets: { bg: "#FF3D7A", fg: "#fff", soft: "#FFE5EE" },
  screws: { bg: "#FFB21C", fg: "#2A1F00", soft: "#FFF2D6" },
  advanced: { bg: "#2C2940", fg: "#fff", soft: "#ECEBF2" },
  print: { bg: "#17B3D3", fg: "#04262E", soft: "#DDF5FA" },
};
const INK = "#1D1A2E";
const MUTED = "#686579";
const PAGE = "#F3F3F6";
const acc = (f: keyof typeof FAM) => ({ "--accent": FAM[f].bg, "--soft": FAM[f].soft }) as CSSProperties;
const display = "font-c-display";

export default function VariantC(ctx: Ctx) {
  const { s, set, reset, layout, t } = ctx;
  const sum = summaries(ctx);
  const [open, setOpen] = useState<Fam[]>(["size"]);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const share = () => { copyLink(); setToast(t.shared); setTimeout(() => setToast(null), 1600); };
  const jump = (f: Fam) => { setOpen([f]); setSheet(true); };

  const recipe: { f: Fam; label: string }[] = [
    { f: "size", label: sum.cells },
    { f: "align", label: sum.align },
    { f: "profile", label: sum.profile },
    { f: "magnets", label: s.magnets ? `${t.magnets} ${sum.magnets}` : `${t.magnets}${t.sep}${t.off.toLowerCase()}` },
    { f: "screws", label: s.screws ? `${t.screws} ${sum.screws}` : `${t.screws}${t.sep}${t.off.toLowerCase()}` },
  ];

  return (
    <div className="font-c flex h-dvh flex-col text-[16px]" style={{ background: PAGE, color: INK }}>
      {/* ---------- En-tête ---------- */}
      <header className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-2 md:gap-3 md:px-5 md:pt-4 md:pb-3">
        <BrandMark className="size-8 text-[#3B55F6]" />
        <span className={`${display} text-[20px] font-semibold tracking-[-0.02em] md:text-[23px]`}>pocketfit</span>
        <span className="ml-2 hidden rounded-full bg-white px-3 py-1 text-[14px] font-medium lg:block" style={{ color: MUTED }}>{t.generator}</span>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Pill value={s.unit} opts={[["mm", "mm"], ["in", "in"]]} onChange={(v) => set({ unit: v as "mm" | "in" })} />
          <Pill value={s.lang} opts={[["fr", "FR"], ["en", "EN"]]} onChange={(v) => set({ lang: v as "fr" | "en" })} />
          <PrintPop ctx={ctx} label={sum.print} />
          <Round label={t.share} onClick={share}><Link2 className="size-5" /></Round>
          <Round label={t.reset} onClick={reset}><RotateCcw className="size-5" /></Round>
          <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 rounded-full bg-[#FFDD55] px-4 text-[15px] font-semibold text-[#3D2E00] hover:bg-[#FFD333]">
            <Coffee className="size-5" /> <span className="hidden xl:inline">{t.donate}</span>
          </a>
        </div>
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <MobileExtras ctx={ctx} share={share} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 px-3 pb-3 md:grid-cols-[1fr_440px] md:gap-4 md:px-4 md:pb-4">
        {/* ---------- Aperçu ---------- */}
        <main className="relative mb-28 min-h-0 overflow-hidden rounded-[28px] md:mb-0" style={{ background: "linear-gradient(180deg,#E3E6F3 0%, #D5D9EA 100%)" }}>
          <Preview3D className="absolute inset-0" s={s} layout={layout}
            palette={{ plate: "#C9CDDD", wall: "#FFFFFF", margin: "#F6F6FA", magnet: FAM.magnets.bg, screw: FAM.screws.bg }} />
          <div className="pointer-events-none absolute top-4 left-5 md:top-6 md:left-7">
            <div className={`${display} tnum text-[26px] leading-none font-semibold tracking-[-0.03em] md:text-[44px]`}>{sum.size}</div>
            <div className="tnum mt-2 text-[15px] font-medium md:text-[17px]" style={{ color: MUTED }}>
              {t.heightLabel} {sum.height}, {t.layers(sum.layers)}
            </div>
          </div>
          {/* Recette : un jeton par famille, cliquable */}
          <div className="absolute inset-x-3 top-[5.5rem] no-scrollbar flex gap-1.5 overflow-x-auto pb-1 md:top-auto md:inset-x-5 md:bottom-5 md:flex-wrap">
            {recipe.map(({ f, label }) => (
              <button key={f} onClick={() => (window.innerWidth < 768 ? jump(f) : setOpen([f]))}
                className="tnum flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2 text-[14px] font-semibold shadow-[0_2px_0_rgba(0,0,0,.08)] transition-transform hover:-translate-y-0.5"
                style={{ background: FAM[f].bg, color: FAM[f].fg, opacity: (f === "magnets" && !s.magnets) || (f === "screws" && !s.screws) ? 0.55 : 1 }}>
                <span className="grid size-5 place-items-center rounded-full bg-white/25">{famIcon(f, "size-3.5")}</span>
                {label}
              </button>
            ))}
          </div>
        </main>

        {/* ---------- Colonne de blocs (desktop) ---------- */}
        <aside className="hidden min-h-0 flex-col gap-3 md:flex">
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[28px] pr-1">
            <Blocks ctx={ctx} open={open} setOpen={setOpen} />
          </div>
          <DownloadC t={t} />
        </aside>
      </div>

      {/* ---------- Mobile : panneau par le bas ---------- */}
      <div className="fixed inset-x-3 bottom-12 z-30 flex gap-2 md:hidden">
        <button onClick={() => setSheet(true)} className={`${display} flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(29,26,46,.35)]`}>
          <Plus className="size-5" /> {t.settings}
        </button>
        <DownloadC t={t} compact />
      </div>
      <Drawer.Root open={sheet} onOpenChange={setSheet}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-50 bg-[#1D1A2E]/35 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
            <Drawer.Popup className="font-c flex max-h-[90dvh] w-full flex-col rounded-t-[30px] text-[#1D1A2E] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]" style={{ background: PAGE }}>
              <div className="relative flex shrink-0 items-center px-5 pt-5 pb-3">
                <div className="absolute top-2 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[#CFCDD9]" />
                <Drawer.Title className={`${display} text-[19px] font-semibold`}>{t.settings}</Drawer.Title>
                <Drawer.Close aria-label={t.close} className="ml-auto grid size-10 place-items-center rounded-full bg-white"><X className="size-5" /></Drawer.Close>
              </div>
              <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-8">
                <Blocks ctx={ctx} open={open} setOpen={setOpen} />
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>

      {toast && <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[15px] font-semibold text-white" style={{ background: INK }}>{toast}</div>}
    </div>
  );
}

function famIcon(f: Fam, cls: string) {
  switch (f) {
    case "size": return <RulerGlyph className={cls} />;
    case "align": return <TargetGlyph className={cls} />;
    case "profile": return <ProfileIcon className={cls} />;
    case "magnets": return <MagnetIcon className={cls} />;
    case "screws": return <ScrewIcon className={cls} />;
    case "advanced": return <AdvancedGlyph className={cls} />;
  }
}

/* ================= Blocs ================= */

function Blocks({ ctx, open, setOpen }: { ctx: Ctx; open: Fam[]; setOpen: (v: Fam[]) => void }) {
  const { s, set, t, layout } = ctx;
  const sum = summaries(ctx);
  const locale = s.lang === "fr" ? "fr-FR" : "en-US";
  const lstep = s.unit === "in" ? 0.05 : 1;

  return (
    <Accordion.Root value={open} onValueChange={(v) => setOpen(v as Fam[])} className="flex flex-col gap-2.5">
      <Block f="size" title={t.size} summary={sum.cells}>
        <Tabs.Root value={s.sizeMode} onValueChange={(v) => set({ sizeMode: v as "drawer" | "cells" })}>
          <Tabs.List className="grid grid-cols-2 gap-2">
            {([["drawer", s.unit === "in" ? t.sizeDrawerIn : t.sizeDrawer, <DrawerGlyph key="d" className="h-9 w-12" />],
              ["cells", t.sizeCells, <CellsGlyph key="c" className="h-9 w-12" />]] as const).map(([v, l, g]) => (
              <Tabs.Tab key={v} value={v} className="flex flex-col items-center gap-1 rounded-[18px] bg-[#F3F3F6] py-3 text-[15px] font-semibold text-[#686579] outline-none data-active:bg-[var(--soft)] data-active:text-[var(--accent)] data-active:shadow-[inset_0_0_0_2.5px_var(--accent)] focus-visible:ring-3 focus-visible:ring-[var(--accent)]/40">
                {g}{l}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value="drawer" className="mt-4 grid grid-cols-2 gap-2.5">
            <BigNum label={t.width} value={toUnit(s.drawerW, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ drawerW: fromUnit(v, s.unit) })} />
            <BigNum label={t.depth} value={toUnit(s.drawerD, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ drawerD: fromUnit(v, s.unit) })} />
          </Tabs.Panel>
          <Tabs.Panel value="cells" className="mt-4 grid grid-cols-2 gap-2.5">
            <BigNum label={t.cols} value={s.cellsX} unit="" step={1} locale={locale} onChange={(v) => set({ cellsX: Math.max(1, Math.round(v)) })} />
            <BigNum label={t.rows} value={s.cellsY} unit="" step={1} locale={locale} onChange={(v) => set({ cellsY: Math.max(1, Math.round(v)) })} />
            <BigNum label={t.marginX} value={toUnit(s.marginX, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ marginX: fromUnit(v, s.unit) })} />
            <BigNum label={t.marginY} value={toUnit(s.marginY, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ marginY: fromUnit(v, s.unit) })} />
          </Tabs.Panel>
        </Tabs.Root>
        <p className="tnum mt-3 text-[15px]" style={{ color: MUTED }}>
          {t.margin}{t.sep}{Math.round(layout.marginLeft + layout.marginRight)} × {Math.round(layout.marginBack + layout.marginFront)} mm
        </p>
      </Block>

      <Block f="align" title={t.alignment} summary={sum.align}>
        <ToggleGroup value={[s.align]} onValueChange={(v) => v[0] && set({ align: v[0] as typeof s.align })} className="grid grid-cols-3 gap-2">
          {ALIGNS.map((a) => (
            <Toggle key={a} value={a} aria-label={t.alignNames[a]}
              className="grid h-16 place-items-center rounded-[16px] bg-[#F3F3F6] text-[#9C99AB] outline-none data-pressed:bg-[var(--soft)] data-pressed:text-[#5B5870] data-pressed:shadow-[inset_0_0_0_2.5px_var(--accent)] focus-visible:ring-3 focus-visible:ring-[var(--accent)]/40">
              <AlignGlyph pos={a} className="h-10 w-12" />
            </Toggle>
          ))}
        </ToggleGroup>
        <p className="mt-3 text-[15px] leading-snug" style={{ color: MUTED }}>{t.alignHint}</p>
      </Block>

      <Block f="profile" title={t.profile} summary={sum.profile}>
        <ToggleGroup value={[s.profile]} onValueChange={(v) => v[0] && set({ profile: v[0] as "hybrid" | "flush" })} className="grid grid-cols-2 gap-2.5">
          {(["hybrid", "flush"] as const).map((p) => (
            <Toggle key={p} value={p} className="group relative flex flex-col rounded-[20px] bg-[#F3F3F6] p-3 text-left text-[#9C99AB] outline-none data-pressed:bg-[var(--soft)] data-pressed:text-[#3E3B52] data-pressed:shadow-[inset_0_0_0_2.5px_var(--accent)] focus-visible:ring-3 focus-visible:ring-[var(--accent)]/40">
              <span className="absolute top-2.5 right-2.5 hidden size-6 place-items-center rounded-full bg-[var(--accent)] text-white group-data-pressed:grid"><Check className="size-4" strokeWidth={3} /></span>
              <ProfileGlyph kind={p} className="w-full" />
              <span className={`${display} mt-2 text-[16px] font-semibold text-[#1D1A2E]`}>{p === "hybrid" ? t.hybrid : t.flush}</span>
              <span className="mt-1 text-[14px] leading-snug text-[#686579]">{p === "hybrid" ? t.hybridDesc : t.flushDesc}</span>
            </Toggle>
          ))}
        </ToggleGroup>
      </Block>

      <Block f="magnets" title={t.magnets} summary={sum.magnets} on={s.magnets}>
        <BigSwitch checked={s.magnets} onChange={(v) => set({ magnets: v })} label={t.magnets} desc={t.magnetsDesc} glyph={<MagnetGlyph className="h-12 w-16" />} />
        {s.magnets && (
          <div className="mt-4 flex flex-col gap-5">
            <FatSlider label={t.diameter} value={s.magnetD} min={3} max={12} step={0.1} locale={locale} onChange={(v) => set({ magnetD: v })} />
            <FatSlider label={t.thickness} value={s.magnetH} min={1} max={4} step={0.1} locale={locale} onChange={(v) => set({ magnetH: v })} />
            <BigSwitch small checked={s.magnetRelease} onChange={(v) => set({ magnetRelease: v })} label={t.releaseHoles} desc={t.releaseDesc} glyph={<MagnetGlyph release className="h-10 w-13" />} />
          </div>
        )}
      </Block>

      <Block f="screws" title={t.screws} summary={sum.screws} on={s.screws}>
        <BigSwitch checked={s.screws} onChange={(v) => set({ screws: v })} label={t.screws} desc={t.screwsDesc} glyph={<ScrewGlyph className="h-12 w-16" />} />
        {s.screws && (
          <div className="mt-4 flex flex-col gap-5">
            <FatSlider label={t.shaft} value={s.screwShaft} min={2} max={6} step={0.1} locale={locale} onChange={(v) => set({ screwShaft: v })} />
            <FatSlider label={t.head} value={s.screwHead} min={2} max={8} step={0.1} locale={locale} onChange={(v) => set({ screwHead: v })} />
          </div>
        )}
      </Block>

      <Block f="advanced" title={t.advanced} summary={`${s.cellSize} mm`}>
        <p className="mb-4 flex gap-2 rounded-[16px] bg-[#FFF1D1] p-3 text-[14.5px] leading-snug text-[#6B4700]"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{t.advancedWarn}</p>
        <div className="flex flex-col gap-5">
          <FatSlider label={t.cellSize} value={s.cellSize} min={20} max={80} step={0.5} locale={locale} onChange={(v) => set({ cellSize: v })} />
          <FatSlider label={t.tolerance} value={s.tolerance} min={0} max={0.5} step={0.05} locale={locale} onChange={(v) => set({ tolerance: v })} />
          <FatSlider label={t.outerRadius} value={s.outerRadius} min={0} max={10} step={0.5} locale={locale} onChange={(v) => set({ outerRadius: v })} />
          <FatSlider label={t.bottomChamfer} value={s.bottomChamfer} min={0} max={3} step={0.1} locale={locale} onChange={(v) => set({ bottomChamfer: v })} />
        </div>
      </Block>
    </Accordion.Root>
  );
}

function Block({ f, title, summary, on, children }: { f: Fam; title: string; summary: string; on?: boolean; children: ReactNode }) {
  const c = FAM[f];
  const dim = on === false;
  return (
    <Accordion.Item value={f} className="group/item overflow-hidden rounded-[24px] p-1.5" style={{ background: dim ? "#fff" : c.bg, ...acc(f) }}>
      <Accordion.Header>
        <Accordion.Trigger className="group flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-white/70"
          style={{ color: dim ? INK : c.fg }}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: dim ? c.soft : "rgba(255,255,255,.22)", color: dim ? c.bg : c.fg }}>
            {famIcon(f, "size-5")}
          </span>
          <span className={`${display} text-[16px] font-semibold tracking-[-0.01em]`}>{title}</span>
          <span className="tnum ml-auto truncate rounded-full px-3 py-1 text-[14px] font-semibold"
            style={{ background: dim ? "#F3F3F6" : "rgba(255,255,255,.22)", color: dim ? MUTED : c.fg }}>{summary}</span>
          <ChevronDown className="size-5 shrink-0 transition-transform group-data-panel-open:rotate-180" />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-250 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="mt-1 rounded-[18px] bg-white p-4" style={dim ? { boxShadow: `inset 0 0 0 2px ${c.soft}` } : undefined}>{children}</div>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function BigNum({ label, value, unit, step, locale, onChange }: { label: string; value: number; unit: string; step: number; locale: string; onChange: (v: number) => void }) {
  return (
    <NumberField.Root value={value} step={step} min={0} locale={locale} onValueChange={(v) => v != null && onChange(v)}
      className="rounded-[18px] bg-[#F3F3F6] px-4 pt-2.5 pb-2 focus-within:bg-[var(--soft)] focus-within:shadow-[inset_0_0_0_2.5px_var(--accent)]">
      <NumberField.ScrubArea className="cursor-ew-resize">
        <label className="cursor-ew-resize text-[14px] font-semibold" style={{ color: MUTED }}>{label}</label>
      </NumberField.ScrubArea>
      <NumberField.Group className="flex items-baseline gap-1">
        <NumberField.Input className={`${display} tnum w-full min-w-0 bg-transparent text-[26px] font-semibold tracking-[-0.03em] outline-none`} />
        <span className="text-[15px] font-medium" style={{ color: MUTED }}>{unit}</span>
      </NumberField.Group>
    </NumberField.Root>
  );
}

function FatSlider({ label, value, min, max, step, locale, onChange }: { label: string; value: number; min: number; max: number; step: number; locale: string; onChange: (v: number) => void }) {
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return (
    <div data-base-ui-swipe-ignore>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold" style={{ color: MUTED }}>{label}</span>
        <span className={`${display} tnum text-[20px] font-semibold tracking-[-0.02em]`}>{fmt.format(value)}<span className="ml-1 font-c text-[14px] font-medium" style={{ color: MUTED }}>mm</span></span>
      </div>
      <Slider.Root value={value} min={min} max={max} step={step} onValueChange={(v) => onChange(v as number)}>
        <Slider.Control className="flex h-8 w-full touch-none items-center select-none">
          <Slider.Track className="h-3.5 w-full rounded-full bg-[#ECEBF2]">
            <Slider.Indicator className="rounded-full bg-[var(--accent)]" />
            <Slider.Thumb aria-label={label} className="size-7 rounded-full border-[5px] border-white bg-[var(--accent)] shadow-[0_2px_8px_rgba(29,26,46,.3)] outline-none has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent)]/35" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}

function BigSwitch({ checked, onChange, label, desc, glyph, small }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string; glyph: ReactNode; small?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-[#F3F3F6] p-3 text-[#8C89A0]">
      {glyph}
      <span className="flex-1">
        {small && <span className="block text-[15px] font-semibold text-[#1D1A2E]">{label}</span>}
        <span className="block text-[14.5px] leading-snug" style={{ color: MUTED }}>{desc}</span>
      </span>
      <Switch.Root checked={checked} onCheckedChange={onChange} aria-label={label}
        className="relative flex h-8 w-14 shrink-0 rounded-full bg-[#D7D5E0] p-1 outline-none data-checked:bg-[var(--accent)] focus-visible:ring-3 focus-visible:ring-[var(--accent)]/40">
        <Switch.Thumb className="size-6 rounded-full bg-white shadow-md transition-transform duration-200 data-checked:translate-x-6" />
      </Switch.Root>
    </label>
  );
}

function Pill({ value, opts, onChange }: { value: string; opts: [string, string][]; onChange: (v: string) => void }) {
  return (
    <ToggleGroup value={[value]} onValueChange={(v) => v[0] && onChange(v[0])} className="flex h-11 rounded-full bg-white p-1">
      {opts.map(([v, l]) => (
        <Toggle key={v} value={v} className="rounded-full px-3.5 text-[15px] font-semibold text-[#686579] outline-none data-pressed:bg-[#1D1A2E] data-pressed:text-white focus-visible:ring-3 focus-visible:ring-[#3B55F6]/40">{l}</Toggle>
      ))}
    </ToggleGroup>
  );
}

function Round({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} title={label} aria-label={label} className="grid size-11 place-items-center rounded-full bg-white hover:bg-[#E8E8EE] focus-visible:ring-3 focus-visible:ring-[#3B55F6]/40 focus-visible:outline-none">{children}</button>;
}

function PrintPop({ ctx, label }: { ctx: Ctx; label: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger className="flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold outline-none" style={{ background: FAM.print.soft, color: "#0A6F86" }}>
        <NozzleGlyph className="size-5" /><span className="tnum">{label}</span><ChevronDown className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="font-c w-80 rounded-[24px] bg-white p-5 text-[#1D1A2E] shadow-[0_24px_60px_-20px_rgba(29,26,46,.45)] outline-none">
            <Popover.Title className={`${display} mb-3 text-[17px] font-semibold`}>{ctx.t.printProfile}</Popover.Title>
            <PrintFields ctx={ctx} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PrintFields({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  const row = (label: string, value: number, opts: number[], key: "nozzle" | "layer") => (
    <div>
      <div className="mb-1.5 text-[14px] font-semibold" style={{ color: MUTED }}>{label}</div>
      <ToggleGroup value={[String(value)]} onValueChange={(v) => v[0] && set({ [key]: +v[0] })} className="flex gap-1.5">
        {opts.map((o) => (
          <Toggle key={o} value={String(o)} className="tnum h-10 flex-1 rounded-full bg-[#F3F3F6] text-[14px] font-semibold outline-none data-pressed:bg-[#17B3D3] data-pressed:text-[#04262E]">
            {s.lang === "fr" ? String(o).replace(".", ",") : o}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
  return <div className="flex flex-col gap-3">{row(t.nozzle, s.nozzle, [0.2, 0.4, 0.6, 0.8], "nozzle")}{row(t.layer, s.layer, [0.1, 0.12, 0.16, 0.2, 0.28], "layer")}</div>;
}

function DownloadC({ t, compact }: { t: Ctx["t"]; compact?: boolean }) {
  const [fmt, setFmt] = useState("3MF");
  return (
    <div className={`flex ${compact ? "" : "w-full"}`}>
      <button className={`${display} flex h-13 flex-1 items-center justify-center gap-2 rounded-l-full bg-[#1D1A2E] pr-3 pl-5 text-[15px] font-semibold text-white md:h-15 md:text-[17px]`}>
        <Download className="size-5" /> {compact ? fmt : `${t.download} ${fmt}`}
      </button>
      <Menu.Root>
        <Menu.Trigger aria-label={t.download} className="grid h-13 w-12 place-items-center rounded-r-full border-l border-white/15 bg-[#1D1A2E] pr-1 text-white outline-none md:h-15 md:w-14">
          <ChevronDown className="size-5" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="end" side="top" className="z-50">
            <Menu.Popup className="font-c min-w-52 rounded-[20px] bg-white p-1.5 text-[15px] text-[#1D1A2E] shadow-[0_24px_60px_-20px_rgba(29,26,46,.45)] outline-none">
              {["3MF", "STL"].map((f) => (
                <Menu.Item key={f} onClick={() => setFmt(f)} className="flex h-11 cursor-default items-center gap-2 rounded-full px-4 font-semibold outline-none data-highlighted:bg-[#F3F3F6]">
                  {t.downloadAs(f)}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

function MobileExtras({ ctx, share }: { ctx: Ctx; share: () => void }) {
  const { s, set, reset, t } = ctx;
  return (
    <Popover.Root>
      <Popover.Trigger className="flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-semibold">
        {s.lang.toUpperCase()}, {s.unit} <ChevronDown className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="font-c flex w-[min(21rem,calc(100vw-1.5rem))] flex-col gap-3 rounded-[24px] bg-white p-4 text-[#1D1A2E] shadow-[0_24px_60px_-20px_rgba(29,26,46,.45)] outline-none">
            <div className="flex gap-2 rounded-[20px] bg-[#F3F3F6] p-1">
              <Pill value={s.unit} opts={[["mm", "mm"], ["in", "in"]]} onChange={(v) => set({ unit: v as "mm" | "in" })} />
              <Pill value={s.lang} opts={[["fr", "FR"], ["en", "EN"]]} onChange={(v) => set({ lang: v as "fr" | "en" })} />
            </div>
            <div className={`${display} text-[15px] font-semibold`}>{t.printProfile}</div>
            <PrintFields ctx={ctx} />
            <div className="flex gap-2">
              <button onClick={share} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#F3F3F6] font-semibold"><Link2 className="size-4" />{t.share}</button>
              <button onClick={reset} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#F3F3F6] font-semibold"><RotateCcw className="size-4" />{t.reset}</button>
            </div>
            <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#FFDD55] font-semibold text-[#3D2E00]"><Coffee className="size-4" />{t.donate}</a>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
