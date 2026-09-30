/**
 * Interface languages, each served under /{lang}/ (ADR 0007). The language of a page is the
 * one of its address; the choice made in the menu is a local preference, which only the
 * redirection of the site root reads.
 */
export const LOCALES = ["fr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Language of a first visit whose browser asks for neither French nor English. */
export const FALLBACK_LOCALE: Locale = "en";

/** Names of the languages in the menu, each in its own language. */
export const LANGUAGE_NAMES: Record<Locale, string> = { fr: "Français", en: "English" };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** The index of the generators in a language (ADR 0020). */
export function indexPath(locale: Locale): `/${Locale}` {
  return `/${locale}`;
}

/** The page of the bin generator in a language. */
export function binPath(locale: Locale): `/${Locale}/bin` {
  return `/${locale}/bin`;
}

/** The page of the baseplate generator in a language. */
export function baseplatePath(locale: Locale): `/${Locale}/baseplate` {
  return `/${locale}/baseplate`;
}
