import type { Station } from "../types/station";
import type { FuelTypeFilter } from "./preferences";

/**
 * Effective €/L for ranking and cards, given the user's fuel filter.
 * Petrol and diesel are tracked separately on forecourts.
 */
export function effectiveFuelPriceEurPerL(
  station: Station,
  fuelType: FuelTypeFilter
): number | null {
  if (station.type !== "fuel") return null;

  const fp = station.fuelPrices;
  const legacy = station.price_value;

  if (fp?.petrol != null && fp?.diesel != null) {
    if (fuelType === "petrol") return fp.petrol;
    if (fuelType === "diesel") return fp.diesel;
    return Math.min(fp.petrol, fp.diesel);
  }

  if (fp?.petrol != null) {
    if (fuelType === "diesel") return null;
    return fp.petrol;
  }

  if (fp?.diesel != null) {
    if (fuelType === "petrol") return null;
    return fp.diesel;
  }

  return legacy ?? null;
}

export type FuelGrade = "petrol" | "diesel";
