// src/lib/preferences.ts

// Fuel filter options for the fuel tab. `null` represents "Any".
export type FuelTypeFilter = "petrol" | "diesel" | "both" | null;

// Sorting strategy for stations (used by both fuel/EV views).
export type PreferenceMode = "nearest" | "cheapest" | "fastest";

// EV connector filters; true means the connector type is included.
export type ConnectorFilters = {
  CCS: boolean;
  CHAdeMO: boolean;
  Type2: boolean;
};

/** Upper bound for the EV “minimum kW” filter slider (UI only). */
export const EV_FILTER_MAX_KW = 350;

// All user-configurable preferences stored locally.
export type UserPreferences = {
  // Which tab is currently active in the UI.
  activeTab: "fuel" | "ev";

  // Fuel type filter for fuel stations (`null` means any).
  fuelType: FuelTypeFilter; // ✅ can be null ("Any")

  // EV connector filters.
  connectors: ConnectorFilters;

  /** EV: hide chargers whose reported max power is below this (0 = no minimum). */
  evMinPowerKw: number;
  /** EV: only show sites that include at least one AC connection (e.g. Type 2). */
  evRequireAc: boolean;
  /** EV: only show sites that include at least one DC connection (e.g. CCS). */
  evRequireDc: boolean;

  // Rank/sort strategy for station lists.
  preference: PreferenceMode;

  // Max distance filter in kilometers (0 means no limit).
  maxDistanceKm: number; // ✅ can be 0.0

  // 0..1 slider used to bias price vs. convenience.
  priceSensitivity: number; // 0..1 (you can later apply this as a filter)

  /** When true, request GPS-level fixes (best real-world position; uses a bit more battery). */
  locationHighAccuracy: boolean;
  /** When true, allow continuous position updates while the map uses follow mode / driving. */
  locationLiveUpdates: boolean;
  /** When true, automatically turn on map follow when you start navigation to a station. */
  locationAutoFollowOnRoute: boolean;

  /** Notify when community prices change for stations in your favourites (while the app is open). */
  priceAlertsEnabled: boolean;

  /** UI language (minimal catalogue: English + Irish). */
  locale: "en" | "ga";
};

// Defaults used on first load and as a safe fallback.
export const DEFAULT_PREFS: UserPreferences = {
  activeTab: "fuel",
  fuelType: null, // ✅ default to "Any" so EV users aren’t forced
  connectors: { CCS: true, CHAdeMO: false, Type2: true },
  evMinPowerKw: 0,
  evRequireAc: false,
  evRequireDc: false,
  preference: "nearest",
  maxDistanceKm: 30,
  priceSensitivity: 0.5,
  locationHighAccuracy: true,
  locationLiveUpdates: true,
  locationAutoFollowOnRoute: true,
  priceAlertsEnabled: false,
  locale: "en",
};

// Storage key in localStorage (bump version when schema changes).
const KEY = "waysave_prefs_v2";
const LEGACY_KEY = "waysave_prefs_v1";

// Read preferences from localStorage, with safe defaults if missing/corrupt.
function mergePrefs(parsed: Partial<UserPreferences>): UserPreferences {
  return {
    ...DEFAULT_PREFS,
    ...parsed,
    connectors: {
      ...DEFAULT_PREFS.connectors,
      ...(parsed.connectors ?? {}),
    },
    evMinPowerKw: (() => {
      const v = parsed.evMinPowerKw;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        return DEFAULT_PREFS.evMinPowerKw;
      }
      return Math.min(v, EV_FILTER_MAX_KW);
    })(),
    evRequireAc: Boolean(parsed.evRequireAc),
    evRequireDc: Boolean(parsed.evRequireDc),
    locationHighAccuracy: parsed.locationHighAccuracy ?? DEFAULT_PREFS.locationHighAccuracy,
    locationLiveUpdates: parsed.locationLiveUpdates ?? DEFAULT_PREFS.locationLiveUpdates,
    locationAutoFollowOnRoute:
      parsed.locationAutoFollowOnRoute ?? DEFAULT_PREFS.locationAutoFollowOnRoute,
    priceAlertsEnabled: parsed.priceAlertsEnabled ?? DEFAULT_PREFS.priceAlertsEnabled,
    locale: parsed.locale === "ga" || parsed.locale === "en" ? parsed.locale : DEFAULT_PREFS.locale,
  };
}

export function loadPrefs(): UserPreferences {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEY);
      if (raw) {
        try {
          const merged = mergePrefs(JSON.parse(raw) as Partial<UserPreferences>);
          localStorage.setItem(KEY, JSON.stringify(merged));
          localStorage.removeItem(LEGACY_KEY);
          return merged;
        } catch {
          localStorage.removeItem(LEGACY_KEY);
        }
      }
      return DEFAULT_PREFS;
    }

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return mergePrefs(parsed);
  } catch {
    return DEFAULT_PREFS;
  }
}

// Persist preferences to localStorage.
export function savePrefs(prefs: UserPreferences) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
