"use client";
// PROTOTYPE JETABLE — Direction A « Calibre ».
// L'outil de mesure : panneau latéral net à filets (tout visible, on défile), cotes en gros chiffres
// tabulaires sur l'aperçu, baseplate posée sur un tapis quadrillé au pas de 42 mm.
// Neutres gris froids + un seul accent orange signal. Typo : Instrument Sans.
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { ChevronDown, Heart, Link2, LocateFixed, MoreHorizontal, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { Ctx } from "@/lib/settings";
import { copyLink, summaries } from "@/lib/summary";
import { DownloadSplit, Ghost, Segmented, Swatches, Toggler, focusRing, useMedia, useSheetInset } from "@/components/kit";
import { AdvancedBody, AlignBody, MagnetsBody, PrintBody, ProfileBody, ScrewsBody, SizeBody } from "@/components/families";
import { NozzleIcon, PocketMark } from "@/components/illustrations";

const Preview3D = dynamic(() => import("@/components/Preview3D"), { ssr: false });

export const FILAMENTS_A: { hex: string; render?: string; fr: string; en: string }[] = [
  { hex: "#F26A21", render: "#F57A12", fr: "Orange signal", en: "Signal orange" },
  { hex: "#EDEDE9", fr: "Blanc", en: "White" },
  { hex: "#9EA2A8", fr: "Galet", en: "Pebble" },
  { hex: "#33363C", fr: "Graphite", en: "Graphite" },
  { hex: "#8EA68C", fr: "Sauge", en: "Sage" },
];

const STAGE = { kind: "mat" as const, background: "#E9EBEE", gridCell: "#D6D9DE", gridSection: "#B9BEC7" };

export default function VariantA(ctx: Ctx) {
  const { s, set, reset, layout, t } = ctx;
  const sum = summaries(ctx);
  const [toast, setToast] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [sheet, setSheet] = useState(false);
  const sheetInset = useSheetInset(sheet);
  const share = () => {
    copyLink();
    setToast(t.shared);
    setTimeout(() => setToast(null), 1600);
  };
  const mobile = useMedia("(max-width: 767px)");
  const colors = FILAMENTS_A.map((f) => ({ hex: f.hex, name: f[s.lang] }));
  const n = (v: number) => new Intl.NumberFormat(s.lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: s.unit === "in" ? 2 : 0 }).format(s.unit === "in" ? v / 25.4 : v);

  return (
    <div className="dir-a flex h-dvh flex-col bg-[var(--bg)] text-[14px]">
      {/* ---------- En-tête ---------- */}
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)] pr-3 pl-4">
        <div className="flex items-center gap-2.5">
          <PocketMark className="size-7 text-[var(--ink)]" />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Pocketfit</span>
          <span className="mx-1 hidden h-4 w-px bg-[var(--line-strong)] lg:block" />
          <span className="hidden text-[14px] text-[var(--muted)] lg:block">{t.generator}</span>
        </div>
        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          <Segmented size="sm" label={t.units} value={s.unit} onChange={(v) => set({ unit: v })} options={[{ value: "mm", label: "mm" }, { value: "in", label: "in" }]} />
          <Segmented size="sm" label={t.language} value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: "fr", label: "FR" }, { value: "en", label: "EN" }]} />
          <PrintPopover ctx={ctx} summary={sum.print} />
          <span className="mx-1.5 h-5 w-px bg-[var(--line)]" />
          <Ghost onClick={share} icon={<Link2 className="size-4" />} label={t.share} iconOnly={false}><span className="hidden xl:inline">{t.share}</span></Ghost>
          <Ghost onClick={reset} icon={<RotateCcw className="size-4" />} label={t.reset}><span className="hidden xl:inline">{t.reset}</span></Ghost>
          <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" title={t.donate}
            className={`flex h-9 items-center gap-1.5 rounded-[var(--r-ctl)] px-2.5 text-[13.5px] font-medium text-[var(--ink-soft)] hover:bg-[var(--sunken)] ${focusRing}`}>
            <Heart className="size-4" /><span className="hidden xl:inline">{t.donate}</span>
          </a>
          <span className="w-1" />
          <DownloadSplit t={t} />
        </div>
        <div className="ml-auto flex items-center gap-1.5 md:hidden">
          <DownloadSplit t={t} compact />
          <MobileMore ctx={ctx} share={share} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---------- Panneau latéral ---------- */}
        <aside className="thin-scroll hidden w-[380px] shrink-0 overflow-y-auto border-r border-[var(--line)] bg-[var(--surface)] md:block">
          <SettingsList ctx={ctx} sum={sum} />
        </aside>

        {/* ---------- Aperçu ---------- */}
        <main className="relative min-w-0 flex-1">
          <Preview3D className="absolute inset-0" s={s} layout={layout} color={FILAMENTS_A[s.filament].render ?? FILAMENTS_A[s.filament].hex} stage={STAGE} recenter={recenter}
            insetTop={mobile ? 70 : 90} insetBottom={mobile ? (sheet ? sheetInset : 120) : 60} />

          <div className="pointer-events-none absolute top-4 left-4 md:top-6 md:left-7">
            <div className="tnum flex items-baseline gap-2 leading-none">
              <span className="text-[30px] font-semibold tracking-[-0.03em] md:text-[40px]">{n(layout.width)}</span>
              <span className="text-[22px] font-light text-[var(--faint)] md:text-[28px]">×</span>
              <span className="text-[30px] font-semibold tracking-[-0.03em] md:text-[40px]">{n(layout.depth)}</span>
              <span className="text-[15px] font-medium text-[var(--muted)] md:text-[17px]">{s.unit}</span>
            </div>
            <div className="tnum mt-2 text-[13px] text-[var(--muted)]">
              {sum.cells}, {t.heightLabel.toLowerCase()} {sum.height}
            </div>
          </div>

          <div className="absolute right-3 bottom-[76px] flex flex-col items-end gap-2 md:top-5 md:right-5 md:bottom-auto">
            <div className="flex items-center gap-2 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--surface)] py-1 pr-1 pl-3">
              <span className="hidden text-[12.5px] text-[var(--muted)] md:inline">
                {t.filament}{t.sep}<span className="font-medium text-[var(--ink)]">{colors[s.filament].name}</span>
              </span>
              <Swatches label={t.filament} value={s.filament} colors={colors} onChange={(i) => set({ filament: i })} size={20} />
            </div>
            <button onClick={() => setRecenter((r) => r + 1)} title={t.recenter}
              className={`hidden h-9 items-center gap-1.5 rounded-[var(--r-ctl)] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--ink-soft)] hover:border-[var(--line-strong)] md:flex ${focusRing}`}>
              <LocateFixed className="size-4" /> {t.recenter}
            </button>
          </div>
          <p className="pointer-events-none absolute bottom-5 left-7 hidden text-[12px] text-[var(--faint)] lg:block">{t.orbitHint}</p>
        </main>
      </div>

      <MobileBar ctx={ctx} sum={sum} open={sheet} onOpenChange={setSheet} />

      {toast && (
        <div role="status" className="fixed top-[68px] left-1/2 z-50 -translate-x-1/2 rounded-[var(--r-ctl)] bg-[var(--ink)] px-3 py-2 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================= Liste des réglages (toutes les familles ouvertes) ================= */

function SettingsList({ ctx, sum }: { ctx: Ctx; sum: ReturnType<typeof summaries> }) {
  const { s, set, t } = ctx;
  return (
    <div className="pb-24 md:pb-8">
      <Section title={t.size} summary={sum.cells}><SizeBody ctx={ctx} /></Section>
      <Section title={t.alignment} summary={sum.align}><AlignBody ctx={ctx} /></Section>
      <Section title={t.profile} summary={sum.profile}><ProfileBody ctx={ctx} /></Section>
      <Section title={t.magnets} summary={s.magnets ? sum.magnets : t.off} dim={!s.magnets}
        control={<Toggler checked={s.magnets} onChange={(v) => set({ magnets: v })} label={t.magnets} />}>
        <MagnetsBody ctx={ctx} />
      </Section>
      <Section title={t.screws} summary={s.screws ? sum.screws : t.off} dim={!s.screws}
        control={<Toggler checked={s.screws} onChange={(v) => set({ screws: v })} label={t.screws} />}>
        <ScrewsBody ctx={ctx} />
      </Section>
      <Collapsible.Root className="border-b border-[var(--line)]">
        <Collapsible.Trigger className={`group flex h-14 w-full items-center gap-2 px-5 text-left hover:bg-[var(--sunken)] ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0`}>
          <span className="text-[14.5px] font-semibold">{t.advanced}</span>
          <span className="ml-auto text-[12.5px] text-[var(--muted)]">{t.cellSize.toLowerCase()} {s.cellSize} mm</span>
          <ChevronDown className="size-4 text-[var(--faint)] transition-transform duration-200 group-data-panel-open:rotate-180" />
        </Collapsible.Trigger>
        <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
          <div className="px-5 pt-1 pb-5"><AdvancedBody ctx={ctx} /></div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}

function Section({ title, summary, control, dim, children }: { title: string; summary: string; control?: ReactNode; dim?: boolean; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--line)] px-5 pt-4 pb-5">
      <div className="mb-3.5 flex h-6 items-center gap-2.5">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.005em]">{title}</h2>
        <span className={`tnum ml-auto truncate text-[12.5px] ${dim ? "text-[var(--faint)]" : "text-[var(--muted)]"}`}>{summary}</span>
        {control}
      </div>
      {children}
    </section>
  );
}

