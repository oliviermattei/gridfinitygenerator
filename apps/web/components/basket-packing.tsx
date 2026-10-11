"use client";

import { PACKING_MODES, type BuildPlate, type PackedPlate, type PackingMode, type PackingProblem, type PackingProgress, type PackingStatus } from "@repo/geometry";
import { Segmented, focusRing } from "@repo/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@/lib/basket";
import { objectLabel, plateNames, type BasketPacking } from "@/lib/basket-packing";
import { createPackingClient, type PackingClient } from "@/lib/engine/packing-client";
import { useStrings } from "@/lib/locale";

/** Where the search of the rangement stands for one problem. */
interface SearchState {
  /** The problem searched, as text: a state of another problem is stale. */
  key: string;
  /** The best rangement told so far, null before the first one. */
  progress: PackingProgress | null;
  /** When the search started, on the clock of `performance.now`. */
  startedAt: number;
  /** Null while it runs. */
  status: PackingStatus | "failed" | null;
}

/** The rangement of the basket as the page shows it. */
export interface BasketPackingState {
  /** Null while the articles are measured; else what is laid out. */
  basket: BasketPacking | null;
  /** The best rangement found for the basket on screen, null while none is. */
  progress: PackingProgress | null;
  /** Searching, or why the search ended; "waiting" for the measures, "empty" with nothing to lay. */
  status: "waiting" | "empty" | "searching" | PackingStatus | "failed";
  startedAt: number;
  stop(): void;
}

/**
 * The rangement of the basket, searched in a worker of its own (#42): again from the start
 * whenever the objects, the mode, the plate or the printer change; the best one shown as soon as
 * it is found.
 */
export function useBasketPacking(basket: BasketPacking | null, plate: BuildPlate, excludedCorner: { width: number; depth: number } | null): BasketPackingState {
  const client = useRef<PackingClient | null>(null);
  /** The problem the worker searches: what its messages are about. */
  const searched = useRef("");
  const [state, setState] = useState<SearchState | null>(null);

  const problem = useMemo<PackingProblem | null>(
    () => (basket && basket.objects.length > 0 ? { objects: basket.objects, plate: { width: plate.width, depth: plate.depth }, excludedCorner } : null),
    [basket, plate.width, plate.depth, excludedCorner],
  );
  const key = useMemo(() => (problem ? JSON.stringify(problem) : ""), [problem]);

  useEffect(() => {
    const started = createPackingClient({
      onProgress: (progress) =>
        setState((known) => {
          const key = searched.current;
          // The clock of the page: the worker's elapsed time when its first message came.
          const startedAt = known?.key === key ? known.startedAt : performance.now() - progress.elapsedMs;
          return { key, progress, startedAt, status: null };
        }),
      onDone: (search) =>
        setState((known) => ({ key: searched.current, progress: search, startedAt: known?.key === searched.current ? known.startedAt : performance.now() - search.elapsedMs, status: search.status })),
      onError: (message) => {
        console.error(message);
        setState((known) => (known?.key === searched.current ? { ...known, status: "failed" } : { key: searched.current, progress: null, startedAt: 0, status: "failed" }));
      },
    });
    client.current = started;
    return () => {
      started.dispose();
      client.current = null;
    };
  }, []);

  // Searched again only when the problem itself changes, not each time it is made again.
  useEffect(() => {
    searched.current = key;
    if (key) client.current?.search(JSON.parse(key) as PackingProblem);
    else client.current?.stop();
  }, [key]);

  const own = state?.key === key ? state : null;
  const status: BasketPackingState["status"] = !basket ? "waiting" : !problem ? "empty" : (own?.status ?? "searching");
  return {
    basket,
    progress: own?.progress ?? null,
    status,
    startedAt: own?.startedAt ?? 0,
    stop: () => {
      client.current?.stop();
      setState((known) => (known?.key === key ? { ...known, status: "stopped" } : known));
    },
  };
}

/** Seconds since the search started, ticking while it runs. */
function useElapsedSeconds(startedAt: number, running: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(timer);
  }, [running]);
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

const FILLS: Record<Category, string> = {
  bins: "fill-accent-tint stroke-accent",
  baseplates: "fill-track stroke-ink-soft",
  clips: "fill-sunken stroke-muted",
};

/**
 * The rangement section of the basket page (#42): the mode, where the search stands with a
 * button to stop it, and each plate seen from above, to scale.
 */
