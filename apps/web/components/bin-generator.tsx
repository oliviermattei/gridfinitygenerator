"use client";

import { BIN_SETTINGS, binFitsOn, maxBinCells, type Bin, type BinSettings, type Quality } from "@repo/geometry";
import { focusRing, glass } from "@repo/ui";
import { MeshPreview, type ViewInsets } from "@repo/viewer";
import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createBinEngineClient, type BinEngineClient } from "@/lib/engine/bin-client";
import type { ExportFormat } from "@/lib/engine/protocol";
import { MEDIA_TYPES, download } from "@/lib/export-file";
import { binPath, type Locale } from "@/lib/i18n";
import { useStrings } from "@/lib/locale";
import { PREVIEW_COLORS, usePreferences } from "@/lib/preferences";
import { binShareLinkOf, resetBinSettings, useHydrated, useSavedBinSettings } from "@/lib/saved-settings";
import { useElementSize } from "@/lib/use-element-size";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { BinDockReadout, BinFamilies, BinReadout, type BinFamily } from "./bin-panel";
import { BinStatsCard } from "./bin-stats-card";
import { DownloadButton } from "./download-button";
import { GeneratorHeader } from "./generator-header";
import { DOCK_OFFSET, MobileDock } from "./mobile-dock";
import { Notifications, notify } from "./notifications";
import { ResetDialog } from "./reset-dialog";
import { SettingsMenu, TopActions, type TopBarActions } from "./top-bar";

/** Space kept between a floating panel and the framed model, in CSS pixels. */
const GAP = 16;
/** Desktop settings panel, in CSS pixels: below the top bar, on the left edge. */
const PANEL = { top: 72, edge: 16, width: 380 };
/** Height of the mobile top bar area (brand, menu), in CSS pixels. */
const MOBILE_TOP_BAR = 64;
/** Desktop statistics frame, in CSS pixels: under the gear menu, on the right edge. */
const STATS = { top: PANEL.top, edge: PANEL.edge, width: 272 };

/** The bin on screen, with the quality and the settings it was computed for. */
interface OnScreen {
  bin: Bin;
  quality: Quality;
  settings: BinSettings;
}

type Failure = "computeFailed" | "exportFailed";

/**
 * The bin generator (#32), in the Studio interface of the baseplate generator: the 3D preview
 * full screen, the settings panel on the left, the statistics on the right; on mobile, a dock
 * and a sheet. A bin larger than the build plate is shown, but cannot be downloaded: cut bins
 * will come later.
 */
