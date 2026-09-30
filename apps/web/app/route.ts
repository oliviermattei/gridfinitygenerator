import { FALLBACK_LOCALE, LOCALES, baseplatePath, indexPath, type Locale } from "@/lib/i18n";
import { PREFERENCES_STORAGE_KEY } from "@/lib/storage-keys";
import { STRINGS } from "@/lib/strings";

// The site root is a static page (ADR 0007, 0020): it holds no content, only the choice of a language.
export const dynamic = "force-static";

/**
 * Leads the site root to the index of the generators in a language (ADR 0020): the one chosen
 * in the menu, kept in the local preferences, or else the first of the browser languages that
 * the site speaks, or else English. An address with a query string or a hash is an older share
 * link of a baseplate: it goes to the baseplate generator instead, keeping them. Runs in the
 * <head>, before anything is painted.
 */
function leadToIndex(indexes: Record<Locale, string>, baseplates: Record<Locale, string>, fallback: Locale, storageKey: string) {
  let chosen: unknown = null;
  try {
    chosen = JSON.parse(localStorage.getItem(storageKey) ?? "{}")?.language;
  } catch {
    // Storage blocked or corrupted: the browser languages decide.
  }
  const speaks = (language: unknown): language is Locale => typeof language === "string" && Object.hasOwn(indexes, language);
  let locale = speaks(chosen) ? chosen : null;
  if (locale === null) {
    const wanted = navigator.languages?.length ? navigator.languages : [navigator.language];
    locale = wanted.map((tag) => String(tag).slice(0, 2).toLowerCase()).find(speaks) ?? fallback;
  }
  const { search, hash } = location;
  location.replace(search || hash ? baseplates[locale] + search + hash : indexes[locale]);
}

const indexes = Object.fromEntries(LOCALES.map((locale) => [locale, indexPath(locale)]));
const baseplates = Object.fromEntries(LOCALES.map((locale) => [locale, baseplatePath(locale)]));
const script = `(${leadToIndex.toString()})(${JSON.stringify(indexes)}, ${JSON.stringify(baseplates)}, ${JSON.stringify(FALLBACK_LOCALE)}, ${JSON.stringify(PREFERENCES_STORAGE_KEY)});`;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const alternates = LOCALES.map((locale) => `<link rel="alternate" hreflang="${locale}" href="${indexPath(locale)}">`).join("");

const page = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(STRINGS[FALLBACK_LOCALE].home.title)}</title>
${alternates}
<script>${script}</script>
<noscript><meta http-equiv="refresh" content="0; url=${indexPath(FALLBACK_LOCALE)}"></noscript>
</head>
<body></body>
</html>
`;

export function GET() {
  return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
