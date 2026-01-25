// src/lib/preferences.ts
export type FuelTypeFilter = "diesel" | "unleaded" | "both";
export type PreferenceMode = "nearest" | "cheapest" | "fastest";

export type ConnectorFilters = {
  CCS: boolean;
  CHAdeMO: boolean;
  Type2: boolean;
};

export type UserPreferences = {
  activeTab: "fuel" | "ev";
  fuelType: FuelTypeFilter;
  connectors: ConnectorFilters;
  preference: PreferenceMode;
  maxDistanceKm: number;
  // Simple “price sensitivity” slider; we’ll use it as a loose filter
  priceSensitivity: number; // 0..100
};

export const DEFAULT_PREFS: UserPreferences = {
  activeTab: "fuel",
  fuelType: "unleaded",
  connectors: { CCS: true, CHAdeMO: false, Type2: true },
  preference: "cheapest",
  maxDistanceKm: 30,
  priceSensitivity: 50,
};

const KEY = "waysave_prefs_v1";

export function loadPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: UserPreferences) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
