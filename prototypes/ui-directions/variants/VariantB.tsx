"use client";
// PROTOTYPE JETABLE — Direction « Studio » (retenue le 29/09/2026).
// La baseplate en photo produit : aperçu plein écran sur fond studio, commandes dans des panneaux
// flottants aux formes douces. Panneau de réglages à GAUCHE, familles en accordéon exclusif (en ouvrir
// une referme les autres), téléchargement en bas du panneau. Tout ce qui n'est pas un réglage de la
// baseplate (langue, unités, imprimante, couleur de l'aperçu, partage, réinitialisation, don) vit dans
// le menu Préférences en haut à droite. Neutres blanc cassé + un seul accent (candidats dans lib/accents.ts). Typo : Outfit.
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import { Drawer } from "@base-ui/react/drawer";
import { Check, ChevronDown, ChevronsUpDown, Coffee, Link2, LocateFixed, RotateCcw, Settings, SlidersHorizontal, X } from "lucide-react";
import type { Ctx } from "@/lib/settings";
import { ACCENTS, type Accent } from "@/lib/accents";
import { copyLink, summaries } from "@/lib/summary";
import { DownloadSplit, Segmented, Swatches, Toggler, focusRing, useMedia, useSheetInset } from "@/components/kit";
import { AdvancedBody, AlignBody, MagnetsBody, PrintBody, ProfileBody, ScrewsBody, SizeBody } from "@/components/families";
import { AdvancedIcon, AlignIcon, MagnetIcon, PocketMark, ProfileIcon, ScrewIcon, SizeIcon } from "@/components/illustrations";

const Preview3D = dynamic(() => import("@/components/Preview3D"), { ssr: false });

type Filament = { hex: string; render?: string; fr: string; en: string };
// Le premier filament est la couleur de la marque ; les autres sont des neutres.
const NEUTRALS: Filament[] = [
  { hex: "#F0F0EC", fr: "Blanc", en: "White" },
  { hex: "#A4A8AF", fr: "Galet", en: "Pebble" },
  { hex: "#2E3137", fr: "Graphite", en: "Graphite" },
  { hex: "#D8C7A4", fr: "Sable", en: "Sand" },
];
const filaments = (a: Accent): Filament[] => [
  { hex: a.plastic, render: a.plasticRender, fr: a.fr, en: a.en },
  ...NEUTRALS.filter((n) => n.hex !== a.plastic),
];

const STAGE = { kind: "studio" as const, background: "#F6F6F7", backgroundEdge: "#DADBE0" };
const glass = "bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur-xl border border-[color-mix(in_srgb,var(--line)_80%,transparent)] shadow-[0_1px_2px_rgba(18,19,25,.05),0_8px_24px_-12px_rgba(18,19,25,.18)]";
const PANEL_W = 380;

type Sum = ReturnType<typeof summaries>;
type FamilyKey = "size" | "align" | "profile" | "magnets" | "screws" | "advanced";

