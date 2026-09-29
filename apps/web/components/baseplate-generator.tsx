"use client";

import { CELLS_PER_AXIS, type Baseplate, type BaseplateSettings } from "@repo/geometry";
import { BRAND_ACCENT } from "@repo/ui";
import { MeshPreview } from "@repo/viewer";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createEngineClient, type EngineClient } from "@/lib/engine/client";

const DEFAULT_SETTINGS: BaseplateSettings = { columns: 4, rows: 3 };

const millimetres = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Brings a typed cell count into the engine's range; `undefined` while it is not a number. */
function cellCount(text: string): number | undefined {
  const value = Number(text.trim().replace(",", "."));
  if (text.trim() === "" || !Number.isFinite(value)) return undefined;
  return Math.min(CELLS_PER_AXIS.max, Math.max(CELLS_PER_AXIS.min, Math.round(value)));
}

/** `baseplate-{nx}x{ny}-{W}x{D}mm.stl`, the naming of the spec (#9). */
function stlFileName({ layout, stats }: Omit<Baseplate, "mesh">): string {
  const mm = (value: number) => String(Number(value.toFixed(1)));
  const { width, depth } = stats.dimensions;
  return `baseplate-${layout.columns}x${layout.rows}-${mm(width)}x${mm(depth)}mm.stl`;
}

function download(bytes: Uint8Array<ArrayBuffer>, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "model/stl" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The engine worker, started on first use and terminated when the page unmounts. */
function useEngine(): () => EngineClient {
  const client = useRef<EngineClient | null>(null);
  useEffect(
    () => () => {
      client.current?.dispose();
      client.current = null;
    },
    [],
  );
  return useCallback(() => (client.current ??= createEngineClient()), []);
}

export function BaseplateGenerator() {
  const engine = useEngine();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [baseplate, setBaseplate] = useState<Baseplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let current = true;
    engine().generate(settings, "preview").then(
      (next) => {
        if (!current) return;
        setBaseplate(next);
        setError(null);
      },
      (reason: unknown) => current && setError(String(reason)),
    );
    return () => {
      current = false;
    };
  }, [engine, settings]);

  async function exportStl() {
    setExporting(true);
    try {
      const { bytes, baseplate: exported } = await engine().exportStl(settings);
      download(bytes as Uint8Array<ArrayBuffer>, stlFileName(exported));
    } catch (reason) {
      setError(String(reason));
    } finally {
      setExporting(false);
    }
  }

  const shown = baseplate?.layout;
  const dimensions = baseplate?.stats.dimensions;

  return (
    <main className="relative min-h-dvh">
      <MeshPreview
        mesh={baseplate?.mesh ?? null}
        color={BRAND_ACCENT}
        className="absolute inset-0"
        fallback={
          <p className="absolute right-4 bottom-4 left-4 text-center text-sm text-muted">
            Aperçu 3D indisponible : WebGL est désactivé dans ce navigateur.
          </p>
        }
      />
      <section className="relative m-4 flex max-w-sm flex-col gap-5 rounded-card bg-surface p-6 shadow-pop">
        <header className="flex items-center gap-3">
          <span data-testid="brand-mark" aria-hidden className="size-8 shrink-0 rounded-ctl bg-accent" />
          <h1 className="text-2xl font-semibold tracking-tight">Générateur de baseplates</h1>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <CellCountField
            label="Colonnes"
            value={settings.columns}
            onChange={(columns) => setSettings((previous) => ({ ...previous, columns }))}
          />
          <CellCountField
            label="Rangées"
            value={settings.rows}
            onChange={(rows) => setSettings((previous) => ({ ...previous, rows }))}
          />
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt className="text-muted">Cellules</dt>
          <dd data-testid="cells">{shown ? `${shown.columns} × ${shown.rows}` : "…"}</dd>
          <dt className="text-muted">Dimensions</dt>
          <dd data-testid="dimensions">
            {dimensions
              ? `${millimetres.format(dimensions.width)} × ${millimetres.format(dimensions.depth)} × ${millimetres.format(dimensions.height)} mm`
              : "…"}
          </dd>
        </dl>

        {error && (
          <p role="alert" className="text-sm text-accent-strong">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={exportStl}
          disabled={exporting}
          className="rounded-ctl bg-accent px-4 py-2.5 font-medium text-accent-ink disabled:opacity-60"
        >
          {exporting ? "Préparation du STL…" : "Télécharger le STL"}
        </button>
      </section>
    </main>
  );
}

function CellCountField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const id = useId();
  const [text, setText] = useState(String(value));

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={CELLS_PER_AXIS.min}
        max={CELLS_PER_AXIS.max}
        step={1}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const next = cellCount(event.target.value);
          if (next !== undefined) onChange(next);
        }}
        onBlur={() => setText(String(value))}
        className="rounded-ctl border border-line-strong bg-sunken px-3 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-accent"
      />
    </div>
  );
}
