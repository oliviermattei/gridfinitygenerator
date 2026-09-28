"use client";
// PROTOTYPE JETABLE — Direction B « Établi ».
// L'aperçu occupe tout l'écran, posé sur un tapis de découpe vert. Un rail d'outils colorés à gauche
// n'ouvre qu'une famille de réglages à la fois. Typo : Archivo (titres en largeur étendue). Dense, outil.
import dynamic from "next/dynamic";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Switch } from "@base-ui/react/switch";
import { Slider } from "@base-ui/react/slider";
import { NumberField } from "@base-ui/react/number-field";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { ChevronDown, Coffee, Download, Link2, Minus, Plus, RotateCcw, Settings2, TriangleAlert, X } from "lucide-react";
import { ALIGNS, fromUnit, toUnit, type Ctx } from "@/lib/settings";
import { summaries, copyLink } from "@/lib/summary";
import {
  AdvancedGlyph, AlignGlyph, CellsGlyph, DrawerGlyph, MagnetGlyph, MagnetIcon, NozzleGlyph,
  ProfileGlyph, ProfileIcon, RulerGlyph, ScrewGlyph, ScrewIcon, TargetGlyph,
} from "@/components/illustrations";

const Preview3D = dynamic(() => import("@/components/Preview3D"), { ssr: false });

type Fam = "size" | "align" | "profile" | "magnets" | "screws" | "advanced";
const FAM: Record<Fam | "print", string> = {
  size: "#3D7BFF",
  align: "#9E6BFF",
  profile: "#FF7A2F",
  magnets: "#FF3B5C",
  screws: "#F5B800",
  advanced: "#7E8A99",
  print: "#2DBFE0",
};
const MAT = "#1D4638";
const PAPER = "#FAF8F3";
const INK = "#14201B";
const MUTED = "#5E6B64";
const acc = (c: string) => ({ "--accent": c }) as CSSProperties;
const wide: CSSProperties = { fontStretch: "125%" };

