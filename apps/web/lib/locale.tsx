"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatsFor, type Formats } from "./format";
import type { Locale } from "./i18n";
import { STRINGS, type Strings } from "./strings";

/** Language of the page: the one of its address, /{lang}/. */
const LocaleContext = createContext<Locale | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (locale === null) throw new Error("useLocale needs a LocaleProvider");
  return locale;
}

/** The interface copy in the language of the page. */
export function useStrings(): Strings {
  return STRINGS[useLocale()];
}

/** The number formats of the language of the page. */
export function useFormats(): Formats {
  return formatsFor(useStrings().locale);
}
