/** Interface languages served under /{lang}/. English arrives with #14. */
export const LOCALES = ["fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** Language used until first-visit detection arrives with #14. */
export const DEFAULT_LOCALE: Locale = "fr";
