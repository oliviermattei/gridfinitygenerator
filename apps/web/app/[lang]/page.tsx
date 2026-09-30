import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { focusRing } from "@repo/ui";
import { Coffee } from "lucide-react";
import { PocketMark } from "@/components/illustrations";
import { LanguageLinks } from "@/components/language-links";
import { GENERATORS, type Generator } from "@/lib/generators";
import { indexPath, isLocale, type Locale } from "@/lib/i18n";
import { DONATION_URL, SOURCE_URL } from "@/lib/links";
import { STRINGS, type Strings } from "@/lib/strings";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = STRINGS[lang].home;
  return { title: t.title, description: t.description };
}

const card = "group flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_1px_2px_rgb(18_19_25/0.04),0_24px_60px_-32px_rgb(18_19_25/0.28)]";

/** A generator on the index: the whole card is its link, or a greyed "coming soon" card. */
function GeneratorCard({ generator, locale, t }: { generator: Generator; locale: Locale; t: Strings["home"] }) {
  const { title, description } = t.generators[generator.id];
  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
        {generator.image ? (
          <Image
            src={generator.image.src}
            width={generator.image.width}
            height={generator.image.height}
            alt=""
            sizes="(min-width: 640px) 480px, 100vw"
            className={`size-full object-cover transition-transform duration-300 ${generator.available ? "group-hover:scale-[1.02]" : "opacity-45 grayscale"}`}
          />
        ) : (
          <PocketMark className="absolute top-1/2 left-1/2 size-20 -translate-1/2 text-faint" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-[12px] font-semibold text-ink-soft">{t.badge}</span>
        {!generator.available && (
          <span className="absolute top-3 right-3 rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-white">{t.soon}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-5 pt-4 pb-5">
        <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="text-[14px] leading-snug text-muted">{description}</p>
      </div>
    </>
  );
  if (!generator.available) {
    return (
      <li className={`${card} opacity-80`} aria-label={`${title} (${t.soon.toLowerCase()})`}>
        {body}
      </li>
    );
  }
  return (
    <li className="flex">
      <a href={generator.path(locale)} className={`${card} w-full transition-shadow hover:border-line-strong ${focusRing}`}>
        {body}
      </a>
    </li>
  );
}

// Index of the generators (ADR 0017): each generator by a card, those announced greyed.
export default async function IndexPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = STRINGS[lang].home;
  const donate = STRINGS[lang].donate;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-4 md:px-6 md:pt-6">
        <a href={indexPath(lang)} className={`flex items-center gap-2.5 rounded-full py-1 pr-2 ${focusRing}`}>
          <PocketMark className="size-8 text-ink" />
          <span className="text-[16px] font-semibold tracking-[-0.02em]">{t.title}</span>
        </a>
        <LanguageLinks />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 md:px-6">
        <section className="pt-14 pb-10 md:pt-20 md:pb-14">
          <h1 className="max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-[64px]">{t.heading}</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft md:text-[19px]">{t.tagline}</p>
        </section>

        <section aria-labelledby="generators-title">
          <h2 id="generators-title" className="sr-only">
            {t.generatorsTitle}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            {GENERATORS.map((generator) => (
              <GeneratorCard key={generator.id} generator={generator} locale={lang} t={t} />
            ))}
          </ul>
        </section>

        {DONATION_URL && (
          <p className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-muted">
            {t.free}
            <a
              href={DONATION_URL}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 font-medium text-ink-soft hover:text-ink ${focusRing}`}
            >
              <Coffee className="size-4" aria-hidden />
              {donate}
            </a>
          </p>
        )}
      </main>

      <footer className="mx-auto mt-16 flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-6 text-[13px] text-muted md:px-6">
        <span>{t.license}</span>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className={`rounded underline-offset-2 hover:text-ink hover:underline ${focusRing}`}>
          {t.source}
        </a>
      </footer>
    </div>
  );
}
