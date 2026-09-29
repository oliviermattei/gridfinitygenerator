"use client";
// PROTOTYPE JETABLE — choix de l'accent à comparer (hors design évalué) : pilule jaune, ‹ › ou ← →,
// l'URL garde le choix (?accent=terracotta). Pose aussi les jetons d'accent sur .dir-b et .kit-popup,
// y compris dans les portails (menus, listes déroulantes).
import { useEffect } from "react";
import { ACCENTS, accentVars } from "@/lib/accents";

export function AccentSwitcher({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  const a = ACCENTS[value];
  // L'URL n'est écrite que sur un choix explicite : au chargement, c'est la page qui lit ?accent=.
  const pick = (i: number) => {
    onChange(i);
    const url = new URL(window.location.href);
    url.searchParams.set("accent", ACCENTS[i].key);
    window.history.replaceState(null, "", url);
  };
  const go = (d: number) => pick((value + d + ACCENTS.length) % ACCENTS.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [role=slider], [role=listbox], [role=combobox]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const vars = Object.entries(accentVars(a)).map(([k, v]) => `${k}: ${v};`).join(" ");
  const btn = "grid size-6 place-items-center rounded-full hover:bg-black/10";
  return (
    <>
      <style>{`.dir-b, .kit-popup { ${vars} }`}</style>
      <div
        className="fixed top-3.5 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#fffb00] px-1 py-1 text-[12px] text-black shadow-[0_0_0_1.5px_#000,0_6px_18px_rgba(0,0,0,.25)] md:top-auto md:bottom-4"
        style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
      >
        <button className={btn} onClick={() => go(-1)} aria-label="Accent précédent">‹</button>
        <div className="flex items-center gap-1">
          {ACCENTS.map((x, i) => (
            <button key={x.key} onClick={() => pick(i)} title={x.fr} aria-label={x.fr}
              className={`size-4 rounded-full ${i === value ? "shadow-[0_0_0_2px_#fffb00,0_0_0_3.5px_#000]" : "shadow-[0_0_0_1px_rgba(0,0,0,.35)]"}`}
              style={{ background: x.hex }} />
          ))}
        </div>
        <span className="hidden w-[108px] text-center font-semibold md:inline">{a.fr}</span>
        <button className={btn} onClick={() => go(1)} aria-label="Accent suivant">›</button>
      </div>
    </>
  );
}
