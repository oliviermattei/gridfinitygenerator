import { FALLBACK_LOCALE, LOCALES, baseplatePath, type Locale } from "@/lib/i18n";
import { PREFERENCES_STORAGE_KEY } from "@/lib/storage-keys";
import { STRINGS } from "@/lib/strings";

// The site root is a static page (ADR 0007): it holds no content, only the choice of a language.
export const dynamic = "force-static";

/**
 * Leads the site root to the generator in a language: the one chosen in the menu, kept in
 * the local preferences, or else the first of the browser languages that the site speaks,
 * or else English. Runs in the <head>, before anything is painted; the query string and the
 * hash follow, so a link to the root keeps its settings.
 */
function leadToGenerator(paths: Record<Locale, string>, fallback: Locale, storageKey: string) {
  let chosen: unknown = null;
  try {
    chosen = JSON.parse(localStorage.getItem(storageKey) ?? "{}")?.language;
  } catch {
    // Storage blocked or corrupted: the browser languages decide.
  }
  const speaks = (language: unknown): language is Locale => typeof language === "string" && Object.hasOwn(paths, language);
  let locale = speaks(chosen) ? chosen : null;
  if (locale === null) {
    const wanted = navigator.languages?.length ? navigator.languages : [navigator.language];
    locale = wanted.map((tag) => String(tag).slice(0, 2).toLowerCase()).find(speaks) ?? fallback;
  }
  location.replace(paths[locale] + location.search + location.hash);
}

const paths = Object.fromEntries(LOCALES.map((locale) => [locale, baseplatePath(locale)]));
const script = `(${leadToGenerator.toString()})(${JSON.stringify(paths)}, ${JSON.stringify(FALLBACK_LOCALE)}, ${JSON.stringify(PREFERENCES_STORAGE_KEY)});`;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const alternates = LOCALES.map((locale) => `<link rel="alternate" hreflang="${locale}" href="${baseplatePath(locale)}">`).join("");

const page = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(STRINGS[FALLBACK_LOCALE].generator)}</title>
${alternates}
<script>${script}</script>
<noscript><meta http-equiv="refresh" content="0; url=${baseplatePath(FALLBACK_LOCALE)}"></noscript>
</head>
<body></body>
</html>
`;

export function GET() {
  return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
