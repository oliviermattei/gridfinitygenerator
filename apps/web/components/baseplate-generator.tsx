"use client";

import { changedAdvancedSettings, spreadPieces, type Baseplate, type BaseplateSettings, type BuildPlate, type Quality } from "@repo/geometry";
import { focusRing, glass } from "@repo/ui";
import { MeshPreview, type ViewInsets } from "@repo/viewer";
import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createEngineClient, type EngineClient } from "@/lib/engine/client";
import type { ExportFormat, ExportPiece } from "@/lib/engine/protocol";
import { MEDIA_TYPES } from "@/lib/export-file";
import { baseplatePath, type Locale } from "@/lib/i18n";
import { useStrings } from "@/lib/locale";
import { PREVIEW_COLORS, usePreferences } from "@/lib/preferences";
import { resetSettings, shareLinkOf, useHydrated, useSavedSettings } from "@/lib/saved-settings";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { DownloadButton } from "./download-button";
import { PocketMark } from "./illustrations";
import { DOCK_OFFSET, MobileDock } from "./mobile-dock";
import { Notifications, notify } from "./notifications";
import { ResetDialog } from "./reset-dialog";
import { Families, Readout, type Family } from "./settings-panel";
import { StatsCard, fitsOn } from "./stats-card";
import { SettingsMenu, TopActions, type TopBarActions } from "./top-bar";

/** Space kept between a floating panel and the framed model, in CSS pixels. */
const GAP = 16;
/** Desktop settings panel, in CSS pixels: below the top bar, on the left edge. */
const PANEL = { top: 72, edge: 16, width: 380 };
/** Height of the mobile top bar area (brand, menu), in CSS pixels. */
const MOBILE_TOP_BAR = 64;
/** Desktop statistics frame, in CSS pixels: under the gear menu, on the right edge. */
const STATS = { top: PANEL.top, edge: PANEL.edge, width: 272 };
/** Space between the pieces of a cut baseplate in the preview, in millimetres: the cuts show. */
const PREVIEW_GAP_MM = 4;

/** A download being prepared: every download waits for it. */
interface Exporting {
  piece: ExportPiece;
  format: ExportFormat;
}

/** The baseplate on screen, with the quality, the settings and the build plate it was computed for. */
interface OnScreen {
  baseplate: Baseplate;
  quality: Quality;
  settings: BaseplateSettings;
  buildPlate: BuildPlate;
}

/** A failure shown to the user, by the key of its message. */
type Failure = "computeFailed" | "exportFailed";

