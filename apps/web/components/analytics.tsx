import Script from "next/script";

const UMAMI_CLOUD_SCRIPT = "https://cloud.umami.is/script.js";

/**
 * Cookieless audience measurement (Umami). Nothing is rendered, and so nothing is
 * requested, unless NEXT_PUBLIC_UMAMI_WEBSITE_ID is set at build time.
 * See docs/deploiement.md.
 */
export function Analytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();
  if (!websiteId) return null;

  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() || UMAMI_CLOUD_SCRIPT;
  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
