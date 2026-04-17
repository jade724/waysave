import type { FuelTypeFilter, UserPreferences } from "./preferences";
import type { Station } from "../types/station";
import { extractOcmChargingDetails } from "./ocmChargingInfo";

function evAcDcFlags(station: Station): { ac: boolean; dc: boolean } {
  if (station.type !== "ev") return { ac: false, dc: false };
  if (station.evHasAc != null || station.evHasDc != null) {
    return { ac: Boolean(station.evHasAc), dc: Boolean(station.evHasDc) };
  }
  const d = station.raw ? extractOcmChargingDetails(station.raw) : null;
  return { ac: d?.hasAC ?? false, dc: d?.hasDC ?? false };
}

/**
 * EV list/map filter: minimum reported max kW and optional AC/DC requirements.
 * Fuel stations always pass.
 */
export function matchesEvHardwareFilters(
  station: Station,
  prefs: UserPreferences
): boolean {
  if (station.type !== "ev") return true;

  const minKw = prefs.evMinPowerKw;
  if (minKw > 0) {
    const max = station.evMaxPowerKw;
    if (max == null || max < minKw) return false;
  }

  const { ac, dc } = evAcDcFlags(station);
  if (prefs.evRequireDc && !dc) return false;
  if (prefs.evRequireAc && !ac) return false;
  return true;
}

export function filterEvStationsByHardwarePrefs(
  stations: Station[],
  prefs: UserPreferences
): Station[] {
  return stations.filter((s) => matchesEvHardwareFilters(s, prefs));
}

/** Google Places nearby search is capped at 50 km radius. */
export function effectiveSearchRadiusKm(maxDistanceKm: number | undefined): number {
  const fallback = 30;
  if (maxDistanceKm == null || !Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) {
    return Math.min(fallback, 50);
  }
  return Math.min(maxDistanceKm, 50);
}

/** OCM API `distance` parameter — allow up to 100 km for sparse areas. */
export function effectiveEVSearchRadiusKm(maxDistanceKm: number | undefined): number {
  if (maxDistanceKm == null || !Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) {
    return 50;
  }
  return Math.min(maxDistanceKm, 100);
}

/**
 * Hardcoded stations carry `fuelTypes`; Google Places defaults to `both` (typical Irish forecourt).
 * Filter "Both" = only forecourts selling petrol and diesel; Petrol/Diesel = includes `both` sites.
 */
export function matchesFuelTypeFilter(station: Station, fuelType: FuelTypeFilter): boolean {
  if (fuelType == null) return true;
  const offered = station.fuelTypes ?? "both";
  if (fuelType === "petrol") return offered === "petrol" || offered === "both";
  if (fuelType === "diesel") return offered === "diesel" || offered === "both";
  if (fuelType === "both") return offered === "both";
  return true;
}

/**
 * Pick which Google route alternative matches Filters / Settings “search preference”.
 */
export function selectRouteIndexForSearchPreference(
  routes: { distanceValue: number; durationValue: number }[],
  preference: UserPreferences["preference"]
): number {
  if (routes.length <= 1) return 0;
  let best = 0;
  for (let i = 1; i < routes.length; i++) {
    const pickFastest =
      preference === "fastest"
        ? routes[i].durationValue < routes[best].durationValue
        : routes[i].distanceValue < routes[best].distanceValue;
    if (pickFastest) best = i;
  }
  return best;
}