export default function VariantB(ctx: Ctx) {
  const { s, set, reset, layout, t } = ctx;
  const sum = summaries(ctx);
  const [fam, setFam] = useState<Fam | null>("size");
  const [toast, setToast] = useState<string | null>(null);
  const share = () => {
    copyLink();
    setToast(t.shared);
    setTimeout(() => setToast(null), 1600);
  };
  const tools = useTools(ctx);

  return (
    <div className="font-b relative h-dvh overflow-hidden text-[15px]" style={{ background: MAT, color: INK }}>
      {/* Tapis de découpe */}
      <CuttingMat />
      <Preview3D className={`absolute inset-0 transition-[left] duration-300 ${fam ? "md:left-[470px]" : "md:left-[100px]"}`} s={s} layout={layout} view="low"
        palette={{ plate: "#D9D4C7", wall: "#F3F0E8", margin: "#ECE8DE", magnet: FAM.magnets, screw: FAM.screws }} />

      {/* Barre du haut */}
      <header className="absolute inset-x-3 top-3 z-20 flex items-center gap-2 md:inset-x-4 md:top-4">
        <div className="flex items-center gap-3 rounded-2xl px-2 py-1 text-[#F4F1E8]">
          <span className="text-[21px] leading-none font-extrabold tracking-[-0.02em] md:text-[24px]" style={wide}>Pocketfit</span>
          <span className="hidden text-[14px] text-[#F4F1E8]/70 lg:block">{t.generator}</span>
        </div>
        <div className="ml-auto hidden items-center gap-1 rounded-2xl p-1 md:flex" style={{ background: PAPER }}>
          <Seg value={s.unit} opts={[["mm", "mm"], ["in", "in"]]} onChange={(v) => set({ unit: v as "mm" | "in" })} />
          <Seg value={s.lang} opts={[["fr", "FR"], ["en", "EN"]]} onChange={(v) => set({ lang: v as "fr" | "en" })} />
          <PrintPop ctx={ctx} label={sum.print} />
          <IconBtn label={t.share} onClick={share}><Link2 className="size-[18px]" /></IconBtn>
          <IconBtn label={t.reset} onClick={reset}><RotateCcw className="size-[18px]" /></IconBtn>
          <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" title={t.donate} aria-label={t.donate}
            className="grid size-10 place-items-center rounded-xl text-[#7A5600] hover:bg-[#FFE9A8]"><Coffee className="size-[18px]" /></a>
        </div>
        <DownloadB t={t} />
      </header>

      {/* Rail d'outils (desktop) */}
      <nav className="absolute top-20 left-4 z-20 hidden flex-col gap-1 rounded-[20px] p-1.5 md:flex" style={{ background: PAPER }} aria-label={t.settings}>
        {tools.map((tool) => (
          <RailButton key={tool.id} tool={tool} active={fam === tool.id} onClick={() => setFam(fam === tool.id ? null : tool.id)} />
        ))}
      </nav>

      {/* Panneau de la famille active (desktop) */}
      {fam && (
        <section className="absolute top-20 left-[112px] z-20 hidden max-h-[calc(100dvh-7.5rem)] w-[360px] flex-col overflow-hidden rounded-[20px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)] md:flex"
          style={{ background: PAPER, ...acc(FAM[fam]) }}>
          <PanelBody tool={tools.find((x) => x.id === fam)!} onClose={() => setFam(null)} closeLabel={t.close} />
        </section>
      )}

      {/* Étiquette de cotes */}
      <div className="pointer-events-none absolute right-4 bottom-14 z-10 hidden md:block">
        <div className="rounded-xl px-4 py-3 text-right text-[#F4F1E8]" style={{ background: "rgba(10,28,22,.55)", backdropFilter: "blur(6px)" }}>
          <div className="tnum text-[28px] leading-none font-bold tracking-[-0.02em]" style={wide}>{sum.size}</div>
          <div className="tnum mt-1.5 text-[14px] text-[#F4F1E8]/75">{sum.cells}, {t.heightLabel.toLowerCase()} {sum.height}</div>
        </div>
      </div>

      {/* Mobile : barre d'outils en bas + panneau par le bas */}
      <MobileTools ctx={ctx} tools={tools} sum={sum} />

      {toast && <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-3 py-2 text-[14px] text-white" style={{ background: INK }}>{toast}</div>}
    </div>
  );
}

/* ================= Définition des outils (familles) ================= */

type Tool = { id: Fam; label: string; icon: ReactNode; summary: string; on?: boolean; body: ReactNode };

function useTools(ctx: Ctx): Tool[] {
  const { s, set, t, layout } = ctx;
  const sum = summaries(ctx);
  const locale = s.lang === "fr" ? "fr-FR" : "en-US";
  const lstep = s.unit === "in" ? 0.05 : 1;
  return [
    {
      id: "size", label: t.size, icon: <RulerGlyph className="size-6" />, summary: sum.cells,
      body: (
        <Tabs.Root value={s.sizeMode} onValueChange={(v) => set({ sizeMode: v as "drawer" | "cells" })}>
          <Tabs.List className="grid grid-cols-2 gap-2">
            {([["drawer", s.unit === "in" ? t.sizeDrawerIn : t.sizeDrawer, <DrawerGlyph key="d" className="h-8 w-11" />],
              ["cells", t.sizeCells, <CellsGlyph key="c" className="h-8 w-11" />]] as const).map(([v, l, g]) => (
              <Tabs.Tab key={v} value={v} className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#E4E0D6] bg-white py-2.5 text-[14px] font-semibold text-[#5E6B64] outline-none data-active:border-[var(--accent)] data-active:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                {g}{l}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value="drawer" className="mt-4 flex flex-col gap-3">
            <Stepper label={t.width} value={toUnit(s.drawerW, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ drawerW: fromUnit(v, s.unit) })} />
            <Stepper label={t.depth} value={toUnit(s.drawerD, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ drawerD: fromUnit(v, s.unit) })} />
          </Tabs.Panel>
          <Tabs.Panel value="cells" className="mt-4 flex flex-col gap-3">
            <Stepper label={t.cols} value={s.cellsX} unit={t.cellsUnit} step={1} locale={locale} onChange={(v) => set({ cellsX: Math.max(1, Math.round(v)) })} />
            <Stepper label={t.rows} value={s.cellsY} unit={t.cellsUnit} step={1} locale={locale} onChange={(v) => set({ cellsY: Math.max(1, Math.round(v)) })} />
            <Stepper label={t.marginX} value={toUnit(s.marginX, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ marginX: fromUnit(v, s.unit) })} />
            <Stepper label={t.marginY} value={toUnit(s.marginY, s.unit)} unit={s.unit} step={lstep} locale={locale} onChange={(v) => set({ marginY: fromUnit(v, s.unit) })} />
          </Tabs.Panel>
          <div className="tnum mt-4 grid grid-cols-2 gap-2 text-[14px]">
            <Stat k={t.total} v={sum.size} />
            <Stat k={t.margin} v={`${Math.round(layout.marginLeft + layout.marginRight)} × ${Math.round(layout.marginBack + layout.marginFront)} mm`} />
          </div>
        </Tabs.Root>
      ),
    },
    {
      id: "align", label: t.alignment, icon: <TargetGlyph className="size-6" />, summary: sum.align,
      body: (
        <>
          <ToggleGroup value={[s.align]} onValueChange={(v) => v[0] && set({ align: v[0] as typeof s.align })} className="grid grid-cols-3 gap-2">
            {ALIGNS.map((a) => (
              <Toggle key={a} value={a} aria-label={t.alignNames[a]}
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#E4E0D6] bg-white py-2 text-[12.5px] font-medium text-[#8C958F] outline-none data-pressed:border-[var(--accent)] data-pressed:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <AlignGlyph pos={a} className="h-9 w-11" />
                <span className="leading-tight">{t.alignNames[a]}</span>
              </Toggle>
            ))}
          </ToggleGroup>
          <p className="mt-3 text-[14px] leading-snug" style={{ color: MUTED }}>{t.alignHint}</p>
        </>
      ),
    },
    {
      id: "profile", label: t.profile, icon: <ProfileIcon className="size-6" />, summary: sum.profile,
      body: (
        <ToggleGroup value={[s.profile]} onValueChange={(v) => v[0] && set({ profile: v[0] as "hybrid" | "flush" })} className="flex flex-col gap-2.5">
          {(["hybrid", "flush"] as const).map((p) => (
            <Toggle key={p} value={p} className="group flex items-center gap-3 rounded-2xl border-2 border-[#E4E0D6] bg-white p-2.5 text-left outline-none data-pressed:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <span className="grid w-[112px] shrink-0 place-items-center rounded-xl py-2 text-[#F4F1E8]/80" style={{ background: MAT }}>
                <ProfileGlyph kind={p} className="w-24" />
              </span>
              <span>
                <span className="block text-[16px] font-bold" style={wide}>{p === "hybrid" ? t.hybrid : t.flush}</span>
                <span className="mt-0.5 block text-[13.5px] leading-snug" style={{ color: MUTED }}>{p === "hybrid" ? t.hybridDesc : t.flushDesc}</span>
                {p === "hybrid" && <span className="mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-white" style={{ background: FAM.profile }}>{t.recommended}</span>}
              </span>
            </Toggle>
          ))}
        </ToggleGroup>
      ),
    },
    {
      id: "magnets", label: t.magnets, icon: <MagnetIcon className="size-6" />, summary: sum.magnets, on: s.magnets,
      body: (
        <div className="flex flex-col gap-4">
          <BigSwitch checked={s.magnets} onChange={(v) => set({ magnets: v })} label={t.magnets} desc={t.magnetsDesc} glyph={<MagnetGlyph className="h-12 w-16" />} />
          <div className={s.magnets ? "flex flex-col gap-3" : "pointer-events-none flex flex-col gap-3 opacity-40"}>
            <Stepper label={t.diameter} value={s.magnetD} unit="mm" step={0.1} min={3} max={12} locale={locale} onChange={(v) => set({ magnetD: v })} slider />
            <Stepper label={t.thickness} value={s.magnetH} unit="mm" step={0.1} min={1} max={4} locale={locale} onChange={(v) => set({ magnetH: v })} slider />
            <SmallSwitch checked={s.magnetRelease} onChange={(v) => set({ magnetRelease: v })} label={t.releaseHoles} desc={t.releaseDesc} glyph={<MagnetGlyph release className="h-8 w-11" />} />
          </div>
        </div>
      ),
    },
    {
      id: "screws", label: t.screws, icon: <ScrewIcon className="size-6" />, summary: sum.screws, on: s.screws,
      body: (
        <div className="flex flex-col gap-4">
          <BigSwitch checked={s.screws} onChange={(v) => set({ screws: v })} label={t.screws} desc={t.screwsDesc} glyph={<ScrewGlyph className="h-12 w-16" />} />
          <div className={s.screws ? "flex flex-col gap-3" : "pointer-events-none flex flex-col gap-3 opacity-40"}>
            <Stepper label={t.shaft} value={s.screwShaft} unit="mm" step={0.1} min={2} max={6} locale={locale} onChange={(v) => set({ screwShaft: v })} slider />
            <Stepper label={t.head} value={s.screwHead} unit="mm" step={0.1} min={2} max={8} locale={locale} onChange={(v) => set({ screwHead: v })} slider />
          </div>
        </div>
      ),
    },
    {
      id: "advanced", label: t.advanced, icon: <AdvancedGlyph className="size-6" />, summary: `${s.cellSize} mm`,
      body: (
        <div className="flex flex-col gap-3">
          <p className="flex gap-2 rounded-xl bg-[#FFF0D6] p-3 text-[14px] leading-snug text-[#7A4B00]"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{t.advancedWarn}</p>
          <Stepper label={t.cellSize} value={s.cellSize} unit="mm" step={0.5} min={20} max={80} locale={locale} onChange={(v) => set({ cellSize: v })} slider />
          <Stepper label={t.tolerance} value={s.tolerance} unit="mm" step={0.05} min={0} max={0.5} locale={locale} onChange={(v) => set({ tolerance: v })} slider />
          <Stepper label={t.outerRadius} value={s.outerRadius} unit="mm" step={0.5} min={0} max={10} locale={locale} onChange={(v) => set({ outerRadius: v })} slider />
          <Stepper label={t.bottomChamfer} value={s.bottomChamfer} unit="mm" step={0.1} min={0} max={3} locale={locale} onChange={(v) => set({ bottomChamfer: v })} slider />
        </div>
      ),
    },
  ];
}

/* ================= Briques du système B ================= */

function CuttingMat() {
  // Quadrillage 10 mm / 50 mm, règles sur deux bords, une diagonale à 45° : notre décor, pas celui d'extrabold.
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0" style={{
        backgroundImage: [
          "linear-gradient(rgba(240,236,220,.16) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(240,236,220,.16) 1px, transparent 1px)",
          "linear-gradient(rgba(240,236,220,.06) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(240,236,220,.06) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
        backgroundPosition: "-1px -1px",
      }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent calc(50% - 0.5px), rgba(240,236,220,.12) 50%, transparent calc(50% + 0.5px))" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 55% 55%, transparent 40%, rgba(0,0,0,.35))" }} />
      <div className="tnum absolute right-0 bottom-0 left-0 hidden h-6 md:block">
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} className="absolute bottom-1 text-[11px] text-[#F0ECDC]/45" style={{ left: i * 100 + 4 }}>{i * 5}</span>
        ))}
      </div>
    </div>
  );
}

