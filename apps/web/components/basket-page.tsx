"use client";

import type { BuildPlate } from "@repo/geometry";
import { NumberStepper, focusRing } from "@repo/ui";
import { Pencil, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUANTITY_RANGE, articleHref, articleName, removeArticle, setQuantity, type Article } from "@/lib/basket";
import { basketPackingOf } from "@/lib/basket-packing";
import { changeBasket, useBasket } from "@/lib/basket-store";
import type { ArticleMeasure, StackChoice } from "@/lib/engine/article-measure";
import { createBasketEngineClient, type BasketEngineClient } from "@/lib/engine/basket-client";
import { GENERATORS } from "@/lib/generators";
import { indexPath } from "@/lib/i18n";
import { useFormats, useLocale, useStrings } from "@/lib/locale";
import { gramsText, massOf } from "@/lib/mass";
import { usePreferences, type StackPreference } from "@/lib/preferences";
import { PRINTER_EXCLUDED_CORNERS } from "@/lib/printers/bambu";
import { useHydrated } from "@/lib/saved-settings";
import { BasketLink } from "./basket-link";
import { BasketPackingSection, useBasketPacking } from "./basket-packing";
import { PocketMark } from "./illustrations";
import { LanguageLinks } from "./language-links";

/** A measure of an article, or its failure. */
type Measured = ArticleMeasure | "failed";

/**
 * What an article is measured by: its model, its settings, the build plate it is cut for and
 * how its pieces print stacked (the objects of the rangement, #42).
 */
function measureKey({ model, link }: Article, { width, depth }: BuildPlate, stack: StackChoice | null): string {
  return `${model}|${link}|${width}×${depth}|${stack ? `stack:${stack.ears}:${stack.pins}` : "flat"}`;
}

/** How the pieces of a cut baseplate print, as the generators export them (#28). */
function stackChoiceOf(stack: StackPreference): StackChoice | null {
  return stack.on ? { ears: stack.ears || stack.pins, pins: stack.pins } : null;
}

/**
 * The measures of the articles, each computed once in the basket's worker in final quality
 * (a quantity costs nothing: the same model), again when the build plate or the stacking changes.
 */
function useMeasures(articles: readonly Article[], buildPlate: BuildPlate, stack: StackChoice | null, enabled: boolean): ReadonlyMap<string, Measured> {
  const engine = useRef<BasketEngineClient | null>(null);
  const asked = useRef(new Set<string>());
  const [measures, setMeasures] = useState<ReadonlyMap<string, Measured>>(() => new Map());

  useEffect(() => {
    const client = createBasketEngineClient();
    engine.current = client;
    const requested = asked.current;
    return () => {
      client.dispose();
      engine.current = null;
      requested.clear();
    };
  }, []);

  useEffect(() => {
    const client = engine.current;
    if (!enabled || !client) return;
    for (const article of articles) {
      const key = measureKey(article, buildPlate, stack);
      if (asked.current.has(key)) continue;
      asked.current.add(key);
      client.measure(article, buildPlate, stack).then(
        (measure) => setMeasures((known) => new Map(known).set(key, measure)),
        (reason: unknown) => {
          if (engine.current !== client) return; // disposed with the page
          console.error(reason);
          asked.current.delete(key);
          setMeasures((known) => new Map(known).set(key, "failed"));
        },
      );
    }
  }, [articles, buildPlate, stack, enabled]);

  return measures;
}

/**
 * The basket page (#41, ADR 0024): its articles, each with its quantity, its dimensions and its
 * mass measured on its model, its totals; an article that does not fit on the build plate is
 * shown in red, with why. Empty, it tells how to fill it.
 */