export function BasketPackingSection({
  packing,
  mode,
  onModeChange,
  plate,
  excludedCorner,
  nameOf,
}: {
  packing: BasketPackingState;
  mode: PackingMode;
  onModeChange: (mode: PackingMode) => void;
  plate: BuildPlate;
  excludedCorner: { width: number; depth: number } | null;
  nameOf: (articleId: string) => string;
}) {
  const t = useStrings();
  const names = t.basket.packing;
  const { basket, progress, status } = packing;
  const elapsed = useElapsedSeconds(packing.startedAt, status === "searching");
  const plates = progress?.packing.plates ?? [];
  const plateTitles = basket && progress ? plateNames(plates, mode, basket, nameOf, t) : [];

  return (
    <section aria-labelledby="basket-packing" className="mt-4 rounded-[22px] border border-line bg-surface px-5 py-4">
      <h2 id="basket-packing" className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        {names.title}
      </h2>
      <div className="mt-3">
        <Segmented label={names.modesLabel} value={mode} options={PACKING_MODES.map((value) => ({ value, label: names.modes[value] }))} onChange={onModeChange} wrap />
      </div>

      <p className="mt-3 flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]" role="status" data-testid="packing-status" data-status={status}>
        {status === "waiting" && <span className="text-muted">{names.waiting}</span>}
        {status === "empty" && <span className="text-muted">{names.nothing}</span>}
        {status === "failed" && <span className="font-medium text-red-700">{names.failed}</span>}
        {status === "searching" && progress && (
          <>
            <span className="font-medium">{names.searching(progress.packing.plates.length, progress.bound)}</span>
            <span className="text-muted tabular-nums" data-testid="packing-elapsed">
              · {names.elapsed(elapsed)} ·
            </span>
            <button
              type="button"
              onClick={packing.stop}
              className={`h-8 rounded-ctl border border-line-strong px-3 text-[13px] font-semibold transition-colors hover:bg-sunken ${focusRing}`}
            >
              {names.stop}
            </button>
          </>
        )}
        {status === "searching" && !progress && <span className="text-muted">{names.waiting}</span>}
        {status === "optimal" && progress && <span className="font-medium">{names.optimal(progress.packing.plates.length)}</span>}
        {(status === "exhausted" || status === "stopped" || status === "timeout") && progress && (
          <span className="font-medium">{names.best(progress.packing.plates.length)}</span>
        )}
      </p>

      {basket && plates.length > 0 && (
        <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={names.title}>
          {plates.map((packed, index) => (
            <PlateView
              key={index}
              packed={packed}
              name={plateTitles[index] ?? ""}
              plate={plate}
              excludedCorner={excludedCorner}
              labelOf={(id) => objectLabel(basket.byId.get(id)!, basket, nameOf, t)}
              categoryOf={(id) => basket.byId.get(id)!.category}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

/** One plate seen from above, to scale, its front at the bottom: its objects, named, and the excluded corner. */
function PlateView({
  packed,
  name,
  plate,
  excludedCorner,
  labelOf,
  categoryOf,
}: {
  packed: PackedPlate;
  name: string;
  plate: BuildPlate;
  excludedCorner: { width: number; depth: number } | null;
  labelOf: (id: string) => string;
  categoryOf: (id: string) => Category;
}) {
  const t = useStrings();
  const font = Math.max(plate.width, plate.depth) / 22;
  return (
    <li data-testid="plate" aria-label={t.basket.packing.plateLabel(name, packed.objects.length)}>
      <svg viewBox={`0 0 ${plate.width} ${plate.depth}`} className="block w-full rounded-[10px] border border-line bg-sunken" role="img" aria-hidden>
        {excludedCorner && (
          <rect x={0} y={plate.depth - excludedCorner.depth} width={excludedCorner.width} height={excludedCorner.depth} className="fill-line-strong">
            <title>{t.basket.packing.excludedCorner}</title>
          </rect>
        )}
        {packed.objects.map((placed) => {
          const label = labelOf(placed.id);
          const y = plate.depth - placed.y - placed.depth;
          // The name inside its object when it has room for a few letters.
          const shown = placed.width > font * 3 && placed.depth > font * 1.4;
          return (
            <g key={placed.id} data-testid="plate-object">
              <rect x={placed.x} y={y} width={placed.width} height={placed.depth} rx={Math.min(2, placed.width / 4, placed.depth / 4)} strokeWidth={1} className={FILLS[categoryOf(placed.id)]}>
                <title>{label}</title>
              </rect>
              {shown && (
                <foreignObject x={placed.x} y={y} width={placed.width} height={placed.depth} className="pointer-events-none">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden p-[2px] text-center leading-tight text-ink-soft" style={{ fontSize: font }}>
                    <span className="line-clamp-3 break-words">{label}</span>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug font-medium" data-testid="plate-name" title={name}>
        {name}
      </p>
    </li>
  );
}