/* ================= En-tête : profil d'impression ================= */

function PrintPopover({ ctx, summary }: { ctx: Ctx; summary: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger className={`flex h-8 items-center gap-1.5 rounded-[var(--r-ctl)] border border-[var(--line)] px-2.5 text-[13px] font-medium text-[var(--ink-soft)] hover:border-[var(--line-strong)] data-popup-open:border-[var(--accent)] ${focusRing}`}>
        <NozzleIcon className="size-4 text-[var(--muted)]" />
        <span className="tnum">{summary}</span>
        <ChevronDown className="size-3.5 text-[var(--faint)]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="kit-popup dir-a w-72 p-4">
            <Popover.Title className="mb-3 text-[14px] font-semibold">{ctx.t.printProfile}</Popover.Title>
            <PrintBody ctx={ctx} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ================= Mobile ================= */

function MobileMore({ ctx, share }: { ctx: Ctx; share: () => void }) {
  const { s, set, reset, t } = ctx;
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={t.more} className={`grid size-9 place-items-center rounded-[var(--r-ctl)] border border-[var(--line)] ${focusRing}`}>
        <MoreHorizontal className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="kit-popup dir-a flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Segmented full label={t.units} value={s.unit} onChange={(v) => set({ unit: v })} options={[{ value: "mm", label: "mm" }, { value: "in", label: "in" }]} />
              <Segmented full label={t.language} value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: "fr", label: "FR" }, { value: "en", label: "EN" }]} />
            </div>
            <div className="border-t border-[var(--line)] pt-3">
              <div className="mb-2 text-[13.5px] font-semibold">{t.printProfile}</div>
              <PrintBody ctx={ctx} />
            </div>
            <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--line)] pt-3">
              {[
                [t.share, <Link2 key="s" className="size-4" />, share],
                [t.reset, <RotateCcw key="r" className="size-4" />, reset],
              ].map(([l, i, fn]) => (
                <button key={l as string} onClick={fn as () => void} className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[var(--r-ctl)] bg-[var(--sunken)] text-[12px] font-medium ${focusRing}`}>{i as ReactNode}{l as string}</button>
              ))}
              <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[var(--r-ctl)] bg-[var(--sunken)] text-center text-[12px] leading-tight font-medium ${focusRing}`}><Heart className="size-4" />{t.donate}</a>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MobileBar({ ctx, sum, open, onOpenChange }: { ctx: Ctx; sum: ReturnType<typeof summaries>; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = ctx;
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <div className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center gap-3 border-t border-[var(--line)] bg-[var(--surface)] px-4 md:hidden">
        <div className="min-w-0 flex-1">
          <div className="tnum truncate text-[14px] font-semibold">{sum.cells}</div>
          <div className="tnum truncate text-[12px] text-[var(--muted)]">{sum.profile}, {t.magnets.toLowerCase()}{t.sep}{sum.magnets.toLowerCase()}</div>
        </div>
        <Drawer.Trigger className={`flex h-10 items-center gap-2 rounded-[var(--r-ctl)] bg-[var(--ink)] px-4 text-[14px] font-semibold text-white ${focusRing}`}>
          <SlidersHorizontal className="size-4" /> {t.settings}
        </Drawer.Trigger>
      </div>
      <Drawer.Portal>
        <Drawer.Viewport className="pointer-events-none fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className="dir-a pointer-events-auto flex h-[58dvh] w-full flex-col rounded-t-[14px] border-t border-[var(--line)] bg-[var(--surface)] shadow-[0_-12px_40px_-20px_rgba(21,23,28,.35)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]">
            <div className="relative flex shrink-0 items-center border-b border-[var(--line)] px-5 pt-4 pb-3">
              <div className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-[var(--line-strong)]" />
              <Drawer.Title className="text-[16px] font-semibold">{t.settings}</Drawer.Title>
              <Drawer.Close aria-label={t.close} className={`ml-auto grid size-8 place-items-center rounded-[var(--r-ctl)] bg-[var(--sunken)] ${focusRing}`}><X className="size-4" /></Drawer.Close>
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
