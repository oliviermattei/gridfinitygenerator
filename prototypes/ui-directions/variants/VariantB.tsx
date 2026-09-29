"use client";
// PROTOTYPE JETABLE — Direction B « Studio ».
// La baseplate en photo produit : aperçu plein écran sur fond studio, commandes dans des panneaux
// flottants aux formes douces. Réglages en accordéon avec résumé (une ligne par famille),
// téléchargement en bas du panneau. Neutres blanc cassé + un seul accent bleu outremer. Typo : Outfit.
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
import { AdvancedIcon, AlignIcon, MagnetIcon, NozzleIcon, PocketMark, ProfileIcon, ScrewIcon, SizeIcon } from "@/components/illustrations";

const Preview3D = dynamic(() => import("@/components/Preview3D"), { ssr: false });

export const FILAMENTS_B = [
  { hex: "#4560EE", fr: "Outremer", en: "Ultramarine" },
  { hex: "#F0F0EC", fr: "Blanc", en: "White" },
  { hex: "#A4A8AF", fr: "Galet", en: "Pebble" },
  { hex: "#2E3137", fr: "Graphite", en: "Graphite" },
  { hex: "#D8C7A4", fr: "Sable", en: "Sand" },
];

const STAGE = { kind: "studio" as const, background: "#F6F6F7", backgroundEdge: "#DADBE0" };
const glass = "bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur-xl border border-[color-mix(in_srgb,var(--line)_80%,transparent)] shadow-[0_1px_2px_rgba(18,19,25,.05),0_8px_24px_-12px_rgba(18,19,25,.18)]";

