"use client";

import type { Baseplate, BaseplateSettings } from "@repo/geometry";
import { focusRing, glass } from "@repo/ui";
import { MeshPreview, type ViewInsets } from "@repo/viewer";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createEngineClient, type EngineClient } from "@/lib/engine/client";
import type { BaseplateSummary } from "@/lib/engine/protocol";
import { PREVIEW_COLORS, usePreviewColor } from "@/lib/preferences";
import { strings as t } from "@/lib/strings";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { DownloadButton } from "./download-button";
import { PocketMark } from "./illustrations";
import { DOCK_OFFSET, MobileDock } from "./mobile-dock";
import { Families, Readout, type Family } from "./settings-panel";
import { SettingsMenu, TopActions } from "./top-bar";

const DEFAULT_SETTINGS: BaseplateSettings = { columns: 4, rows: 3 };

/** Space kept between a floating panel and the framed model, in CSS pixels. */
const GAP = 16;
/** Desktop settings panel, in CSS pixels: below the top bar, on the left edge. */
const PANEL = { top: 72, edge: 16, width: 380 };
/** Height of the mobile top bar area (brand, menu), in CSS pixels. */
const MOBILE_TOP_BAR = 64;

/** `baseplate-{nx}x{ny}-{W}x{D}mm.stl`, the naming of the spec (#9). */
function stlFileName({ layout, stats }: BaseplateSummary): string {
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

/** Layout size of an element (transforms ignored), kept up to date; null while unmounted. */
function useElementSize(element: HTMLElement | null): { width: number; height: number } | null {
  const [size, setSize] = useState<{ element: HTMLElement; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!element) return;
    // The observer reports the initial size too.
    const observer = new ResizeObserver(() =>
      setSize({ element, width: element.offsetWidth, height: element.offsetHeight }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return size && size.element === element ? size : null;
}

export function BaseplateGenerator() {
  const engine = useRef<EngineClient | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [baseplate, setBaseplate] = useState<Baseplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [openFamily, setOpenFamily] = useState<Family | null>("size");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const [previewColor, setPreviewColor] = usePreviewColor();
  const desktop = useMediaQuery(DESKTOP_QUERY, true);

  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  const panelSize = useElementSize(panel);
  const dockSize = useElementSize(dock);
  const sheetSize = useElementSize(sheet);

  // The engine worker lives as long as the page: it shows the preview of the latest
  // settings, then their final quality, and drops whatever a newer setting made stale.
  useEffect(() => {
    const client = createEngineClient({
      onBaseplate(next) {
        setBaseplate(next);
        setError(null);
      },
      onError(reason) {
        console.error(reason);
        setError(t.computeFailed);
      },
    });
    engine.current = client;
    return () => {
      client.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.show(settings);
  }, [settings]);

  async function exportStl() {
    const client = engine.current;
    if (!client) return;
    setExporting(true);
    setError(null);
    try {
      const { bytes, baseplate: exported } = await client.exportStl(settings);
      download(bytes as Uint8Array<ArrayBuffer>, stlFileName(exported));
    } catch (reason) {
      console.error(reason);
      setError(t.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  // Canvas area hidden by the floating panels: the model is framed in what remains.
  const insets: ViewInsets = desktop
    ? { top: PANEL.top, right: GAP, bottom: GAP, left: PANEL.edge + (panelSize?.width ?? PANEL.width) + GAP }
    : {
        top: MOBILE_TOP_BAR,
        right: 0,
        bottom: (sheetOpen && sheetSize ? sheetSize.height : DOCK_OFFSET + (dockSize?.height ?? 150)) + GAP / 2,
        left: 0,
      };

  const families = (
    <Families
      settings={settings}
      onSettingsChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
      summary={baseplate}
      open={openFamily}
      onOpenChange={setOpenFamily}
    />
  );

  return (
    <main className="relative h-dvh overflow-hidden bg-bg text-[14px]">
      <MeshPreview
        mesh={baseplate?.mesh ?? null}
        color={PREVIEW_COLORS[previewColor]}
        insets={insets}
        recenter={recenter}
        className="absolute inset-0"
        fallback={
          <p className="absolute inset-x-4 top-24 text-center text-sm text-muted">{t.webglUnavailable}</p>
        }
      />

      <header className={`absolute top-3 left-3 flex h-11 items-center gap-2.5 rounded-full pr-4 pl-2 md:top-4 md:left-4 ${glass}`}>
        <PocketMark className="size-7 text-ink" />
        <h1 className="text-[15px] font-semibold tracking-[-0.02em]">{t.generator}</h1>
      </header>

      <div className="absolute top-3 right-3 flex items-center gap-2 md:top-4 md:right-4">
        <TopActions />
        <SettingsMenu previewColor={previewColor} onPreviewColorChange={setPreviewColor} withActions={!desktop} />
      </div>

      <aside
        ref={setPanel}
        aria-label={t.settings}
        style={{ top: PANEL.top, bottom: PANEL.edge, left: PANEL.edge, width: PANEL.width }}
        className="absolute hidden flex-col overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_1px_2px_rgb(18_19_25/0.04),0_24px_60px_-24px_rgb(18_19_25/0.28)] md:flex"
      >
        <Readout summary={baseplate} live />
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">{families}</div>
        <div className="border-t border-line p-3.5">
          <DownloadButton onDownload={exportStl} exporting={exporting} />
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setRecenter((count) => count + 1)}
        aria-label={t.recenter}
        title={t.recenter}
        style={desktop ? undefined : { bottom: insets.bottom + 4 }}
        className={`absolute right-3 bottom-4 grid size-11 place-items-center rounded-full text-ink-soft hover:text-ink md:right-4 ${glass} ${focusRing}`}
      >
        <LocateFixed className="size-[18px]" aria-hidden />
      </button>

      <MobileDock
        summary={baseplate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        download={<DownloadButton onDownload={exportStl} exporting={exporting} compact />}
        dockRef={setDock}
        sheetRef={setSheet}
      >
        {families}
      </MobileDock>

      {error && (
        <p
          role="alert"
          className="absolute top-18 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-card bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-pop"
        >
          {error}
        </p>
      )}
    </main>
  );
}
