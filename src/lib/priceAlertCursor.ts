const KEY = "waysave_price_alert_since";

export function getPriceAlertSinceIso(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setPriceAlertSinceIso(iso: string) {
  try {
    localStorage.setItem(KEY, iso);
  } catch {
    /* ignore */
  }
}

/** Call when enabling alerts so past updates are not replayed. */
export function resetPriceAlertCursorToNow() {
  setPriceAlertSinceIso(new Date().toISOString());
}

export function clearPriceAlertCursor() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