export default function VariantB(ctx: Ctx) {
  const { s, set, reset, layout, t } = ctx;
  const sum = summaries(ctx);
  const mobile = useMedia("(max-width: 767px)");
  const [toast, setToast] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [sheet, setSheet] = useState(false);
  const sheetInset = useSheetInset(sheet);
  const share = () => {
    copyLink();
    setToast(t.shared);
    setTimeout(() => setToast(null), 1600);
  };
  const colors = FILAMENTS_B.map((f) => ({ hex: f.hex, name: f[s.lang] }));

  return (
    <div className="dir-b relative h-dvh overflow-hidden bg-[var(--bg)] text-[14px]">
      <Preview3D className="absolute inset-0" s={s} layout={layout} color={FILAMENTS_B[s.filament].hex} stage={STAGE} recenter={recenter}
        insetRight={mobile ? 0 : 412} insetTop={mobile ? 64 : 40} insetBottom={mobile ? (sheet ? sheetInset : 190) : 70} />

      {/* ---------- Marque ---------- */}
      <div className={`absolute top-3 left-3 flex h-11 items-center gap-2.5 rounded-full pr-4 pl-2 md:top-4 md:left-4 ${glass}`}>
        <PocketMark className="size-7 text-[var(--ink)]" />
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Pocketfit</span>
        <span className="hidden text-[13px] text-[var(--muted)] lg:inline">{t.generator}</span>
      </div>

      {/* ---------- Actions globales ---------- */}
      <div className={`absolute top-4 right-4 hidden h-11 items-center gap-1 rounded-full px-1.5 md:flex ${glass}`}>
        <Segmented size="sm" label={t.units} value={s.unit} onChange={(v) => set({ unit: v })} options={[{ value: "mm", label: "mm" }, { value: "in", label: "in" }]} />
        <Segmented size="sm" label={t.language} value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: "fr", label: "FR" }, { value: "en", label: "EN" }]} />
        <PrintPopover ctx={ctx} summary={sum.print} />
        <span className="mx-1 h-5 w-px bg-[var(--line)]" />
        <Ghost iconOnly onClick={share} icon={<Link2 className="size-4" />} label={t.share} />
        <Ghost iconOnly onClick={reset} icon={<RotateCcw className="size-4" />} label={t.reset} />
        <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer"
          className={`flex h-8 items-center gap-1.5 rounded-full bg-[var(--sunken)] px-3 text-[12.5px] font-medium text-[var(--ink-soft)] hover:bg-[var(--line)] ${focusRing}`}>
          <Heart className="size-3.5" /> {t.donate}
        </a>
      </div>

      {/* ---------- Panneau de réglages (desktop) ---------- */}
      <aside className="absolute top-[72px] right-4 bottom-4 hidden w-[380px] flex-col overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(18,19,25,.04),0_24px_60px_-24px_rgba(18,19,25,.28)] md:flex">
        <Readout ctx={ctx} sum={sum} />
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
          <Families ctx={ctx} sum={sum} />
        </div>
        <div className="border-t border-[var(--line)] p-3.5">
          <DownloadSplit t={t} full size="lg" />
        </div>
      </aside>

      {/* ---------- Filament + vue ---------- */}
      <div className="absolute bottom-4 left-4 hidden items-center gap-2 md:flex">
        <div className={`flex h-12 items-center gap-2 rounded-full pr-4 pl-1.5 ${glass}`}>
          <Swatches label={t.filament} value={s.filament} colors={colors} onChange={(i) => set({ filament: i })} size={24} />
          <span className="text-[12.5px] font-medium text-[var(--ink-soft)]">{colors[s.filament].name}</span>
        </div>
        <button onClick={() => setRecenter((r) => r + 1)} aria-label={t.recenter} title={t.recenter}
          className={`grid size-12 place-items-center rounded-full text-[var(--ink-soft)] hover:text-[var(--ink)] ${glass} ${focusRing}`}>
          <LocateFixed className="size-[18px]" />
        </button>
      </div>

      {/* ---------- Mobile ---------- */}
      <MobileMore ctx={ctx} share={share} glassCls={glass} />
      <MobileDock ctx={ctx} sum={sum} colors={colors} open={sheet} onOpenChange={setSheet} />

      {toast && (
        <div role="status" className="fixed top-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================= Cotes en tête de panneau ================= */

function Readout({ ctx, sum }: { ctx: Ctx; sum: ReturnType<typeof summaries> }) {
  const { s, t, layout } = ctx;
  const n = (v: number) => new Intl.NumberFormat(s.lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: s.unit === "in" ? 2 : 0 }).format(s.unit === "in" ? v / 25.4 : v);
  return (
    <div className="px-5 pt-5 pb-4">
      <div className="tnum flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold tracking-[-0.04em]">{n(layout.width)} × {n(layout.depth)}</span>
        <span className="text-[14px] font-medium text-[var(--muted)]">{s.unit}</span>
      </div>
      <div className="tnum mt-1 text-[12.5px] text-[var(--muted)]">
        {sum.cells}, {t.heightLabel.toLowerCase()} {sum.height} ({t.layers(sum.layers)})
      </div>
    </div>
  );
}

/* ================= Accordéon des familles ================= */

function Families({ ctx, sum }: { ctx: Ctx; sum: ReturnType<typeof summaries> }) {
  const { s, set, t } = ctx;
  return (
    <div className="flex flex-col gap-1">
      <Item icon={<SizeIcon className="size-[18px]" />} title={t.size} summary={`${sum.size}, ${sum.cells}`} defaultOpen><SizeBody ctx={ctx} /></Item>
      <Item icon={<AlignIcon className="size-[18px]" />} title={t.alignment} summary={sum.align}><AlignBody ctx={ctx} /></Item>
      <Item icon={<ProfileIcon className="size-[18px]" />} title={t.profile} summary={sum.profile}><ProfileBody ctx={ctx} /></Item>
      <Item icon={<MagnetIcon className="size-[18px]" />} title={t.magnets} summary={s.magnets ? sum.magnets : t.off} on={s.magnets}
        control={<Toggler checked={s.magnets} onChange={(v) => set({ magnets: v })} label={t.magnets} />}>
        <MagnetsBody ctx={ctx} />
      </Item>
      <Item icon={<ScrewIcon className="size-[18px]" />} title={t.screws} summary={s.screws ? sum.screws : t.off} on={s.screws}
        control={<Toggler checked={s.screws} onChange={(v) => set({ screws: v })} label={t.screws} />}>
        <ScrewsBody ctx={ctx} />
      </Item>
      <Item icon={<AdvancedIcon className="size-[18px]" />} title={t.advanced} summary={`${t.cellSize.toLowerCase()} ${s.cellSize} mm, ${t.tolerance.toLowerCase()} ${String(s.tolerance).replace(".", s.lang === "fr" ? "," : ".")}`}>
        <AdvancedBody ctx={ctx} />
      </Item>
    </div>
  );
}

function Item({ icon, title, summary, control, on, defaultOpen, children }: {
  icon: ReactNode; title: string; summary: string; control?: ReactNode; on?: boolean; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}
      className={`rounded-[16px] transition-colors duration-200 ${open ? "bg-[var(--sunken)]" : "hover:bg-[var(--sunken)]"}`}>
      <div className="flex items-center gap-2 pr-3">
        <Collapsible.Trigger className={`group flex min-w-0 flex-1 items-center gap-3 rounded-[16px] py-2.5 pl-2.5 text-left ${focusRing} focus-visible:ring-offset-0`}>
          <span className={`grid size-9 shrink-0 place-items-center rounded-[11px] transition-colors ${on ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--ink-soft)] shadow-[0_0_0_1px_var(--line)]"}`}>
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold tracking-[-0.01em]">{title}</span>
            <span className="tnum block truncate text-[12px] text-[var(--muted)]">{summary}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-[var(--faint)] transition-transform duration-200 group-data-panel-open:rotate-180" />
        </Collapsible.Trigger>
        {control}
      </div>
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-250 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="px-3 pt-1 pb-4">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/* ================= Profil d'impression ================= */

function PrintPopover({ ctx, summary }: { ctx: Ctx; summary: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium text-[var(--ink-soft)] hover:bg-[var(--sunken)] data-popup-open:bg-[var(--sunken)] ${focusRing}`}>
        <NozzleIcon className="size-4 text-[var(--muted)]" />
        <span className="tnum">{summary}</span>
        <ChevronDown className="size-3.5 text-[var(--faint)]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} align="end" className="z-50">
          <Popover.Popup className="kit-popup dir-b w-72 p-4">
            <Popover.Title className="mb-3 text-[14px] font-semibold">{ctx.t.printProfile}</Popover.Title>
            <PrintBody ctx={ctx} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ================= Mobile ================= */

function MobileMore({ ctx, share, glassCls }: { ctx: Ctx; share: () => void; glassCls: string }) {
  const { s, set, reset, t } = ctx;
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={t.more} className={`absolute top-3 right-3 grid size-11 place-items-center rounded-full md:hidden ${glassCls} ${focusRing}`}>
        <MoreHorizontal className="size-5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="kit-popup dir-b flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Segmented full label={t.units} value={s.unit} onChange={(v) => set({ unit: v })} options={[{ value: "mm", label: "mm" }, { value: "in", label: "in" }]} />
              <Segmented full label={t.language} value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: "fr", label: "FR" }, { value: "en", label: "EN" }]} />
            </div>
            <div className="border-t border-[var(--line)] pt-3">
              <div className="mb-2 text-[13.5px] font-semibold">{t.printProfile}</div>
              <PrintBody ctx={ctx} />
            </div>
            <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--line)] pt-3">
              <button onClick={share} className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[12px] bg-[var(--sunken)] text-[12px] font-medium ${focusRing}`}><Link2 className="size-4" />{t.share}</button>
              <button onClick={reset} className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[12px] bg-[var(--sunken)] text-[12px] font-medium ${focusRing}`}><RotateCcw className="size-4" />{t.reset}</button>
              <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[12px] bg-[var(--sunken)] text-center text-[12px] leading-tight font-medium ${focusRing}`}><Heart className="size-4" />{t.donate}</a>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MobileDock({ ctx, sum, colors, open, onOpenChange }: {
  ctx: Ctx; sum: ReturnType<typeof summaries>; colors: { hex: string; name: string }[]; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { s, set, t } = ctx;
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <div className="absolute inset-x-3 bottom-3 flex flex-col items-center gap-2.5 md:hidden">
        <div className="flex h-11 items-center rounded-full border border-[var(--line)] bg-[var(--surface)]/90 px-1 backdrop-blur-xl">
          <Swatches label={t.filament} value={s.filament} colors={colors} onChange={(i) => set({ filament: i })} size={22} />
        </div>
        <div className="w-full rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[0_18px_40px_-18px_rgba(18,19,25,.35)]">
          <div className="flex items-center gap-3 px-2.5 pt-1.5 pb-2.5">
            <div className="min-w-0 flex-1">
              <div className="tnum text-[18px] font-semibold tracking-[-0.03em]">{sum.size}</div>
              <div className="tnum truncate text-[12px] text-[var(--muted)]">{sum.cells}, {sum.profile.toLowerCase()}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Drawer.Trigger className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--sunken)] text-[14px] font-semibold ${focusRing}`}>
              <SlidersHorizontal className="size-4" /> {t.settings}
            </Drawer.Trigger>
            <div className="flex-1"><DownloadSplit t={t} compact full size="lg" /></div>
          </div>
        </div>
      </div>
      <Drawer.Portal>
        <Drawer.Viewport className="pointer-events-none fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className="dir-b pointer-events-auto flex h-[58dvh] w-full flex-col rounded-t-[26px] bg-[var(--surface)] shadow-[0_-16px_48px_-20px_rgba(18,19,25,.35)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]">
            <div className="relative flex shrink-0 items-start px-5 pt-5">
              <div className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--line-strong)]" />
              <Drawer.Title className="sr-only">{t.settings}</Drawer.Title>
              <div className="-mx-5 -mt-5 flex-1"><Readout ctx={ctx} sum={sum} /></div>
              <Drawer.Close aria-label={t.close} className={`grid size-9 place-items-center rounded-full bg-[var(--sunken)] ${focusRing}`}><X className="size-4" /></Drawer.Close>
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-6">
              <Families ctx={ctx} sum={sum} />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
