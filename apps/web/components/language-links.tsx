"use client";

import { focusRing } from "@repo/ui";
import { LANGUAGE_NAMES, LOCALES } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { usePreferences } from "@/lib/preferences";

/**
 * Links to the same page in the other languages. Following one remembers the choice, which
 * the site root follows from then on (ADR 0007), like the language menu of a generator.
 * `page` is the path after the language: "" for the index.
 */
export function LanguageLinks({ page = "" }: { page?: string }) {
  const locale = useLocale();
  const [, setPreferences] = usePreferences();
  return (
    <nav className="flex items-center gap-1">
      {LOCALES.filter((language) => language !== locale).map((language) => (
        <a
          key={language}
          href={`/${language}${page}`}
          lang={language}
          hrefLang={language}
          onClick={() => setPreferences({ language })}
          className={`rounded-full px-3 py-2 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink ${focusRing}`}
        >
          {LANGUAGE_NAMES[language]}
        </a>
      ))}
    </nav>
  );
}