export function BasketPage() {
  const t = useStrings();
  const f = useFormats();
  const locale = useLocale();
  const hydrated = useHydrated();
  const { articles } = useBasket();
  const [{ buildPlate, filament, stack: stackPreference, printer, packingMode }, setPreferences] = usePreferences();
  const stack = useMemo(() => stackChoiceOf(stackPreference), [stackPreference]);
  const measures = useMeasures(articles, buildPlate, stack, hydrated);

  const measureOf = (article: Article) => measures.get(measureKey(article, buildPlate, stack));

  // The rangement of what fits on the plates (#42), searched again at each change.
  const excludedCorner = printer === "other" ? null : PRINTER_EXCLUDED_CORNERS[printer];
  const packingBasket = useMemo(
    () => basketPackingOf(articles, (article) => measures.get(measureKey(article, buildPlate, stack)), packingMode),
    [articles, measures, buildPlate, stack, packingMode],
  );
  const packing = useBasketPacking(hydrated ? packingBasket : null, buildPlate, excludedCorner);
  const nameOf = (articleId: string) => {
    const article = articles.find((candidate) => candidate.id === articleId);
    if (!article) return "";
    const measure = measureOf(article);
    return articleName(article, t, f.lengths, measure && measure !== "failed" ? measure.dimensions : null);
  };
  const grams = (value: number) => t.mass(gramsText(value, f.grams, t.belowOneGram));

  // Totals of what will be printed: the articles that fit, once all of them are measured.
  const totals = useMemo(() => {
    let total = 0;
    let cost: number | null = filament.price === null ? null : 0;
    let excluded = 0;
    for (const article of articles) {
      const measure = measures.get(measureKey(article, buildPlate, stack));
      if (measure === undefined) return null;
      if (measure === "failed" || !measure.fits) {
        excluded++;
        continue;
      }
      const mass = massOf(measure.material, filament);
      total += mass.total * article.quantity;
      if (cost !== null && mass.cost !== null) cost += mass.cost * article.quantity;
    }
    return { total, cost, excluded };
  }, [articles, measures, buildPlate, stack, filament]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-4 md:px-6 md:pt-6">
        <a href={indexPath(locale)} className={`flex items-center gap-2.5 rounded-full py-1 pr-2 ${focusRing}`} title={t.home.backToIndex}>
          <PocketMark className="size-8 text-ink" />
          <span className="text-[16px] font-semibold tracking-[-0.02em]">{t.home.title}</span>
        </a>
        <div className="flex items-center gap-1">
          <LanguageLinks page="/panier" />
          <BasketLink />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 md:px-6">
        <h1 className="pt-10 pb-6 text-[32px] leading-tight font-semibold tracking-[-0.03em] md:text-[40px]">{t.basket.title}</h1>

        {hydrated && articles.length === 0 && (
          <section className="rounded-[22px] border border-line bg-surface p-5 md:p-6">
            <p className="text-[17px] font-semibold">{t.basket.empty}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{t.basket.emptyHint}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {GENERATORS.filter((generator) => generator.available).map((generator) => (
                <li key={generator.id}>
                  <a
                    href={generator.path(locale)}
                    className={`flex h-10 items-center rounded-ctl border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold transition-colors hover:bg-sunken ${focusRing}`}
                  >
                    {t.home.generators[generator.id].title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hydrated && articles.length > 0 && (
          <>
            <ul aria-label={t.basket.articles} className="flex flex-col gap-3">
              {articles.map((article) => (
                <ArticleRow key={article.id} article={article} measured={measureOf(article)} buildPlate={buildPlate} grams={grams} />
              ))}
            </ul>

            <section aria-labelledby="basket-totals" className="mt-4 rounded-[22px] border border-line bg-surface px-5 py-4">
              <h2 id="basket-totals" className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
                {t.basket.totals}
              </h2>
              <dl className="mt-2 text-[14px]">
                <div className="flex items-baseline justify-between gap-3 py-1">
                  <dt className="text-muted">{t.basket.totalMass}</dt>
                  <dd className="font-semibold tabular-nums" data-testid="total-mass">
                    {totals ? grams(totals.total) : "…"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1">
                  <dt className="text-muted">{t.basket.totalPlates}</dt>
                  <dd className="font-semibold tabular-nums" data-testid="total-plates">
                    {packing.progress ? packing.progress.packing.plates.length : packing.status === "empty" ? 0 : "…"}
                  </dd>
                </div>
                {filament.price !== null && (
                  <div className="flex items-baseline justify-between gap-3 py-1">
                    <dt className="text-muted">{t.basket.totalCost}</dt>
                    <dd className="font-semibold tabular-nums" data-testid="total-cost">
                      {totals?.cost != null ? t.cost(f.money.format(totals.cost)) : "…"}
                    </dd>
                  </div>
                )}
              </dl>
              {totals !== null && totals.excluded > 0 && <p className="mt-1 text-[12.5px] text-muted">{t.basket.excluded(totals.excluded)}</p>}
            </section>

            <BasketPackingSection
              packing={packing}
              mode={packingMode}
              onModeChange={(mode) => setPreferences({ packingMode: mode })}
              plate={buildPlate}
              excludedCorner={excludedCorner}
              nameOf={nameOf}
            />
          </>
        )}

        <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-muted">{t.basket.help}</p>
      </main>
    </div>
  );
}

/** One article: its name, its quantity, what it measures, and the links to edit or remove it. */
function ArticleRow({
  article,
  measured,
  buildPlate,
  grams,
}: {
  article: Article;
  measured: Measured | undefined;
  buildPlate: BuildPlate;
  grams: (value: number) => string;
}) {
  const t = useStrings();
  const f = useFormats();
  const locale = useLocale();
  const [{ filament }] = usePreferences();
  const measure = measured === undefined || measured === "failed" ? null : measured;
  const name = articleName(article, t, f.lengths, measure?.dimensions);
  const unfit = measure !== null && !measure.fits;
  const mass = measure ? massOf(measure.material, filament).total : null;
  const action = `flex h-9 items-center gap-1.5 rounded-ctl px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink ${focusRing}`;
  return (
    <li
      aria-label={name}
      data-testid="article"
      data-fits={measure ? String(measure.fits) : undefined}
      className={`rounded-[22px] border bg-surface p-4 md:p-5 ${unfit ? "border-red-300 bg-red-50/60" : "border-line"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <h2 className={`text-[17px] font-semibold tracking-[-0.01em] ${unfit ? "text-red-700" : ""}`} data-testid="article-name">
          {name}
        </h2>
        <div className="-mr-2 flex items-center">
          <a href={articleHref(article, locale)} aria-label={t.basket.editLabel(name)} className={action}>
            <Pencil className="size-4" aria-hidden />
            {t.basket.edit}
          </a>
          <button
            type="button"
            aria-label={t.basket.removeLabel(name)}
            onClick={() => changeBasket((basket) => removeArticle(basket, article.id))}
            className={action}
          >
            <Trash2 className="size-4" aria-hidden />
            {t.basket.remove}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_11rem]">
        <dl className="text-[13.5px]">
          <div className="flex items-baseline justify-between gap-3 py-0.5 sm:justify-start">
            <dt className="w-28 shrink-0 text-muted">{t.dimensions}</dt>
            <dd className="font-medium tabular-nums" data-testid="article-dimensions">
              {measure
                ? `${f.lengths.format(measure.dimensions.width)} × ${f.lengths.format(measure.dimensions.depth)} × ${f.fine.format(measure.dimensions.height)} mm`
                : measured === "failed"
                  ? "—"
                  : "…"}
              {measure && measure.pieces > 1 && <span className="text-muted">{` · ${t.basket.pieces(measure.pieces)}`}</span>}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-0.5 sm:justify-start">
            <dt className="w-28 shrink-0 text-muted">{t.basket.totalMass}</dt>
            <dd className="font-medium tabular-nums" data-testid="article-mass">
              {mass === null ? (measured === "failed" ? "—" : "…") : grams(mass * article.quantity)}
              {mass !== null && article.quantity > 1 && <span className="text-muted">{` · ${t.basket.perUnit(grams(mass))}`}</span>}
            </dd>
          </div>
        </dl>
        <NumberStepper
          label={t.basket.quantity}
          decrementLabel={t.basket.fewer}
          incrementLabel={t.basket.more}
          value={article.quantity}
          min={QUANTITY_RANGE.min}
          max={QUANTITY_RANGE.max}
          step={1}
          unit="×"
          locale={t.locale}
          fractionDigits={0}
          onChange={(quantity) => changeBasket((basket) => setQuantity(basket, article.id, quantity))}
        />
      </div>

      {unfit && (
        <p role="alert" className="mt-3 flex gap-2 text-[13px] leading-snug font-medium text-red-700">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
          {t.basket.doesNotFit(f.footprint(buildPlate))}
        </p>
      )}
      {measured === "failed" && (
        <p role="alert" className="mt-3 flex gap-2 text-[13px] leading-snug font-medium text-red-700">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
          {t.basket.measureFailed}
        </p>
      )}
    </li>
  );
}
