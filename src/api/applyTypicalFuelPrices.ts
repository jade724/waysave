import type { Station } from "../types/station";

/**
 * Mid-range Irish pump prices (€/L) used only when a station has no community data
 * after `enrichWithCommunityPrices`, so list cards are not blank.
 * Values sit within `MIN_FUEL_PRICE_EUR_PER_L` / `MAX_FUEL_PRICE_EUR_PER_L`.
 */
export const TYPICAL_RETAIL_PETROL_EUR_PER_L = 1.919;
export const TYPICAL_RETAIL_DIESEL_EUR_PER_L = 2.179;

/**
 * Fills missing petrol & diesel when both are still null (no DB match).
 * Does not override community-reported prices. Sets `typicalRetailFill` for honest UI copy.
 */
export function applyTypicalFuelPrices(stations: Station[]): Station[] {
  return stations.map((s) => {
    if (s.type !== "fuel") return s;

    const p = s.fuelPrices?.petrol ?? null;
    const d = s.fuelPrices?.diesel ?? null;
    if (p != null || d != null) return s;

    return {
      ...s,
      fuelPrices: {
        petrol: TYPICAL_RETAIL_PETROL_EUR_PER_L,
        diesel: TYPICAL_RETAIL_DIESEL_EUR_PER_L,
      },
      typicalRetailFill: true,
    };
  });
}