export default function VariantB(ctx: Ctx) {
  const { s, layout, t } = ctx;
  const sum = summaries(ctx);
  const fil = filaments(ACCENTS[s.accent])[s.filament];
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

  return (
    <div className="dir-b relative h-dvh overflow-hidden bg-[var(--bg)] text-[14px]">
      <Preview3D className="absolute inset-0" s={s} layout={layout} color={fil.render ?? fil.hex} stage={STAGE} recenter={recenter}
        insetLeft={mobile ? 0 : PANEL_W + 32} insetTop={mobile ? 64 : 40} insetBottom={mobile ? (sheet ? sheetInset : 150) : 40} />

      {/* ---------- Marque ---------- */}
      <div className={`absolute top-3 left-3 flex h-11 items-center gap-2.5 rounded-full pr-4 pl-2 md:top-4 md:left-4 ${glass}`}>
        <PocketMark className="size-7 text-[var(--ink)]" />
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Pocketfit</span>
        <span className="hidden text-[13px] text-[var(--muted)] lg:inline">{t.generator}</span>
      </div>

      {/* ---------- Préférences (desktop et mobile) ---------- */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4">
        <PreferencesMenu ctx={ctx} share={share} />
      </div>

      {/* ---------- Panneau de réglages (desktop) ---------- */}
      <aside style={{ width: PANEL_W }}
        className="absolute top-[72px] bottom-4 left-4 hidden flex-col overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(18,19,25,.04),0_24px_60px_-24px_rgba(18,19,25,.28)] md:flex">
        <Readout ctx={ctx} sum={sum} />
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
          <Families ctx={ctx} sum={sum} />
        </div>
        <div className="border-t border-[var(--line)] p-3.5">
          <DownloadSplit t={t} full size="lg" />
        </div>
      </aside>

      {/* ---------- Vue ---------- */}
      <button onClick={() => setRecenter((r) => r + 1)} aria-label={t.recenter} title={t.recenter}
        className={`absolute right-4 bottom-4 hidden size-11 place-items-center rounded-full text-[var(--ink-soft)] hover:text-[var(--ink)] md:grid ${glass} ${focusRing}`}>
        <LocateFixed className="size-[18px]" />
      </button>

      {/* ---------- Mobile ---------- */}
      <MobileDock ctx={ctx} sum={sum} open={sheet} onOpenChange={setSheet} />

      {toast && (
        <div role="status" className="fixed top-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================= Cotes en tête de panneau ================= */

function Readout({ ctx, sum }: { ctx: Ctx; sum: Sum }) {
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

/* ================= Accordéon exclusif des familles ================= */

function Families({ ctx, sum }: { ctx: Ctx; sum: Sum }) {
  const { s, set, t } = ctx;
  const [open, setOpen] = useState<FamilyKey | null>("size");
  const bind = (key: FamilyKey) => ({ open: open === key, onOpenChange: (o: boolean) => setOpen(o ? key : null) });
  // Activer les aimants ou les vis ouvre leur section : on voit tout de suite ce qu'on peut régler.
  const toggle = (key: "magnets" | "screws") => (v: boolean) => {
    set({ [key]: v });
    if (v) setOpen(key);
  };
  return (
    <div className="flex flex-col gap-1">
      <Item {...bind("size")} icon={<SizeIcon className="size-[18px]" />} title={t.size} summary={`${sum.size}, ${sum.cells}`}><SizeBody ctx={ctx} /></Item>
      <Item {...bind("align")} icon={<AlignIcon className="size-[18px]" />} title={t.alignment} summary={sum.align}><AlignBody ctx={ctx} /></Item>
      <Item {...bind("profile")} icon={<ProfileIcon className="size-[18px]" />} title={t.profile} summary={sum.profile}><ProfileBody ctx={ctx} /></Item>
      <Item {...bind("magnets")} icon={<MagnetIcon className="size-[18px]" />} title={t.magnets} summary={s.magnets ? sum.magnets : t.off} on={s.magnets}
        control={<Toggler checked={s.magnets} onChange={toggle("magnets")} label={t.magnets} />}>
        <MagnetsBody ctx={ctx} />
      </Item>
      <Item {...bind("screws")} icon={<ScrewIcon className="size-[18px]" />} title={t.screws} summary={s.screws ? sum.screws : t.off} on={s.screws}
        control={<Toggler checked={s.screws} onChange={toggle("screws")} label={t.screws} />}>
        <ScrewsBody ctx={ctx} />
      </Item>
      <Item {...bind("advanced")} icon={<AdvancedIcon className="size-[18px]" />} title={t.advanced} summary={`${t.cellSize.toLowerCase()} ${s.cellSize} mm, ${t.tolerance.toLowerCase()} ${String(s.tolerance).replace(".", s.lang === "fr" ? "," : ".")}`}>
        <AdvancedBody ctx={ctx} />
      </Item>
    </div>
  );
}

function Item({ icon, title, summary, control, on, open, onOpenChange, children }: {
  icon: ReactNode; title: string; summary: string; control?: ReactNode; on?: boolean; open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode;
}) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}
      className={`rounded-[16px] transition-colors duration-200 ${open ? "bg-[var(--sunken)]" : "hover:bg-[var(--sunken)]"}`}>
      <div className="flex items-center gap-2 pr-3">
        <Collapsible.Trigger className={`group flex min-w-0 flex-1 items-center gap-3 rounded-[16px] py-2.5 pl-2.5 text-left ${focusRing} focus-visible:ring-offset-0`}>
          <span className={`grid size-9 shrink-0 place-items-center rounded-[11px] transition-colors ${on ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--surface)] text-[var(--ink-soft)] shadow-[0_0_0_1px_var(--line)]"}`}>
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

/* ================= Menu Préférences ================= */

function PreferencesMenu({ ctx, share }: { ctx: Ctx; share: () => void }) {
  const { s, set, reset, t } = ctx;
  const colors = filaments(ACCENTS[s.accent]).map((f) => ({ hex: f.hex, name: f[s.lang] }));
  const row = "flex items-center justify-between gap-4";
  const label = "text-[13.5px] font-medium text-[var(--ink)]";
  const action = `flex h-10 w-full items-center gap-3 rounded-[10px] px-2.5 text-[13.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--sunken)] hover:text-[var(--ink)] ${focusRing} focus-visible:ring-offset-0`;
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={t.preferences} title={t.preferences}
        className={`grid size-11 place-items-center rounded-full text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] data-popup-open:text-[var(--ink)] ${glass} ${focusRing}`}>
        <Settings className="size-[18px]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" collisionPadding={12} className="z-50">
          <Popover.Popup className="kit-popup dir-b thin-scroll flex max-h-[calc(100dvh-5rem)] w-[min(20.5rem,calc(100vw-1.5rem))] flex-col overflow-y-auto">
            <Popover.Title className="px-4 pt-4 pb-1 text-[15px] font-semibold tracking-[-0.01em]">{t.preferences}</Popover.Title>

            <div className="flex flex-col gap-3 px-4 py-3">
              <div className={row}>
                <span className={label}>{t.language}</span>
                <LanguageSelect ctx={ctx} />
              </div>
              <div className={row}>
                <span className={label}>{t.units}</span>
                <div className="w-[128px]">
                  <Segmented full size="sm" label={t.units} value={s.unit} onChange={(v) => set({ unit: v })} options={[{ value: "mm", label: "mm" }, { value: "in", label: "in" }]} />
                </div>
              </div>
            </div>

            <section className="border-t border-[var(--line)] px-4 py-3.5">
              <div className="mb-2.5 text-[13.5px] font-semibold">{t.printer}</div>
              <PrintBody ctx={ctx} />
            </section>

            <section className="border-t border-[var(--line)] px-4 py-3.5">
              <div className={row}>
                <span className="text-[13.5px] font-semibold">{t.previewColor}</span>
                <span className="text-[12.5px] text-[var(--muted)]">{colors[s.filament].name}</span>
              </div>
              <div className="-ml-[3px] mt-2">
                <Swatches label={t.previewColor} value={s.filament} colors={colors} onChange={(i) => set({ filament: i })} size={24} />
              </div>
            </section>

            <div className="flex flex-col border-t border-[var(--line)] p-1.5">
              <button onClick={share} className={action}><Link2 className="size-4 text-[var(--muted)]" />{t.share}</button>
              <button onClick={reset} className={action}><RotateCcw className="size-4 text-[var(--muted)]" />{t.reset}</button>
              <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className={action}><Coffee className="size-4 text-[var(--muted)]" />{t.donate}</a>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function LanguageSelect({ ctx }: { ctx: Ctx }) {
  const { s, set, t } = ctx;
  const items = (["fr", "en"] as const).map((v) => ({ value: v, label: t.languageNames[v] }));
  return (
    <Select.Root items={items} value={s.lang} onValueChange={(v) => v && set({ lang: v as "fr" | "en" })}>
      <Select.Trigger aria-label={t.language}
        className={`flex h-8 w-[128px] items-center justify-between gap-2 rounded-[var(--r-ctl)] border border-[var(--line)] bg-[var(--surface)] pr-2 pl-2.5 text-[13px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--line-strong)] data-popup-open:border-[var(--line-strong)] ${focusRing} focus-visible:ring-offset-0`}>
        <Select.Value />
        <Select.Icon><ChevronsUpDown className="size-3.5 text-[var(--faint)]" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} alignItemWithTrigger={false} align="end" className="z-[60]">
          <Select.Popup className="kit-popup dir-b min-w-[var(--anchor-width)] p-1">
            <Select.List>
              {items.map((it) => (
                <Select.Item key={it.value} value={it.value}
                  className="grid h-8 cursor-default grid-cols-[1fr_1rem] items-center gap-2 rounded-[8px] px-2.5 text-[13px] outline-none select-none data-highlighted:bg-[var(--sunken)]">
                  <Select.ItemText>{it.label}</Select.ItemText>
                  <Select.ItemIndicator><Check className="size-3.5 text-[var(--accent)]" strokeWidth={2.5} /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

/* ================= Mobile ================= */

function MobileDock({ ctx, sum, open, onOpenChange }: { ctx: Ctx; sum: Sum; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = ctx;
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <div className="absolute inset-x-3 bottom-3 md:hidden">
        <div className="w-full rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[0_18px_40px_-18px_rgba(18,19,25,.35)]">
          <div className="px-2.5 pt-1.5 pb-2.5">
            <div className="tnum text-[18px] font-semibold tracking-[-0.03em]">{sum.size}</div>
            <div className="tnum truncate text-[12px] text-[var(--muted)]">{sum.cells}, {sum.profile.toLowerCase()}</div>
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
        <Drawer.Viewport className="pointer-events-none fixed inset-0 z-40 flex items-end">
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