function RailButton({ tool, active, onClick }: { tool: Tool; active: boolean; onClick: () => void }) {
  const c = FAM[tool.id];
  return (
    <button onClick={onClick} aria-pressed={active}
      className="relative flex w-[76px] flex-col items-center gap-1 rounded-2xl px-1 pt-2.5 pb-2 text-[12px] leading-tight font-semibold outline-none focus-visible:ring-2"
      style={{ background: active ? c : "transparent", color: active ? (tool.id === "screws" ? INK : "#fff") : c }}>
      {tool.icon}
      <span className="text-center" style={{ color: active ? undefined : INK }}>{tool.label}</span>
      {tool.on !== undefined && (
        <span className="absolute top-2 right-3 size-2 rounded-full ring-2" style={{ background: tool.on ? (active ? "#fff" : c) : "transparent", boxShadow: `0 0 0 1.5px ${active ? "#fff" : c}` }} />
      )}
    </button>
  );
}

function PanelBody({ tool, onClose, closeLabel }: { tool: Tool; onClose?: () => void; closeLabel: string }) {
  const c = FAM[tool.id];
  return (
    <>
      <div className="flex shrink-0 items-center gap-3 px-5 pt-4 pb-3" style={{ borderTop: `6px solid ${c}` }}>
        <span style={{ color: c }}>{tool.icon}</span>
        <div className="min-w-0">
          <h2 className="text-[19px] leading-tight font-bold tracking-[-0.01em]" style={wide}>{tool.label}</h2>
          <div className="tnum text-[14px] font-medium" style={{ color: c === FAM.screws ? "#A77B00" : c }}>{tool.summary}</div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label={closeLabel} className="ml-auto grid size-8 place-items-center rounded-lg text-[#5E6B64] hover:bg-[#EFEBE1]"><X className="size-4" /></button>
        )}
      </div>
      <div className="min-h-0 overflow-y-auto px-5 pb-5">{tool.body}</div>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-[#EFEBE1] px-3 py-2">
      <div className="text-[12.5px]" style={{ color: MUTED }}>{k}</div>
      <div className="font-semibold">{v}</div>
    </div>
  );
}

