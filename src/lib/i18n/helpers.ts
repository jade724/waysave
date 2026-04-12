import type { UserPreferences } from "../preferences";
import type { AppLocale, MessageKey } from "./messages";
import { MESSAGES } from "./messages";

function interpolate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

export function translate(
  locale: AppLocale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const raw = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? String(key);
  return vars ? interpolate(raw, vars) : raw;
}

export function formatPrefsSummaryLine(
  prefs: UserPreferences,
  locale: AppLocale
): string {
  const m = MESSAGES[locale];
  const tab = prefs.activeTab === "fuel" ? m.prefs_tab_fuel : m.prefs_tab_ev;
  const dist =
    prefs.maxDistanceKm > 0
      ? interpolate(m.prefs_dist_km, {
          n:
            prefs.maxDistanceKm < 10
              ? prefs.maxDistanceKm.toFixed(1)
              : Math.round(prefs.maxDistanceKm),
        })
      : m.prefs_dist_any;
  const sort =
    prefs.preference === "nearest"
      ? m.prefs_sort_nearest
      : prefs.preference === "cheapest"
        ? m.prefs_sort_cheapest
        : m.prefs_sort_fastest;
  return `${tab} · ${dist} · ${sort}`;
}

export function greetingForHour(locale: AppLocale, hour: number): string {
  const m = MESSAGES[locale];
  if (hour < 12) return m.greeting_morning;
  if (hour < 18) return m.greeting_afternoon;
  return m.greeting_evening;
}
