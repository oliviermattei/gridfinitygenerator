/**
 * Donation page behind "Offrir un café", read at build time from
 * NEXT_PUBLIC_DONATION_URL (see docs/deploiement.md). Without it, the button stays
 * visible but inactive.
 */
export const DONATION_URL: string | null = process.env.NEXT_PUBLIC_DONATION_URL?.trim() || null;