function Stepper({ label, value, unit, step, min = 0, max, locale, onChange, slider }: {
  label: string; value: number; unit: string; step: number; min?: number; max?: number; locale: string; onChange: (v: number) => void; slider?: boolean;
}) {
  return (
    <div className="rounded-xl border-2 border-[#E4E0D6] bg-white px-3 pt-2 pb-2.5 focus-within:border-[var(--accent)]" data-base-ui-swipe-ignore>
      <NumberField.Root value={value} step={step} min={min} max={max} locale={locale} onValueChange={(v) => v != null && onChange(v)}>
        <div className="flex items-center gap-2">
          <NumberField.ScrubArea className="flex-1 cursor-ew-resize">
            <label className="cursor-ew-resize text-[14px] font-medium" style={{ color: MUTED }}>{label}</label>
          </NumberField.ScrubArea>
          <NumberField.Group className="flex items-center gap-1">
            <NumberField.Decrement className="grid size-8 place-items-center rounded-lg bg-[#EFEBE1] text-[#14201B] hover:bg-[var(--accent)] hover:text-white"><Minus className="size-4" /></NumberField.Decrement>
            <NumberField.Input className="tnum w-[4.5ch] bg-transparent text-right text-[19px] font-bold outline-none" />
            <span className="w-7 text-[13px]" style={{ color: MUTED }}>{unit}</span>
            <NumberField.Increment className="grid size-8 place-items-center rounded-lg bg-[#EFEBE1] text-[#14201B] hover:bg-[var(--accent)] hover:text-white"><Plus className="size-4" /></NumberField.Increment>
          </NumberField.Group>
        </div>
      </NumberField.Root>
      {slider && max != null && (
        <Slider.Root value={value} min={min} max={max} step={step} onValueChange={(v) => onChange(v as number)} className="mt-1.5">
          <Slider.Control className="flex h-4 w-full touch-none items-center select-none">
            <Slider.Track className="h-1 w-full rounded-full bg-[#E4E0D6]">
              <Slider.Indicator className="rounded-full bg-[var(--accent)]" />
              <Slider.Thumb aria-label={label} className="h-4 w-2.5 rounded-[3px] bg-[var(--accent)] outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)] has-[:focus-visible]:ring-offset-2" />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      )}
    </div>
  );
}

