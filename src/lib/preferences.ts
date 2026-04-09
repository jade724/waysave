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

// All user-configurable preferences stored locally.
export type UserPreferences = {
  // Which tab is currently active in the UI.
  activeTab: "fuel" | "ev";

  // Fuel type filter for fuel stations (`null` means any).
  fuelType: FuelTypeFilter; // ✅ can be null ("Any")

  // EV connector filters.
  connectors: ConnectorFilters;

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
};

// Defaults used on first load and as a safe fallback.
export const DEFAULT_PREFS: UserPreferences = {
  activeTab: "fuel",
  fuelType: null, // ✅ default to "Any" so EV users aren’t forced
  connectors: { CCS: true, CHAdeMO: false, Type2: true },
  preference: "nearest",
  maxDistanceKm: 30,
  priceSensitivity: 0.5,
  locationHighAccuracy: true,
  locationLiveUpdates: true,
  locationAutoFollowOnRoute: true,
};

// Storage key in localStorage (bump version when schema changes).
const KEY = "waysave_prefs_v1";

// Read preferences from localStorage, with safe defaults if missing/corrupt.
export function loadPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;

    // Merge safely (and ensure nested connectors exist)
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      connectors: {
        ...DEFAULT_PREFS.connectors,
        ...(parsed.connectors ?? {}),
      },
      // Booleans: older saved prefs may omit these keys.
      locationHighAccuracy: parsed.locationHighAccuracy ?? DEFAULT_PREFS.locationHighAccuracy,
      locationLiveUpdates: parsed.locationLiveUpdates ?? DEFAULT_PREFS.locationLiveUpdates,
      locationAutoFollowOnRoute:
        parsed.locationAutoFollowOnRoute ?? DEFAULT_PREFS.locationAutoFollowOnRoute,
    };
  } catch {
    // If JSON parse fails or localStorage is unavailable, fall back safely.
    return DEFAULT_PREFS;
  }
}

// Persist preferences to localStorage.
export function savePrefs(prefs: UserPreferences) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
