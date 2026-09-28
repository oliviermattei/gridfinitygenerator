"use client";
// PROTOTYPE JETABLE — état courant des réglages, repliable (hors design évalué).
import { useState } from "react";
import type { Layout, Settings } from "@/lib/settings";

export function DebugPanel({ s, layout, variant }: { s: Settings; layout: Layout; variant: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="fixed bottom-3 left-2 z-[9998] flex flex-col-reverse items-start text-[11px] text-black"
      style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-[#fffb00] px-2.5 py-0.5 shadow-[0_0_0_1.5px_#000] opacity-70 hover:opacity-100"
      >
        {open ? "× état" : "{ } état"}
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