function SwitchUI({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch.Root checked={checked} onCheckedChange={onChange} aria-label={label}
      className="relative flex h-7 w-12 shrink-0 rounded-lg bg-[#D8D3C6] p-1 outline-none data-checked:bg-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">
      <Switch.Thumb className="h-5 w-5 rounded-md bg-white shadow transition-transform data-checked:translate-x-5" />
    </Switch.Root>
  );
}

function BigSwitch({ checked, onChange, label, desc, glyph }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string; glyph: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-[#F4F1E8]/85" style={{ background: MAT }}>
      {glyph}
      <span className="flex-1 text-[13.5px] leading-snug text-[#F4F1E8]/85">{desc}</span>
      <SwitchUI checked={checked} onChange={onChange} label={label} />
    </label>
  );
}

function SmallSwitch({ checked, onChange, label, desc, glyph }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string; glyph: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-[#E4E0D6] bg-white px-3 py-2 text-[#8C958F]">
      {glyph}
      <span className="flex-1">
        <span className="block text-[15px] font-semibold text-[#14201B]">{label}</span>
        <span className="block text-[13px] leading-snug" style={{ color: MUTED }}>{desc}</span>
      </span>
      <SwitchUI checked={checked} onChange={onChange} label={label} />
    </label>
  );
}

