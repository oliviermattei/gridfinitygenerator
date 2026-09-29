"use client";
// PROTOTYPE JETABLE — barre flottante de choix de variante (←/→ au clavier). Masquée en production.
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

export function PrototypeSwitcher({ variants }: { variants: { key: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("variant") ?? variants[0].key;
  const idx = Math.max(0, variants.findIndex((v) => v.key === current));

  const go = useCallback(
    (delta: number) => {
      const next = variants[(idx + delta + variants.length) % variants.length];
      const p = new URLSearchParams(params.toString());
      p.set("variant", next.key);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [idx, params, router, variants],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.getAttribute("role") === "slider")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;
  const v = variants[idx];
  return (
    <div
      className="fixed top-[62px] right-2 md:top-auto md:right-auto md:bottom-2 md:left-1/2 z-[9999] flex md:-translate-x-1/2 items-center gap-1 rounded-full bg-[#fffb00] p-1 text-[13px] text-black shadow-[0_0_0_2px_#000,0_6px_20px_rgba(0,0,0,.35)]"
      style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
    >
      <button onClick={() => go(-1)} className="grid size-7 place-items-center rounded-full hover:bg-black hover:text-[#fffb00]" aria-label="Variante précédente">
        ‹
      </button>
      <span className="px-2 whitespace-nowrap">
        <b>{v.key}</b> {v.name}
      </span>
      <button onClick={() => go(1)} className="grid size-7 place-items-center rounded-full hover:bg-black hover:text-[#fffb00]" aria-label="Variante suivante">
        ›
      </button>
    </div>
  );
}
