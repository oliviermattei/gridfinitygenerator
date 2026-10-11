/**
 * Browser storage key of the local preferences (JSON). Outside preferences.ts, a client
 * module, so that the redirection of the site root (app/route.ts) reads it too.
 */
export const PREFERENCES_STORAGE_KEY = "preferences";

/** Browser storage key of the basket (JSON, versioned; basket.ts, ADR 0024). */
export const BASKET_STORAGE_KEY = "basket";