function download(bytes: Uint8Array<ArrayBuffer>, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
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
  const t = useStrings();
  const router = useRouter();
  const engine = useRef<EngineClient | null>(null);
  // Restored from a shared link or this browser once hydrated; the server renders the defaults.
  const [settings, setSettings] = useSavedSettings();
  const hydrated = useHydrated();
  const [resetOpen, setResetOpen] = useState(false);
  const [shown, setShown] = useState<OnScreen | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [exporting, setExporting] = useState<Exporting | null>(null);
  const [openFamily, setOpenFamily] = useState<Family | null>("size");
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

  // The engine worker lives as long as the page: it shows the preview of the latest
  // settings, then their final quality, and drops whatever a newer setting made stale.
  useEffect(() => {
    const client = createEngineClient({
      onBaseplate(next, quality, computedFor, buildPlate) {
        setShown({ baseplate: next, quality, settings: computedFor, buildPlate });
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

  // The build plate is a local preference: the baseplate is cut for it (and computed again
  // when it changes), but it stays out of the share link.
  const { buildPlate } = preferences;
  // Nothing is computed for the server defaults that hydration shows first.
  useEffect(() => {
    if (hydrated) engine.current?.show(settings, buildPlate);
  }, [settings, buildPlate, hydrated]);

  const baseplate = shown?.baseplate ?? null;
  // The pieces of a cut baseplate, set apart so that the cuts show.
  const previewMesh = useMemo(() => (baseplate ? spreadPieces(baseplate, PREVIEW_GAP_MM) : null), [baseplate]);
  // The volume is measured on the final mesh: "…" until it answers for the current settings.
  const final = shown !== null && shown.quality === "final" && shown.settings === settings && shown.buildPlate === buildPlate;
  const updateSettings = (patch: Partial<BaseplateSettings>) => setSettings((previous) => ({ ...previous, ...patch }));
  const fits = fitsOn(baseplate, buildPlate);
  const renderStats = (className: string) => (
    <StatsCard
      summary={baseplate}
      layerHeight={shown?.settings.layerHeight ?? settings.layerHeight}
      lineWidth={shown?.settings.lineWidth ?? settings.lineWidth}
      final={final}
      buildPlate={buildPlate}
      fits={fits}
      advancedChanged={changedAdvancedSettings(settings).length > 0}
      unit={preferences.unit}
      className={className}
    />
  );

  async function share() {
    const link = shareLinkOf(settings);
    try {
      await navigator.clipboard.writeText(link);
      notify(t.linkCopied);
    } catch (reason) {
      // Clipboard refused (permission, insecure context): the link is shown to copy by hand.
      console.error(reason);
      notify(t.copyFailed, link);
    }
  }

  const actions: TopBarActions = { onShare: share, onReset: () => setResetOpen(true) };

  /**
   * Shows the generator in another language and remembers the choice, which the site root
   * follows from then on. A navigation without reload: the settings on screen stay, and a
   * shared link still in the address comes along.
   */
  function changeLanguage(language: Locale) {
    setPreferences({ language });
    const { search, hash } = window.location;
    router.replace(`${baseplatePath(language)}${search}${hash}`, { scroll: false });
  }

  /**
   * Downloads the baseplate of the settings, or the test kit (always a single 3MF). The 3MF
   * carries the share link of the settings: the page that generates it again (the test kit
   * from its button, since it takes the cell size, the outline and the print settings). A
   * baseplate cut for the build plate comes as one 3MF with a named object per piece, or as
   * a zip of one STL per piece.
   */
  async function exportPiece(piece: ExportPiece, format: ExportFormat) {
    const client = engine.current;
    if (!client) return;
    setExporting({ piece, format });
    setError(null);
    try {
      const options = { link: shareLinkOf(settings), buildPlate, pieceName: t.pieceName };
      const { bytes, name, extension } = await client.exportFile(piece, settings, format, options);
      download(bytes as Uint8Array<ArrayBuffer>, `${name}.${extension}`, MEDIA_TYPES[extension]);
    } catch (reason) {
      console.error(reason);
      setError("exportFailed");
    } finally {
      setExporting(null);
    }
  }

  // Canvas area hidden by the floating panels: the model is framed in what remains.
  const insets: ViewInsets = desktop
    ? { top: PANEL.top, right: STATS.edge + STATS.width + GAP, bottom: GAP, left: PANEL.edge + (panelSize?.width ?? PANEL.width) + GAP }
    : {
        top: MOBILE_TOP_BAR,
        right: 0,
        bottom: (sheetOpen && sheetSize ? sheetSize.height : DOCK_OFFSET + (dockSize?.height ?? 150)) + GAP / 2,
        left: 0,
      };

  /** The download of the baseplate: in the panel on desktop, in the dock (compact) on mobile. */
  const downloadButton = (compact: boolean) => (
    <DownloadButton
      onDownload={(format) => void exportPiece("baseplate", format)}
      exporting={exporting?.piece === "baseplate" ? exporting.format : null}
      disabled={exporting !== null}
      compact={compact}
    />
  );

  const families = (
    <Families
      settings={settings}
      onSettingsChange={updateSettings}
      unit={preferences.unit}
      summary={baseplate}
      open={openFamily}
      onOpenChange={setOpenFamily}
      onDownloadTestKit={() => void exportPiece("test-kit", "3mf")}
      exportingTestKit={exporting?.piece === "test-kit"}
      downloadBusy={exporting !== null}
    />
  );

  return (
    <main className="relative h-dvh overflow-hidden bg-bg text-[14px]">
      <MeshPreview
        mesh={previewMesh}
        color={PREVIEW_COLORS[preferences.previewColor]}
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
        <div
          style={{ top: STATS.top, right: STATS.edge, width: STATS.width }}
          className={`absolute hidden overflow-hidden rounded-[18px] md:block ${glass}`}
        >
          {renderStats("")}
        </div>
      )}

      <aside
        ref={setPanel}
        aria-label={t.settings}
        style={{ top: PANEL.top, bottom: PANEL.edge, left: PANEL.edge, width: PANEL.width }}
        className="absolute hidden flex-col overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_1px_2px_rgb(18_19_25/0.04),0_24px_60px_-24px_rgb(18_19_25/0.28)] md:flex"
      >
        <Readout summary={baseplate} live />
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">{families}</div>
        <div className="border-t border-line p-3.5">
          {downloadButton(false)}
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
        fits={fits}
        stats={renderStats("mb-2 rounded-2xl bg-sunken")}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        download={downloadButton(true)}
        dockRef={setDock}
        sheetRef={setSheet}
      >
        {families}
      </MobileDock>

      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} onConfirm={() => setSettings(resetSettings)} />
      <Notifications />

      {error && (
        <p
          role="alert"
          className="absolute top-18 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-card bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-pop"
        >
          {t[error]}
        </p>
      )}
    </main>
  );
}