export function BinGenerator() {
  const t = useStrings();
  const router = useRouter();
  const engine = useRef<BinEngineClient | null>(null);
  const [settings, setSettings] = useSavedBinSettings();
  const hydrated = useHydrated();
  const [resetOpen, setResetOpen] = useState(false);
  const [shown, setShown] = useState<OnScreen | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [openFamily, setOpenFamily] = useState<BinFamily | null>("size");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const [preferences, setPreferences] = usePreferences();
  const desktop = useMediaQuery(DESKTOP_QUERY, true);

  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  const panelSize = useElementSize(panel);
  const dockSize = useElementSize(dock);
  const sheetSize = useElementSize(sheet);

  useEffect(() => {
    const client = createBinEngineClient({
      onBin(bin, quality, computedFor) {
        setShown({ bin, quality, settings: computedFor });
        setError(null);
      },
      onError(reason) {
        console.error(reason);
        setError("computeFailed");
      },
    });
    engine.current = client;
    return () => {
      client.dispose();
      engine.current = null;
    };
  }, []);

  // Nothing is computed for the server defaults that hydration shows first.
  useEffect(() => {
    if (hydrated) engine.current?.show(settings);
  }, [settings, hydrated]);

  const { buildPlate } = preferences;
  const bin = shown?.bin ?? null;
  const final = shown !== null && shown.quality === "final" && shown.settings === settings;
  // A shared link or a smaller build plate may give a bin larger than the plate: shown, not downloadable.
  const fits = binFitsOn(settings, buildPlate);
  const maxCells = maxBinCells(settings.cellSize, buildPlate);
  const updateSettings = (patch: Partial<BinSettings>) => setSettings((previous) => ({ ...previous, ...patch }));
  const renderStats = (className: string) => (
    <BinStatsCard
      summary={bin}
      layerHeight={shown?.settings.layerHeight ?? settings.layerHeight}
      final={final}
      buildPlate={buildPlate}
      fits={fits}
      advancedChanged={settings.cellSize !== BIN_SETTINGS.cellSize.default}
      className={className}
    />
  );

  async function share() {
    const link = binShareLinkOf(settings);
    try {
      await navigator.clipboard.writeText(link);
      notify(t.linkCopied);
    } catch (reason) {
      console.error(reason);
      notify(t.copyFailed, link);
    }
  }

  const actions: TopBarActions = { onShare: share, onReset: () => setResetOpen(true) };

  function changeLanguage(language: Locale) {
    setPreferences({ language });
    const { search, hash } = window.location;
    router.replace(`${binPath(language)}${search}${hash}`, { scroll: false });
  }

  /** Downloads the bin: a 3MF that carries its share link, or an STL. */
  async function exportBin(format: ExportFormat) {
    const client = engine.current;
    if (!client || !fits) return;
    setExporting(format);
    setError(null);
    try {
      const { bytes, name } = await client.exportFile(settings, format, binShareLinkOf(settings));
      download(bytes as Uint8Array<ArrayBuffer>, `${name}.${format}`, MEDIA_TYPES[format]);
    } catch (reason) {
      console.error(reason);
      setError("exportFailed");
    } finally {
      setExporting(null);
    }
  }

  const insets: ViewInsets = desktop
    ? { top: PANEL.top, right: STATS.edge + STATS.width + GAP, bottom: GAP, left: PANEL.edge + (panelSize?.width ?? PANEL.width) + GAP }
    : {
        top: MOBILE_TOP_BAR,
        right: 0,
        bottom: (sheetOpen && sheetSize ? sheetSize.height : DOCK_OFFSET + (dockSize?.height ?? 150)) + GAP / 2,
        left: 0,
      };

  const downloadButton = (compact: boolean) => (
    <DownloadButton
      onDownload={(format) => void exportBin(format)}
      exporting={exporting}
      disabled={exporting !== null || !fits}
      compact={compact}
      stlDescription={t.bin.stlDescription}
    />
  );

  const families = (
    <BinFamilies settings={settings} onSettingsChange={updateSettings} summary={bin} maxCells={maxCells} open={openFamily} onOpenChange={setOpenFamily} />
  );

  return (
    <main className="relative h-dvh overflow-hidden bg-bg text-[14px]">
      <MeshPreview
        mesh={bin?.mesh ?? null}
        color={PREVIEW_COLORS[preferences.previewColor]}
        insets={insets}
        recenter={recenter}
        className="absolute inset-0"
        fallback={<p className="absolute inset-x-4 top-24 text-center text-sm text-muted">{t.webglUnavailable}</p>}
      />

      <GeneratorHeader title={t.bin.generator} />

      <div className="absolute top-3 right-3 flex items-center gap-2 md:top-4 md:right-4">
        <TopActions {...actions} />
        <SettingsMenu
          preferences={preferences}
          onPreferencesChange={setPreferences}
          settings={settings}
          onSettingsChange={updateSettings}
          actions={desktop ? null : actions}
          onLanguageChange={changeLanguage}
        />
      </div>

      {desktop && (
        <div style={{ top: STATS.top, right: STATS.edge, width: STATS.width }} className={`absolute hidden overflow-hidden rounded-[18px] md:block ${glass}`}>
          {renderStats("")}
        </div>
      )}

      <aside
        ref={setPanel}
        aria-label={t.settings}
        style={{ top: PANEL.top, bottom: PANEL.edge, left: PANEL.edge, width: PANEL.width }}
        className="absolute hidden flex-col overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_1px_2px_rgb(18_19_25/0.04),0_24px_60px_-24px_rgb(18_19_25/0.28)] md:flex"
      >
        <BinReadout summary={bin} settings={settings} live />
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">{families}</div>
        <div className="border-t border-line p-3.5">{downloadButton(false)}</div>
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
        dockReadout={<BinDockReadout summary={bin} settings={settings} fits={fits} />}
        readout={<BinReadout summary={bin} settings={settings} live />}
        stats={renderStats("mb-2 rounded-2xl bg-sunken")}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        download={downloadButton(true)}
        dockRef={setDock}
        sheetRef={setSheet}
      >
        {families}
      </MobileDock>

      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} onConfirm={() => setSettings(resetBinSettings)} description={t.bin.resetDescription} />
      <Notifications />

      {error && (
        <p
          role="alert"
          className="absolute top-18 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-card bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-pop"
        >
          {error === "computeFailed" ? t.bin.computeFailed : t.exportFailed}
        </p>
      )}
    </main>
  );
}
