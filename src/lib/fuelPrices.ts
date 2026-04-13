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

/** Irish pump boards often show cents per litre (e.g. 191.9); stored values are €/L. */
export const MIN_FUEL_PRICE_EUR_PER_L = 1.2;
export const MAX_FUEL_PRICE_EUR_PER_L = 3.0;

/**
 * Totems and pump screens usually show **cents per litre** as a number like `195.9` (not `1.959`).
 * Values **≥ this** are treated as c/L; smaller values are **€/L** (e.g. `1.919`, `2.55`).
 */
export const PUMP_CENTS_PER_LITRE_THRESHOLD = 10;

/**
 * Parse a user-entered fuel price: accepts €/L (e.g. 1.919) or c/L as on the station sign (e.g. 195.9).
 * Same digits as the big display: type **195.9** or **1.959** — both work.
 */
export function parseFuelPriceUserInput(
  raw: string
): { ok: true; eurPerL: number } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a price per litre." };
  }

  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      message:
        "Enter a valid number — as on the sign (e.g. 195.9) or in euros per litre (e.g. 1.959).",
    };
  }

  const eurPerL =
    n >= PUMP_CENTS_PER_LITRE_THRESHOLD ? n / 100 : n;

  if (eurPerL < MIN_FUEL_PRICE_EUR_PER_L || eurPerL > MAX_FUEL_PRICE_EUR_PER_L) {
    return {
      ok: false,
      message: `Price must be between €${MIN_FUEL_PRICE_EUR_PER_L.toFixed(2)} and €${MAX_FUEL_PRICE_EUR_PER_L.toFixed(2)}/L (about ${(MIN_FUEL_PRICE_EUR_PER_L * 100).toFixed(0)}–${(MAX_FUEL_PRICE_EUR_PER_L * 100).toFixed(0)} c/L).`,
    };
  }

  return { ok: true, eurPerL };
}

/** Display style common on Irish forecourts: one decimal of cents per litre (191.9). */
export function formatIrelandPumpCentsPerL(eurPerL: number): string {
  const cents = Math.round(eurPerL * 1000) / 10;
  return cents.toFixed(1);
}
