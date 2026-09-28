// PROTOTYPE JETABLE — petites phrases de résumé par famille (utilisées dans les en-têtes repliés).
import { fmtLen, type Ctx } from "./settings";

export function summaries({ s, layout, t }: Pick<Ctx, "s" | "layout" | "t">) {
  const n = (v: number) => (s.lang === "fr" ? String(v).replace(".", ",") : String(v));
  return {
    size: `${fmtLen(layout.width, s.unit, s.unit === "in" ? 2 : 0).replace(/ (mm|in)$/, "")} × ${fmtLen(layout.depth, s.unit, s.unit === "in" ? 2 : 0)}`,
    cells: t.cells(layout.nx, layout.ny),
    align: t.alignNames[s.align],
    profile: s.profile === "hybrid" ? t.hybrid : t.flush,
    magnets: s.magnets ? `${n(s.magnetD)} × ${n(s.magnetH)} mm` : t.off,
    screws: s.screws ? `M${n(s.screwShaft)}, ${n(s.screwHead)} mm` : t.off,
    print: `${n(s.nozzle)} mm / ${n(s.layer)} mm`,
    height: `${n(Math.round(layout.height * 100) / 100)} mm`,
    layers: Math.round(layout.height / s.layer),
  };
}

export async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
  } catch {
    /* prototype : on ignore */
  }
}
