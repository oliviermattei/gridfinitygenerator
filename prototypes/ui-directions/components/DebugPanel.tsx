"use client";
// PROTOTYPE JETABLE — état courant des réglages, repliable (hors design évalué).
import { useState } from "react";
import type { Layout, Settings } from "@/lib/settings";

export function DebugPanel({ s, layout, variant }: { s: Settings; layout: Layout; variant: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="fixed right-2 top-[104px] md:top-auto md:right-auto md:left-1/2 md:bottom-2 md:-translate-x-1/2 z-[9998] flex flex-col md:flex-col-reverse items-end text-[11px] text-black"
      style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-[#fffb00] px-2 py-0.5 opacity-50 shadow-[0_0_0_1.5px_#000] hover:opacity-100"
      >
        {open ? "× état" : "{ }"}
      </button>
      {open && (
        <pre className="mb-1 max-h-[70vh] w-[300px] overflow-auto rounded-md bg-[#fffde0] p-2 shadow-[0_0_0_1.5px_#000,0_8px_24px_rgba(0,0,0,.3)]">
          {JSON.stringify({ variant, settings: s, layout: roundAll(layout) }, null, 2)}
        </pre>
      )}
    </div>
  );
}

function roundAll(o: Layout) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 100) / 100]));
}