function Seg({ value, opts, onChange }: { value: string; opts: [string, string][]; onChange: (v: string) => void }) {
  return (
    <ToggleGroup value={[value]} onValueChange={(v) => v[0] && onChange(v[0])} className="flex h-10 rounded-xl bg-[#EFEBE1] p-1">
      {opts.map(([v, l]) => (
        <Toggle key={v} value={v} className="rounded-lg px-2.5 text-[14px] font-semibold text-[#5E6B64] outline-none data-pressed:bg-[#14201B] data-pressed:text-white focus-visible:ring-2 focus-visible:ring-[#3D7BFF]">{l}</Toggle>
      ))}
    </ToggleGroup>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="grid size-10 place-items-center rounded-xl text-[#14201B] hover:bg-[#EFEBE1] focus-visible:ring-2 focus-visible:ring-[#3D7BFF] focus-visible:outline-none">{children}</button>
  );
}

function PrintPop({ ctx, label }: { ctx: Ctx; label: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[14px] font-semibold outline-none hover:bg-[#EFEBE1]" style={{ color: "#0E7C95" }}>
        <NozzleGlyph className="size-[18px]" /><span className="tnum">{label}</span><ChevronDown className="size-4 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="font-b w-72 rounded-2xl p-4 text-[#14201B] shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)] outline-none" style={{ background: PAPER, borderTop: `6px solid ${FAM.print}` }}>
            <Popover.Title className="mb-3 text-[17px] font-bold" style={wide}>{ctx.t.printProfile}</Popover.Title>
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
      <div className="mb-1 text-[13px] font-medium" style={{ color: MUTED }}>{label}</div>
      <ToggleGroup value={[String(value)]} onValueChange={(v) => v[0] && set({ [key]: +v[0] })} className="flex gap-1">
        {opts.map((o) => (
          <Toggle key={o} value={String(o)} className="tnum h-9 flex-1 rounded-lg border-2 border-[#E4E0D6] bg-white text-[14px] font-semibold outline-none data-pressed:border-[#2DBFE0] data-pressed:bg-[#2DBFE0] data-pressed:text-[#06303A]">
            {s.lang === "fr" ? String(o).replace(".", ",") : o}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {row(t.nozzle, s.nozzle, [0.2, 0.4, 0.6, 0.8], "nozzle")}
      {row(t.layer, s.layer, [0.1, 0.12, 0.16, 0.2, 0.28], "layer")}
    </div>
  );
}

function DownloadB({ t }: { t: Ctx["t"] }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="ml-auto flex h-12 items-center gap-2 rounded-2xl bg-[#F4F1E8] px-4 text-[15px] font-bold text-[#14201B] shadow-[0_8px_24px_-8px_rgba(0,0,0,.5)] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-white md:ml-0" style={wide}>
        <Download className="size-5" /> <span className="hidden sm:inline">{t.download}</span><ChevronDown className="size-4 opacity-60" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="font-b min-w-52 rounded-2xl p-1.5 text-[15px] text-[#14201B] shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)] outline-none" style={{ background: PAPER }}>
            {["3MF", "STL"].map((f) => (
              <Menu.Item key={f} className="flex h-11 cursor-default items-center gap-3 rounded-xl px-3 font-semibold outline-none data-highlighted:bg-[#EFEBE1]">
                <span className="rounded-md bg-[#14201B] px-1.5 py-0.5 text-[12px] text-white">{f}</span> {t.downloadAs(f)}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function MobileTools({ ctx, tools, sum }: { ctx: Ctx; tools: Tool[]; sum: ReturnType<typeof summaries> }) {
  const { s, set, reset, t } = ctx;
  const [open, setOpen] = useState<Fam | "more" | null>(null);
  const tool = tools.find((x) => x.id === open);
  return (
    <>
      <div className="absolute inset-x-3 top-[4.25rem] z-10 md:hidden">
        <div className="tnum inline-block rounded-xl px-3 py-2 text-[#F4F1E8]" style={{ background: "rgba(10,28,22,.55)" }}>
          <div className="text-[20px] leading-none font-bold" style={wide}>{sum.size}</div>
          <div className="mt-1 text-[13px] text-[#F4F1E8]/75">{sum.cells}</div>
        </div>
      </div>
      <nav className="absolute inset-x-2 bottom-12 z-20 no-scrollbar flex gap-0.5 overflow-x-auto rounded-[18px] p-1 md:hidden" style={{ background: PAPER }}>
        {tools.map((x) => (
          <button key={x.id} onClick={() => setOpen(x.id)} className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] leading-tight font-semibold" style={{ color: FAM[x.id] }}>
            {x.icon}
            <span className="w-full truncate text-center text-[#14201B]">{x.id === "align" ? "Position" : x.label.split(" ")[0]}</span>
            {x.on && <span className="absolute top-1 right-2 size-2 rounded-full" style={{ background: FAM[x.id] }} />}
          </button>
        ))}
        <button onClick={() => setOpen("more")} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold text-[#14201B]">
          <Settings2 className="size-6" /><span>{t.more}</span>
        </button>
      </nav>
      <Drawer.Root open={open != null} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
            <Drawer.Popup className="font-b flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[24px] text-[#14201B] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]"
              style={{ background: PAPER, ...(tool ? acc(FAM[tool.id]) : {}) }}>
              <Drawer.Title className="sr-only">{tool?.label ?? t.more}</Drawer.Title>
              {tool ? (
                <Drawer.Content className="flex min-h-0 flex-col"><PanelBody tool={tool} onClose={() => setOpen(null)} closeLabel={t.close} /></Drawer.Content>
              ) : (
                <Drawer.Content className="flex flex-col gap-3 p-5" style={{ borderTop: `6px solid ${FAM.print}` }}>
                  <div className="flex gap-2">
                    <Seg value={s.unit} opts={[["mm", "mm"], ["in", "in"]]} onChange={(v) => set({ unit: v as "mm" | "in" })} />
                    <Seg value={s.lang} opts={[["fr", "FR"], ["en", "EN"]]} onChange={(v) => set({ lang: v as "fr" | "en" })} />
                  </div>
                  <div className="text-[17px] font-bold" style={wide}>{t.printProfile}</div>
                  <PrintFields ctx={ctx} />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => copyLink()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#EFEBE1] font-semibold"><Link2 className="size-4" />{t.share}</button>
                    <button onClick={reset} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#EFEBE1] font-semibold"><RotateCcw className="size-4" />{t.reset}</button>
                  </div>
                  <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FFE08A] font-semibold text-[#5B4300]"><Coffee className="size-4" />{t.donate}</a>
                </Drawer.Content>
              )}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
